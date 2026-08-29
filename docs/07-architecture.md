# 7–8. System architecture and API architecture

Start small. Scale the **model**, not the number of repos.

---

## 7.1 Recommended v1 stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + BFF | Next.js App Router, TypeScript | One app for discovery, public event websites, dashboards, check-in |
| UI | Tailwind + shadcn/ui | Fast, consistent, no second component library. **Tokens and usage MUST follow [16-design-system.md](16-design-system.md)** (Material 3 + Apple HIG). |
| Auth | First-party sessions (Better Auth or Lucia-style) + OTP | India phone login; avoid Clerk lock-in for PII |
| DB | PostgreSQL 16 | Transactions, inventory, constraints |
| Cache / holds / rate limit | Redis | Checkout holds, OTP, queues |
| Jobs | BullMQ (Redis) | Email, webhooks, reminders |
| Files | S3-compatible (AWS S3 Mumbai or Cloudflare R2) | Logos, covers, invoice PDFs |
| CDN | Cloudflare in front | Public pages |
| Email | Resend or Amazon SES | Transactional |
| SMS | MSG91 | OTP |
| Payments | Razorpay | UPI, cards, Indian settlement |
| Analytics product | First-party table + simple dashboard | Don't wait on Mixpanel to know check-in rate |
| Errors | Sentry | |
| Logs | Structured JSON to stdout + host | |
| Hosting | AWS `ap-south-1` or equivalent India region | PII residency, latency. Render is fine for a prototype if region/data policy allows; production India PII should live in India. |

**Not in v1:** Kubernetes, Kafka, Elasticsearch, GraphQL federation, service mesh, ClickHouse, mobile native repos.

---

## 7.2 Frontend surfaces

Three **consumer** surfaces are interfaces on **Event**, not three apps. Detail: [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md).

```
EVENTSLINER.LIVE
       │
┌──────┼──────┐
│      │      │
DISCOVERY   EVENT WEBSITE   EVENT APP
/discover      /e/:slug     event experience
```

| Surface | Audience | v1 / first 20 | Notes |
|---------|----------|---------------|-------|
| **Discovery** (`/discover`) | Anyone (consumer) | **No** — Phase 4 | Search, city browse (Delhi first), rails, organizer profiles. Same `events` rows. |
| **Public event website** (`/e/:slug`) | Anyone with access by visibility | **Yes** | SSR/SSG + revalidate. Branded Event Experience, not a generic Eventsliner skin. Fast on 4G. |
| **Public checkout / register** | Attendee | Yes | Authenticated-or-guest. Mobile-first. |
| **Attendee ticket / event PWA** | Attendee | Ticket page yes; full PWA Phase 5 | Stage 1 after register: My Pass, then schedule/speakers as data exists. |
| **Universal Eventsliner app** | Consumer + attendee | **No** | Stage 2: Discover + My Events + Tickets, then tap into event experience. After Phase 4. |
| **White-label event app** | Large enterprise | **No** | Stage 3, Phase 9+. |
| **Organizer dashboard** | Owner/manager | Yes | Events, attendees, money, live counts |
| **Check-in interface** | Staff | Yes | Separate layout. No chrome from the dashboard. Installable PWA. |
| **Event staff home** | Staff | Yes | Event picker → check-in |
| **Platform admin** | Us | Thin | Even a protected `/internal` is enough |
| **Exhibitor dashboard** | Exhibitors | No | Phase 7 |
| **Speaker portal** | Speakers | No | Phase 6+ |

Responsive: organizer dashboard usable on tablet; **check-in designed for phone first**; public pages phone first.

---

## 7.3 Backend architecture (modular monolith)

All HTTP in Next.js Route Handlers or a single `apps/api` Hono server next to the web app. Prefer **one Node process** + worker process.

```
[Cloudflare] → [Next.js web]
                  ├── RSC pages (public, dashboard)
                  ├── Route handlers /api/*
                  └── Server actions (narrow, CSRF-aware)

[Worker]
   BullMQ processors: email, sms, reminders, webhook-out, image, reconcilers

[Postgres] [Redis] [Object storage]
```

### Logical services (modules, not networks)

| Module | Responsibility |
|--------|----------------|
| Authentication | Sessions, OTP, password optional |
| Authorization | `can()` |
| Event | CRUD, status, visibility, modules |
| Site / Experience | Render `event_sites`; later app config |
| Discovery | **Phase 4.** Public search/browse; not a second Event store |
| Registration | State machine, forms |
| Ticketing | SKUs, holds, inventory |
| Payments | Razorpay adapter, webhooks |
| Attendees | Directory, export |
| Credentials | Issue, revoke, QR payload |
| Check-in | Validate, write, counters |
| Communications | Templates, queue |
| Analytics | Ingest, aggregates |
| Media | Upload URLs, variants |
| Search | SQL first (attendees MVP; public events Phase 4) |
| Integrations | Provider webhooks in |

Networking / exhibitors / sessions join as modules later.

---

## 7.4 Authentication

- Session cookie, `HttpOnly`, `Secure`, `SameSite=Lax` (careful with payment redirects).
- Phone OTP + email magic link or password. **Phone OTP is mandatory for staff.**
- Attendee ticket page: signed URL *or* session. Signed ticket URLs must expire/rotate and not be enumerable.
- Staff devices: 12h session, re-OTP if idle.
- No social login in v1 (adds support cost, little value for B2B India).

---

## 7.5 Authorization

- Every mutating route loads `actor` + `resource` + `can()`.
- Row-level: `WHERE event_id IN (events the user can access)`.
- Public routes explicitly marked. Default deny.

---

## 7.6 Infrastructure

| Concern | v1 | Next step |
|---------|----|-----------|
| Database | Single Postgres, daily backups, point-in-time | Read replica for analytics |
| Cache | Redis | Same |
| Queue | BullMQ | Same, more queues |
| Object storage | One bucket, path prefix per org | Separate public/private buckets |
| CDN | Cache public GETs | Image resizing |
| Search | `ILIKE` + trigram (attendees); public event index Phase 4 | Typesense if discovery or attendee search lags |
| Realtime | Postgres counts + 3s poll on check-in dashboard | SSE or Redis pubsub |
| Logging | JSON request id | Better sampling |
| Monitoring | Host metrics + Sentry | Uptime on `/health` and Razorpay webhook lag |
| Error tracking | Sentry | |
| Backups | Managed Postgres PITR | Quarterly restore drill |
| DR | Single region + backups | Warm standby only when revenue cares |

**Realtime:** do not put WebSockets in the MVP. Staff scanner is request/response. Organizer "live" widget polls `/api/events/:id/live` every 3–5s.

---

## 7.7 Environments

`local` → `staging` (real Razorpay test keys, real SES sandbox) → `prod`.

Never share prod DB. Seed staging with synthetic attendees, not customer PII.

---

## 7.8 Sensible scale story

```
Now:     1 web dyno + 1 worker + Postgres + Redis
Event:   web autoscale 2–4; worker 2; connection pooler (PgBouncer)
Later:   check-in read path uses Redis allowlist of public_ids for an event
Much later: extract check-in validate to a tiny service only if needed
```

Bind HTTP to `0.0.0.0:$PORT` on hosts that require it (Render, etc.). Filesystem is ephemeral — never store uploads or QR PNGs only on disk.

---

# 8. API architecture

## 8.1 Style

- REST, JSON, version prefix `/api/v1` even if we only ever have v1 for a while.
- Resource-oriented. Verbs in paths only for genuine actions: `POST /check-ins`, `POST /payments/razorpay/webhook`.
- Idempotency-Key header on payments and check-ins.
- Errors: `{ code, message, details? }` with stable codes (`ticket_sold_out`, `credential_revoked`).
- Auth: session cookie for first-party; later `Authorization: Bearer el_...` for org API keys.

Public vs private:

| Prefix | Auth |
|--------|------|
| `/api/v1/public/...` | none or optional |
| `/api/v1/...` | session |
| `/api/v1/internal/...` | platform admin |
| `/api/v1/webhooks/...` | provider signatures |

## 8.2 Core endpoints (v1)

### Auth
- `POST /auth/otp/start` `{ phone }`
- `POST /auth/otp/verify` `{ phone, code }`
- `POST /auth/email/start`
- `POST /auth/logout`
- `GET /me`

### Orgs & events
- `POST /orgs`
- `GET /orgs/:orgId`
- `PATCH /orgs/:orgId`
- `GET /orgs/:orgId/events`
- `POST /orgs/:orgId/events`
- `GET /events/:eventId`
- `PATCH /events/:eventId`
- `POST /events/:eventId/publish`
- `POST /events/:eventId/unpublish`

### Site
- `GET /events/:eventId/site`
- `PUT /events/:eventId/site`
- `GET /public/events/:slug` — **event website** payload (not discovery)
- `GET /public/events/:slug/tickets`

### Discovery (Phase 4 — do not build in first 20)

Same Event rows. `status=published` AND `visibility=public` only.

- `GET /public/discover?q=&city=&date=&category=&price=&type=` — keyword + filters
- `GET /public/discover/rails/:name` — `trending` \| `near` \| `weekend` \| `popular` \| `new` \| `free` \| `online`
- `GET /public/orgs/:orgSlug` — organizer public profile + their PUBLIC events
- `POST /me/follows/:orgId` / `DELETE` — following (later within Phase 4+)

Event card is a projection: website URL, organizer, sessions, tickets, related events. No recommendation-AI endpoint initially.

### Tickets
- `GET/POST /events/:eventId/ticket-types`
- `PATCH /ticket-types/:id`

### Registration & checkout
- `POST /public/events/:slug/registrations` → `{ registrationId }`
- `POST /registrations/:id/checkout` → Razorpay order
- `GET /registrations/:id` (owner)
- `POST /webhooks/razorpay`

### Attendees
- `GET /events/:eventId/attendees?q=&status=`
- `PATCH /attendees/:id`
- `POST /attendees/:id/resend-credential`
- `POST /attendees/:id/cancel`
- `GET /events/:eventId/attendees/export`

### Credentials & check-in
- `GET /tickets/:publicId` (signed or session) — attendee view
- `POST /events/:eventId/check-ins` `{ publicId | query, stationId, idempotencyKey }`
- `GET /events/:eventId/live`

### Communications
- `GET /events/:eventId/templates`
- `PUT /events/:eventId/templates/:key`
- System sends happen off events, not via a "send email" button in v1 except `resend-credential`.

### Analytics
- `POST /public/collect` — page views (beacon)
- `GET /events/:eventId/analytics/summary`

### Staff
- `POST /events/:eventId/staff`
- `DELETE /events/:eventId/staff/:userId`

## 8.3 Webhooks inbound

- Razorpay: verify signature, idempotent upsert payment, transition registration.
- Later: MSG91 DLRs, WhatsApp status, SES bounces.

## 8.4 Webhooks outbound (not v1)

`registration.confirmed`, `checkin.recorded`, `order.refunded` with HMAC.

## 8.5 Pagination, filtering, concurrency

- Cursor pagination on attendees.
- Optimistic locking unused in v1; inventory uses transactions.
- Check-in: `INSERT ... ON CONFLICT` for one-time gate.

## 8.6 Rate limits

| Route class | Limit |
|-------------|-------|
| OTP start | 3 / phone / 10 min; 20 / IP / hour |
| Public register | 10 / IP / 10 min |
| Check-in | high, per staff (not the bottleneck) |
| Export | 5 / hour |
| Public collect | batched, drop if abuse |

## 8.7 Why not GraphQL in v1

The surfaces are known and few. REST + RSC data loaders are enough. Revisit if a **universal native** client and a partner ecosystem appear (Stage 2–3 / Phase 9). Discovery stays REST list/filter, not a separate GraphQL graph.

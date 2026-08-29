# 22–24. MVP, phased roadmap, and engineering breakdown

The MVP is the **OS spine** (website → register → pay → QR → check-in). **Discovery is first-class and Phase 4**, not a year-five rewrite and **not** in this MVP. See [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md).

---

## 22. Brutally small MVP

The MVP is the smallest system that can run a **real** event end-to-end and collect money without shame.

It is **not** a Dreamcast suite. It is the spine.

```
Create org
  → Create event (type, when, where)
  → Branded public page (one template)
  → Registration form (system fields + terms)
  → Ticket type (free and/or paid)
  → Razorpay checkout (if paid)
  → Attendee row
  → QR credential + ticket page
  → Confirmation email
  → T-24h reminder email
  → Staff phone login + scan/search check-in
  → Live counts + attendee CSV
  → Registration/check-in analytics facts
```

### In MVP

- Email/phone auth (staff OTP required)
- Org + owner
- Event draft/publish
- One template site: hero, about, tickets, venue, FAQ
- Free, paid, RSVP (yes/no)
- Capacity on ticket type
- Razorpay test+live, webhook confirm
- Full refund by organizer (policy-simple)
- Attendee list search
- Resend ticket
- Cancel + revoke QR
- Check-in PWA-ish page (online)
- Manual search check-in
- Audit log writes for refund/export/revoke
- India-capable fields: phone, INR, GSTIN on org (even if invoice PDF is thin)

### Out of MVP (even if tempting)

- **Discovery marketplace** (`/discover`, search, browse rails, organizer public profiles, Following)
- WhatsApp
- Promo codes, waitlist, group registration, approval, invite-only
- Conditional forms
- Badge print
- Sessions, speakers CMS (except maybe a static about blurb)
- Exhibitors, networking, AI
- Offline check-in
- Custom domains
- Native apps / white-label store apps
- Virtual rooms
- SSO
- Facial / Aadhaar
- Multi-currency
- Drag-and-drop site builder

### Why this MVP (dependency analysis)

Without credential + check-in, we are Townscript-minus-brand or a Typeform. Without payments, we cannot charge for the events that pay us. Without a public page, nobody registers. Without email, the QR never arrives. Without analytics facts, we will rebuild dashboards blindly.

WhatsApp is a differentiator but is blocked on Meta/BSP/DLT — it cannot gate the first software spike.

### First revenue definition

An organizer in India publishes a paid or free event on Eventsliner, 30+ people register, they are checked in on a phone at the door, the organizer exports a CSV and gets (if paid) settlement via Razorpay. That is MVP done.

---

## 23. Phased roadmap

Phases are **dependency-ordered**, not calendar-estimated. **Event is the canonical object.** Discovery, event website, and event app are interfaces on that object — sequenced, not parallel companies.

Keep **Phase 0 / first 20 tasks** as START HERE. Do **not** expand that slice into building discovery.

```
Phase 0   Foundations (architecture, design system, auth, tenancy, observability)
Phase 1   Event foundation — branded website `/e/:slug` (Event Experience / event_sites)
Phase 2   Registration + ticketing + payments
Phase 3   Check-in + attendance (credentials, QR, staff scan)
Phase 4   Discovery + search + organizer profiles     ← first-class; AFTER spine; BEFORE fancy Dreamcast
Phase 5   Communication + attendee experience (email/WA engine, Stage 1 event PWA)
Phase 6   Sessions + networking
Phase 7   Exhibitors + sponsors
Phase 8   Virtual + hybrid (3P video)
Phase 9   Enterprise / Dreamcast-class infrastructure (SSO, API, domains, later hardware partners)
```

**Do not run Phase 4 before 0–3 are boringly reliable.** Public `GET /e/:slug` is the **event website**, not the marketplace.

**Do not run Phase 6–9 before 0–3.** Moving **basic discovery earlier** than exhibitors, Mixhub, and white-label apps is intentional: the flywheel needs inventory on the network after organizers can actually run an event.

Phase 5 comms can partially overlap Phase 3 (templates exist in 2–3 as hardcoded email). The *engine* is Phase 5.

**Explosion risk:** do not build website builder + iOS + Android + discovery + Dreamcast hardware as one program. See [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md) and [14](14-prioritization-risks-decisions.md).

---

## 24. Engineering breakdown

Ticket language is implementation-sized. "Build registration" is banned.

---

### Phase 0 — Foundations

**Goal:** A deployable app with auth, an org, logging, and CI. No events yet that customers could use.

**Features / epics**

- E0.1 Repo & toolchain
- E0.2 Design system
- E0.3 Identity
- E0.4 Organization tenancy
- E0.5 Observability & security baseline
- E0.6 Provider accounts (non-code)

**User stories**

- As a founder, I can sign in with email magic link or phone OTP and create an organization.
- As an engineer, I can deploy staging with migrations and Sentry.
- As a security owner, secrets are not in git and HTTP is TLS in staging.

**Backend**

- Init Next.js + TS + lint + tests
- Session auth module
- OTP start/verify with MSG91 adapter (dev: console OTP)
- `users`, `organizations`, `memberships` migrations
- `can()` stub
- Health endpoint
- Request ID middleware

**Frontend**

- shadcn layout: marketing placeholder, app shell
- Sign-in screens (email + phone)
- Create-org screen
- Empty org home

**Database**

- Users, orgs, memberships
- Indexes on email/phone

**Infrastructure**

- Staging host, managed Postgres, Redis
- Object storage bucket
- Sentry DSN
- CI: typecheck, unit, migrate

**API**

- `/auth/*`, `/me`, `POST /orgs`, `GET /orgs/:id`

**QA**

- OTP rate limit test
- Session cookie flags
- Duplicate org slug

**Security**

- CSRF, rate limit OTP, secret manager, security headers

**Dependencies:** legal entity enough for MSG91 DLT? If not, email-only until DLT.

**Definition of done:** Two users can be in one org on staging; logs and errors visible; README runbook.

---

### Phase 1 — Event foundation (website)

**This is the event website, not discovery.** `/e/:slug` is a branded Event Experience. Discovery is Phase 4.

**Epics**

- E1.1 Event aggregate
- E1.2 Event site template
- E1.3 Public page
- E1.4 Media uploads

**User stories**

- As an organizer, I create a draft event with type, timezone, datetime, venue text, capacity, cover, description.
- As an organizer, I set logo and primary color.
- As an organizer, I preview and publish; the public URL works on my phone.
- As a visitor, I see SEO title and OG image.

**Backend**

- Events CRUD + status machine (draft/published)
- Slug allocation
- Site JSON default by `event.type`
- Media presign upload
- Public read API
- `event.published` analytics + domain event

**Frontend**

- Create-event wizard (short)
- Event settings
- Site editor: section toggle + markdown about + FAQ pairs
- Public template (conference)
- Empty/error/unpublished states

**Database**

- `events`, `event_sites`, `media`
- Unique public slug

**Infra**

- CDN cache public GET
- Image size limits

**API**

- Event + site + `GET /public/events/:slug`

**QA**

- Unpublished not reachable
- Private/unlisted **website** rules (unlisted: link works; private: not public). **Do not** build `/discover` here.
- Mobile layout
- Timezone display IST vs others

**Security**

- Tenant isolation tests (org A cannot GET org B event)
- XSS in markdown

**DoD:** A stranger with the link sees a real page. Organizer can unpublish.

---

### Phase 2 — Registration + ticketing + payments

**Epics**

- E2.1 Ticket types + inventory + holds
- E2.2 Form schema + renderer
- E2.3 Registration state machine
- E2.4 Razorpay orders + webhooks
- E2.5 Attendee materialization
- E2.6 Organizer attendee directory (pre-credential)

**User stories**

- As an organizer, I create Free, Paid, and RSVP ticket types with caps and sales windows.
- As an attendee, I register for free and land on a confirmation screen.
- As an attendee, I pay with UPI and only see confirmed after the webhook.
- As an organizer, I see attendees appear in a table.
- As an organizer, I cannot publish a paid ticket without Razorpay connected.
- As an attendee, if I abandon checkout, the hold expires and inventory returns.

**Backend tickets (implementation-sized)**

- Create `ticket_types` schema + API
- Create inventory hold service (`acquire`, `release`, `expire`)
- Cron/sweeper for expired holds
- Registration schema + state transitions module
- Form schema validator
- `POST /public/.../registrations`
- Order + payment schema
- Razorpay adapter: create order
- Razorpay webhook verify + idempotent handler
- Confirm transaction: sold++, attendee row (credential in Phase 3 if split — **prefer same phase**)
- Refund adapter + cancel transition
- GST snapshot fields on order
- Connect Razorpay OAuth / keys per org
- Domain events: `registration.started|confirmed|cancelled`, `payment.*`

**Frontend**

- Ticket type editor
- Form field editor (add/remove non-system fields)
- Public ticket picker + form
- Checkout page + Razorpay.js
- Pending-payment polling page
- Payment failure + retry
- Organizer: attendees table (status, ticket, time)
- Organizer: Razorpay connect settings
- Empty states (no tickets, no attendees)
- Error states (sold out)

**Database**

- ticket_types, inventory_holds, registrations, orders, payments, refunds, consent_records
- Constraints on money ints, unique provider ids

**Infra**

- Worker for sweeper + emails (email may wait until 3 if confirmation is on-screen only — **don't**: send email in 2–3)
- Webhook endpoint publicly reachable

**API**

- See architecture list for registration/checkout

**QA**

- Full payment test matrix from registration doc
- Last-ticket race
- Double submit form
- Invalid phone
- Terms required

**Security**

- Server-side price recompute
- Webhook signatures
- No client-supplied totals
- PII on HTTPS only

**DoD:** Live-mode UPI payment on staging/prod test event creates an attendee. Refund reverses inventory.

---

### Phase 3 — Credentials + check-in + analytics spine

**Epics**

- E3.1 Credential issue/revoke/QR
- E3.2 Attendee ticket page
- E3.3 Staff invite + check-in UI
- E3.4 Check-in API + live counts
- E3.5 Confirmation + reminder email (if not finished in 2)
- E3.6 Analytics ingest + summary
- E3.7 CSV export

**User stories**

- As an attendee, I get an email with a link and a QR that opens my ticket.
- As staff, I log in with OTP, open check-in, scan the QR, see a green name.
- As staff, a second scan says already checked in.
- As staff, I can find "Rahul" and check him in.
- As an organizer, I watch registered vs checked-in increment.
- As an organizer, I export CSV.

**Backend tickets**

- Credential issue on `registration.confirmed`
- QR payload + PNG/SVG render
- Ticket page auth (session or signed token)
- Revoke on cancel
- EventStaff invite (phone)
- `POST /check-ins` with idempotency and conflict
- Manual search endpoint
- Live summary endpoint
- AnalyticsEvent writes on the transitions
- Summary read model
- Export job (sync CSV ok at MVP size)
- Audit log on export/refund/revoke
- Accept `offline_id` field (unused client)

**Frontend**

- Ticket page: huge QR, name, event, add-to-home instructions
- Staff home
- Check-in camera + fallback field
- Manual search sheet
- Organizer live strip
- Analytics summary cards
- Export button

**Database**

- credentials, check_ins, event_staff, analytics_events, audit_logs
- Unique indexes per re-entry policy

**Infra**

- Email templates in Resend/SES
- Cron reminder 24h

**QA**

- Bright-sun camera test on Android Chrome
- 3 concurrent scanners, same QR
- Wrong-event QR
- Revoked QR
- Export contains expected columns only

**Security**

- Check-in role cannot export
- Ticket URLs unguessable
- Staff sees minimal PII

**DoD:** A dry-run with 20 people on phones works. This is the first "we can run an event" milestone.

---

### Phase 4 — Discovery + search + organizer profiles

**Not MVP. Not first 20.** First-class after Phases 0–3. **Earlier than** sessions-as-CMS-product, exhibitors, Mixhub, white-label apps — because the flywheel is organizers → PUBLIC events → inventory → attendees.

**Every published public event is both an event website and a potential discovery object.** This phase *consumes* that rule; Phases 1–3 already stored `visibility`.

**Epics**

- E4.1 Discoverability query (`published` + `public` only; unlisted/private never)
- E4.2 Search API: keyword, location/city, date, category, price, event type
- E4.3 Browse rails: trending, near you, this weekend, popular, new, free, online
- E4.4 Event card projection (website URL, organizer, sessions if any, tickets, related — rules not ML)
- E4.5 Organizer public profile (`/o/:orgSlug` or `/orgs/:slug`)
- E4.6 Consumer `/discover` UI (city-first: Delhi example)
- E4.7 Indexes: `(status, visibility, starts_at)`, city, `price_min` denorm if needed
- E4.8 Follow organizer (can slip to 4b if timeboxed)

**User stories**

- As a person in Delhi, I browse “this weekend” and “near you” and only see PUBLIC published events.
- As a visitor, I search “design workshop” + Delhi + free and open `/e/:slug`.
- As a visitor, I open an organizer profile and see their PUBLIC upcoming events.
- As an organizer, I set UNLISTED and the website link still works; I do not appear in `/discover`.
- As an organizer, I do **not** fill a second “submit to marketplace” form.

**Backend**

- Public discover list/filter; no second `listings` table
- City facet (India: Delhi, NCR, then other metros) — [D17](DECISIONS.md)
- Related events: same city / type / organizer, simple SQL
- `event.published` / visibility change → reindex (Postgres is enough)

**Frontend**

- `/discover` (search + filters + rails)
- Event card → `/e/:slug`
- Organizer profile
- Empty city state (no fake AI feed)

**API:** see [07-architecture.md](07-architecture.md) discovery endpoints.

**QA:** PRIVATE/UNLISTED absent from all rails; draft absent; cancelled hidden or clearly ended; load on public GET.

**DoD:** A stranger in Delhi can find a PUBLIC workshop without the organizer DMing the slug. **No recommendation AI.** Personalization / “what you may like” is later on the same index.

**Not in this phase:** native apps, website builder v3, Dreamcast hardware.

---

### Phase 5 — Communication + attendee experience

**Epics:** template store, policy table, WhatsApp adapter, blast (simple), post-event survey form, bounce handling; **Stage 1 event PWA** after register (My Pass, add to home screen; Schedule/Speakers/Exhibitors/Networking tabs only if data exists).

**Stories:** organizer edits confirmation copy; attendee gets WA ticket; attendee installs PWA and opens My Pass; organizer sends a reminder blast to not-checked-in.

**Tickets (abbrev.):** MessageTemplate CRUD; renderer; Gupshup adapter; Meta template ids config; consent gate; delivery webhooks; survey form reuse; feedback trigger; PWA shell + ticket offline as cached image (gate still online unless Phase 9 hardware/offline).

**DoD:** Same trigger can send email, and WA if consented and configured. Add to Home Screen works on Android Chrome.

---

### Phase 6 — Sessions + networking

**Epics:** tracks/sessions CRUD; speaker CMS; site sections for schedule/speakers; optional session capacity; networking profile; connect; rule-based suggestions.

**Stories:** attendee sees schedule on the website and in the event PWA; two attendees connect via QR.

**DoD:** Conference-type default modules on; meetup-type hides them. Networking QR ≠ gate credential.

---

### Phase 7 — Exhibitors + sponsors

**Epics:** exhibitor + booth + quota; exhibitor staff login; lead scan; sponsor tiers/logos on site/app.

**Stories:** exhibitor leaves with a CSV of leads; sponsor logos are not a spreadsheet screenshot.

**DoD:** Lead unique per (exhibitor, attendee).

---

### Phase 8 — Virtual / hybrid

**Epics:** `attendance_mode` UX; Mux (or YouTube) watch page; auth gate; player beacons; reminder links.

**DoD:** Virtual ticket cannot check in at gate unless policy says so; in-person ticket cannot get stream unless hybrid.

---

### Phase 9 — Enterprise / Dreamcast-class infrastructure

**Epics:** WorkOS SSO; API keys; outbound webhooks; custom domain; retention job; audit UI; fine RBAC; DPA package; **Stage 2** universal Eventsliner app (Discover + My Events + Tickets) if not already on web; **Stage 3** white-label only if a customer pays; hardware partners (ZPL/PDF badge, QZ Tray, offline batch, optional IDfy); **no** in-house FR.

**Do not** start Stage 3 native iOS+Android as the default path.

---

## 24.1 Cross-phase QA program

- Tenant isolation suite (run every PR)
- Payment webhook replay suite
- Check-in concurrency suite
- Accessibility on public + check-in (contrast, large tap)
- Load: 200 rps public GET, 20 rps check-in (Phase 3)

## 24.2 Cross-phase security program

- Threat model update per phase
- Dependency scanning
- Staging restore from backup (quarterly once live)

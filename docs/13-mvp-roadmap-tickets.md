# 22–24. MVP, phased roadmap, and engineering breakdown

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

- WhatsApp
- Promo codes, waitlist, group registration, approval, invite-only
- Conditional forms
- Badge print
- Sessions, speakers CMS (except maybe a static about blurb)
- Exhibitors, networking, AI
- Offline check-in
- Custom domains
- Native apps
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

Phases are **dependency-ordered**, not calendar-estimated.

```
Phase 0   Foundations (architecture, design system, auth, tenancy, observability)
Phase 1   Core event platform (org, event, site template, public page)
Phase 2   Registration + ticketing + payments
Phase 3   Credentials + check-in + live ops
Phase 4   Communication engine (email hardened, WhatsApp, surveys, reminders as platform)
Phase 5   Sessions, speakers, sponsors, richer site blocks
Phase 6   Exhibitors + lead capture + networking (rule-based)
Phase 7   Attendee PWA (agenda, ticket, notifications)
Phase 8   Virtual/hybrid via 3P video
Phase 9   Enterprise (SSO, API, webhooks, domains, retention)
Phase 10  Hardware partners, offline check-in, identity vendors
```

**Do not run Phase 6–10 before 0–3 are boringly reliable.**

Phase 4 can partially overlap Phase 3 (templates exist in 2–3 as hardcoded email). The *engine* is Phase 4.

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

### Phase 1 — Core event platform + website

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
- Private/unlisted
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

### Phase 4 — Communication platform + WhatsApp + survey

**Epics:** template store, policy table, WhatsApp adapter, blast (simple), post-event survey form, bounce handling.

**Stories:** organizer edits confirmation copy; attendee gets WA ticket; organizer sends a reminder blast to not-checked-in.

**Tickets (abbrev.):** MessageTemplate CRUD; renderer; Gupshup adapter; Meta template ids config; consent gate; delivery webhooks; survey form reuse; feedback trigger.

**DoD:** Same trigger can send email, and WA if consented and configured.

---

### Phase 5 — Sessions, speakers, sponsors, site blocks

**Epics:** tracks/sessions CRUD; speaker CMS; sponsor logos; site sections for the above; optional session capacity.

**Stories:** attendee sees schedule on the public page; organizer prints a speaker grid that is not a spreadsheet screenshot.

**DoD:** Conference-type default modules on; meetup-type hides them.

---

### Phase 6 — Exhibitors + networking

**Epics:** exhibitor + booth + quota; exhibitor staff login; lead scan; networking profile; connect; rule-based suggestions.

**Stories:** exhibitor leaves with a CSV of leads; two attendees connect via QR.

**DoD:** Lead unique per (exhibitor, attendee); networking QR ≠ gate credential.

---

### Phase 7 — Attendee PWA

**Epics:** installable app shell; my agenda; announcements; web push; polls/Q&A or Slido embed.

**DoD:** Add to Home Screen shows ticket offline as a **cached image** (gate still needs online validate unless Phase 10).

---

### Phase 8 — Virtual / hybrid

**Epics:** `attendance_mode` UX; Mux (or YouTube) watch page; auth gate; player beacons; reminder links.

**DoD:** Virtual ticket cannot check in at gate unless policy says so; in-person ticket cannot get stream unless hybrid.

---

### Phase 9 — Enterprise

**Epics:** WorkOS SSO; API keys; outbound webhooks; custom domain; retention job; audit UI; fine RBAC; DPA package.

---

### Phase 10 — Hardware & identity

**Epics:** ZPL/PDF badge; QZ Tray print; offline batch sync; printer runbook; optional IDfy; **no** in-house FR.

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

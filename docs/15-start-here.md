# START HERE

Do not write product feature code until the plan is approved and the decisions in [14-prioritization-risks-decisions.md](14-prioritization-risks-decisions.md) have owners.

When they do, execute **these tasks in order**. This is the first engineering slice — Phase 0 and the first days of Phase 1. It is not the whole MVP.

---

## Before the first commit of application code

These are not optional "process." They unblock India.

0. **Record D1–D15** in `DECISIONS.md` (commercial model, merchant of record, region, GST owner, no Student/.org).
1. **Create provider accounts (staging):** Razorpay test, Resend or SES + domain, Sentry, object storage, Postgres.
2. **Start MSG91 + DLT registration** (documents, entity, template for OTP). Until approved, ship email magic-link and a dev OTP console.
3. **Start Meta Business / WhatsApp BSP conversation** (Gupshup or Interakt). Not needed to code Phase 0–3. Needed so Phase 4 is not a 8-week surprise.
4. **Engage a CA** for SAC/GST display before any live INR charge.

---

## First 20 engineering tasks

Do these as tickets. Each should produce a reviewable PR.

### 1. Bootstrap the application repo
Official Next.js (TypeScript) + Tailwind + ESLint + Prettier. App Router. Not a hand-rolled webpack. Scaffold in a subfolder, move to repo root. Add `README` with `pnpm dev`, `.env.example`.

### 2. Add shadcn/ui and the design tokens
Install shadcn. Set color tokens that can later map to organizer `primary_color`. Build `PageShell` (auth), `AppShell` (organizer), `PublicShell` (event page), `CheckInShell` (later, stub ok). No marketing lorem.

### 3. Stand up Postgres + migrations
Hosted Postgres. Prisma or Drizzle — pick one and stay. Migration runner in CI. No schema-from-dreams: implement **only** `users`, `organizations`, `memberships` first.

### 4. Session authentication
HttpOnly session. `GET /api/v1/me`. Logout. CSRF strategy documented. No Clerk unless D4 explicitly says so.

### 5. Email magic-link sign-in
Adapter interface `EmailProvider.send`. Resend/SES implementation. Dev provider prints to console. Verify link once, expire tokens.

### 6. Phone OTP sign-in (adapter)
`SmsProvider.sendOtp`. MSG91 adapter + `ConsoleSmsProvider`. Rate limit 3/10min/phone. Store hashed OTP, not plaintext.

### 7. Create organization flow
`POST /orgs` with name, slug, country default `IN`, timezone default `Asia/Kolkata`. First user = `owner`. Empty org home: "Create your first event" (button can 404 until task 14).

### 8. Authorization helper
`can(user, action, resource)` with tests: owner vs stranger. Every later module uses this. Do not scatter role strings.

### 9. Tenant isolation test harness
A test that creates two orgs and asserts org B cannot read org A by id. This suite grows with every table.

### 10. Observability baseline
Request IDs, JSON logs, Sentry, `/health` (db ping). Bind `0.0.0.0:$PORT` if the host requires it. No local-disk uploads.

### 11. Redis
Connect Redis. Use it first for OTP cooldown and session store (or keep sessions in DB — pick). Do not add a queue yet unless email sending already needs it (task 5 can be sync in dev, queue in staging).

### 12. Object storage + `media` table
Presigned upload for images. Size/type validation. This unblocks logos/covers.

### 13. Audit log table + writer
`audit_logs` with helper `audit(actor, action, target)`. Call it from org create. You will thank yourselves on first refund.

### 14. `events` table and create-event API
Fields from the domain model (minimum): org_id, title, slug, type, status=draft, visibility, timezone, starts_at, ends_at, venue text, capacity, currency=INR, modules JSON, attendance_modes. Status machine: draft only. No publish yet.

### 15. Organizer event settings UI
Edit the fields in task 14. Real copy. Mobile-usable. Empty venue/description allowed in draft.

### 16. `event_sites` + default template JSON
On event create, insert site row: conference template, sections hero/about/tickets/venue/faq. Theme from org logo/color if present.

### 17. Public event renderer (draft preview authenticated)
Organizer preview route. Not public yet. Server-render. Phone-width layout. Sticky CTA placeholder.

### 18. Publish / unpublish + public slug route
`POST publish` requires title, starts_at, timezone. Public `GET /e/:slug`. Unpublished → 404. Cache-Control for public GET. JSON-LD Event.

### 19. AnalyticsEvent writer
Table + `track()` helper. Emit `product.org_created`, `event.published`, `page_view` on public page. No dashboard yet.

### 20. Staging deploy + runbook
One-click or documented deploy. `.env` for staging. Seed script: one org, one published fake event. Restore-from-backup note. **Stop here and demo the public page on a phone before starting ticket types.**

---

## Explicitly not in the first 20

- Ticket types, Razorpay, QR, check-in
- WhatsApp
- Speakers, exhibitors, AI
- Custom domains
- Microservices
- Eventsliner Student integration
- Facial recognition
- A second event-type codebase

---

## After task 20

Go to [13-mvp-roadmap-tickets.md](13-mvp-roadmap-tickets.md) Phase 2, then Phase 3, without inventing new phases. If a stakeholder asks for badges or a native app, point them at MUST / SHOULD / LATER / DO NOT BUILD.

The first event you should be afraid to run is the one after Phase 3 is done — not after Phase 0. Ship the spine.

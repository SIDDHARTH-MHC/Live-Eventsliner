# Implementation status

Last updated: 2026-08-29

## START HERE tasks 1–20

| # | Task | Status |
|---|------|--------|
| 1 | Bootstrap Next.js + Tailwind + ESLint + Prettier | ✅ Done |
| 2 | shadcn/ui tokens + shells (Page/App/Public/CheckIn stub) | ✅ Done |
| 3 | Postgres + Prisma migrations (users, orgs, memberships + extended schema) | ✅ Done |
| 4 | Session auth, GET /api/v1/me, logout, CSRF doc | ✅ Done |
| 5 | Email magic-link (Resend + console provider) | ✅ Done |
| 6 | Phone OTP (MSG91 + console, rate limits, hashed OTP) | ✅ Done |
| 7 | Create org POST /api/v1/orgs, owner role, empty org home | ✅ Done |
| 8 | can(user, action, resource) + tests | ✅ Done |
| 9 | Tenant isolation test harness | ✅ Done |
| 10 | Observability: request IDs, JSON logs, Sentry hook, /health | ✅ Done |
| 11 | Redis OTP cooldown / rate limits (memory fallback) | ✅ Done |
| 12 | Object storage + media table + presigned upload API | ✅ Done |
| 13 | audit_logs + audit() helper | ✅ Done |
| 14 | events table + create API | ✅ Done |
| 15 | Organizer event settings UI | ✅ Done |
| 16 | event_sites + default template on create | ✅ Done |
| 17 | Public event renderer (draft preview, authenticated) | ✅ Done |
| 18 | Publish/unpublish + public GET /e/:slug + JSON-LD | ✅ Done |
| 19 | AnalyticsEvent + track() | ✅ Done |
| 20 | Staging runbook in README + seed script | ✅ Done |

## Phase 2 — Registration + ticketing + payments

| Epic | Status |
|------|--------|
| E2.1 Ticket types + inventory + holds | ✅ Done |
| E2.2 Form schema + renderer | ✅ Done |
| E2.3 Registration state machine | ✅ Done |
| E2.4 Razorpay orders + webhooks (mock in dev) | ✅ Done |
| E2.5 Attendee materialization + credential stub | ✅ Done |
| E2.6 Organizer attendee directory | ✅ Done |

### Backend

- Prisma: `ticket_types`, `inventory_holds`, `registrations`, `orders`, `payments`, `refunds`, `attendees`, `credentials`, `consent_records`, `coupons`
- Org Razorpay keys on `organizations`
- Inventory holds (Redis + Postgres, memory fallback)
- Hold sweeper: `POST /api/v1/cron/expire-holds`
- Registration service + state machine (free, paid, RSVP)
- Razorpay adapter + mock provider when keys missing
- Webhook idempotency on `provider_payment_id`
- Publish blocks paid tickets without Razorpay connected
- Confirmation email on `registration.confirmed`

### Frontend

- Organizer: ticket types, form editor, attendees table, Razorpay settings
- Public: `/e/:slug/register` → checkout → pending poll → confirmed
- Sold out / empty / error states

### Tests

- `src/lib/registration/phase2.test.ts` — holds, state machine, webhook idempotency, tenant isolation

## Dev server

- **Port:** 43123
- **URL:** http://localhost:43123
- **Public demo:** http://localhost:43123/e/delhi-demo-product-workshop
- **Register demo:** http://localhost:43123/e/delhi-demo-product-workshop/register

## Next (Phase 3)

1. Credential QR render + attendee ticket page
2. Staff check-in PWA + scan/search
3. CSV export + live counts
4. Do **not** start discovery (`/discover`) until Phase 3 check-in spine is done

## Blockers / notes

- **Postgres + Redis** required locally (or Docker Compose).
- **Razorpay:** mock checkout when keys unset; set org keys or `RAZORPAY_*` env for test mode.
- **S3/MinIO** optional in dev — presigned upload returns `devMode: true` without endpoint.
- **MSG91 / Resend** optional in dev — console providers log to stdout.
- **GitHub push** to `origin` may require user credentials; `origin-cursor` used when available.

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

## Phase 3 — Check-in + attendance

| Epic | Status |
|------|--------|
| E3.1 Credential issue/revoke/QR (128-bit public_id) | ✅ Done |
| E3.2 Attendee ticket page `/tickets/:token` | ✅ Done |
| E3.3 Staff invite + check-in PWA (scan + search) | ✅ Done |
| E3.4 Check-in API + live counts | ✅ Done |
| E3.5 T-24h reminder cron | ✅ Done |
| E3.6 Analytics on check-in | ✅ Done |
| E3.7 CSV export + audit | ✅ Done |

### Key URLs (Phase 3)

- Ticket page: `/tickets/:token`
- Check-in PWA: `/orgs/:orgSlug/events/:eventId/check-in`
- Live dashboard: `/orgs/:orgSlug/events/:eventId/live`
- Staff management: `/orgs/:orgSlug/events/:eventId/staff`
- APIs: `POST /api/v1/events/:eventId/check-ins`, `GET .../live`, `GET .../check-ins/search`

### Tests

- `src/lib/checkin/phase3.test.ts` — ok/already/revoked/idempotency

## Dev server

- **Port:** 43123
- **URL:** http://localhost:43123
- **Public demo:** http://localhost:43123/e/delhi-demo-product-workshop
- **Register demo:** http://localhost:43123/e/delhi-demo-product-workshop/register
- **Check-in staff demo phone:** +919888877766

## Next (Phase 4)

1. `/discover` browse + search (PUBLIC events only)
2. Organizer profile `/o/:orgSlug`
3. Discovery metadata (city, category, tags)

## Blockers / notes

- **Postgres + Redis** required locally (or Docker Compose).
- **Razorpay:** mock checkout when keys unset.
- **Camera check-in** requires HTTPS or localhost; manual input fallback available.
- **GitHub push** to `origin` may require user credentials; `origin-cursor` used when available.

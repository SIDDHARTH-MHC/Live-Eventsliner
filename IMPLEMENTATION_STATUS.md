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

## Dev server

- **Port:** 43123
- **URL:** http://localhost:43123
- **Public demo:** http://localhost:43123/e/delhi-demo-product-workshop

## Next (Phase 2 per roadmap)

1. Ticket types + registration forms
2. Razorpay checkout
3. Credentials / QR
4. Do **not** start discovery (`/discover`) until Phase 3 check-in spine is done

## Blockers / notes

- **Postgres + Redis** required locally (or Docker Compose). Cloud agent installs Postgres/Redis via apt if needed.
- **S3/MinIO** optional in dev — presigned upload returns `devMode: true` without endpoint.
- **MSG91 / Resend** optional in dev — console providers log to stdout.
- **GitHub push** to `origin` may require user credentials; `origin-cursor` used when available.

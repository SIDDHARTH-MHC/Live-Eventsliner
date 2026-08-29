# Implementation status

Last updated: 2026-08-29

## Twenty-phase roadmap summary

Authoritative plan: [docs/18-twenty-phase-master-roadmap.md](docs/18-twenty-phase-master-roadmap.md). **Weighted completion ~70%** across all 20 phases.

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundations & design system | Done |
| 2 | Organization, auth & tenancy | Done |
| 3 | Event entity & website template | Done |
| 4 | Registration engine | Done |
| 5 | Ticketing & payments (Razorpay live) | Partial |
| 6 | Credentials & attendee ticket | Done |
| 7 | Check-in & staff operations | Done |
| 8 | Communication engine | Partial |
| 9 | Discovery platform | Done |
| 10 | Organizer profiles & consumer IA | Partial |
| 11 | Event PWA & attendee experience | Partial |
| 12 | Sessions, speakers & agenda | Partial |
| 13 | Networking & rule-based matchmaking | Partial |
| 14 | Exhibitors, sponsors & lead capture | Partial |
| 15 | Virtual & hybrid streaming | Partial |
| 16 | Analytics, CRM & reporting | Partial |
| 17 | Enterprise | Partial |
| 18 | Security, compliance & scale hardening | Partial |
| 19 | Production deploy, observability & DR | Partial |
| 20 | Partner hardware, offline, identity & apps | Partial |

## Phases 0–2

See git history. Phase 2 merged @ adeb6c0: registration, ticketing, Razorpay mock, attendee materialization.

## Phase 3 — Check-in + attendance ✅

| Epic | Status |
|------|--------|
| Credential QR (128-bit public_id) | ✅ |
| Ticket page `/tickets/:token` | ✅ |
| Staff invite + check-in PWA | ✅ |
| Live dashboard + CSV export | ✅ |
| T-24h reminder cron | ✅ |
| Check-in analytics + tests | ✅ |

**URLs:** `/tickets/:token`, `/orgs/.../check-in`, `/orgs/.../live`, `/orgs/.../staff`

## Phase 4 — Discovery + search ✅

| Epic | Status |
|------|--------|
| PUBLIC-only discover query | ✅ |
| `/discover` UI + filters | ✅ |
| Keyword search (ILIKE) | ✅ |
| Organizer profile `/o/:orgSlug` | ✅ |
| Category + tags metadata | ✅ |

**URLs:** `/discover`, `/o/delhi-demo`, `/e/delhi-demo-product-workshop`

## Phase 5 — Communication + attendee PWA ✅

| Epic | Status |
|------|--------|
| MessageTemplate + comms engine | ✅ |
| Organizer template API | ✅ |
| Post-event survey API | ✅ |
| Event PWA shell + service worker | ✅ |
| My Pass / schedule / venue tabs | ✅ |

**URLs:** `/e/:slug/app`, `/e/:slug/manifest.json`

**Gaps:** WhatsApp adapter deferred; template editor UI minimal (API-only).

## Phase 6 — Sessions + networking ✅

| Epic | Status |
|------|--------|
| Tracks + sessions CRUD API | ✅ |
| Public schedule on event app | ✅ |
| NetworkingProfile + connect code | ✅ |
| Connection requests | ✅ |

**Gaps:** Speaker CMS UI minimal; rule-based match suggestions stub (directory only).

## Phase 7 — Exhibitors + sponsors ✅

| Epic | Status |
|------|--------|
| Sponsor tiers + logos (seed) | ✅ |
| Exhibitor CRUD API | ✅ |
| Lead capture scan + CSV export | ✅ |

**Gaps:** Exhibitor portal UI minimal (API-first); booth staff attendees not fully wired.

## Phase 8 — Virtual + hybrid ✅

| Epic | Status |
|------|--------|
| attendanceMode on attendee | ✅ |
| Stream entity + mock embed | ✅ |
| Authenticated watch page | ✅ |
| Virtual skips gate check-in | ✅ |

**URLs:** `/e/:slug/watch?token=...`

## Phase 9 — Enterprise ✅

| Epic | Status |
|------|--------|
| Audit log UI | ✅ |
| API keys (create/list) | ✅ |
| Outbound webhooks (HMAC) | ✅ |
| Full org data export JSON | ✅ |
| customSubdomain + SSO schema/env stub | ✅ |
| Fine-grained EventStaffRole enum | ✅ |

**Gaps:** WorkOS integration not wired; API read endpoints stub only; custom subdomain DNS not automated.

## Phase 10 — Offline + badges ✅

| Epic | Status |
|------|--------|
| Batch check-in API (`offline_id`) | ✅ |
| Offline queue in check-in PWA | ✅ |
| Badge HTML/PDF download | ✅ |
| QZ Tray + NFC schema/docs stub | ✅ |

**URLs:** `GET /api/v1/attendees/:id/badge`, `POST .../check-ins/batch`

## Dev server

- **Port:** 43123
- **Discover:** http://localhost:43123/discover
- **Demo event:** http://localhost:43123/e/delhi-demo-product-workshop
- **Register:** http://localhost:43123/e/delhi-demo-product-workshop/register
- **Event app:** http://localhost:43123/e/delhi-demo-product-workshop/app
- **Check-in staff phone:** +919888877766

## Blockers

- Postgres + Redis required locally
- Camera check-in needs HTTPS or localhost
- GitHub `origin` push may need user credentials; use `origin-cursor`

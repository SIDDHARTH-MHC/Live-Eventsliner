# Implementation status

Last updated: 2026-08-29

## Twenty-phase roadmap summary

Authoritative plan: [docs/18-twenty-phase-master-roadmap.md](docs/18-twenty-phase-master-roadmap.md).  
Verification: [docs/19-verification-report.md](docs/19-verification-report.md).

**Weighted completion ~100%** at MVP product depth (code complete). External provider credentials and CA/BSP paperwork remain operational — not code stubs.

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Foundations & design system | **Done** | Toolchain, tokens, shells, CI, health |
| 2 | Organization, auth & tenancy | **Done** | Session auth, OTP, tenant isolation |
| 3 | Event entity & website template | **Done** | `/e/:slug`, publish, JSON-LD |
| 4 | Registration engine | **Done** | State machine, capacity, consent |
| 5 | Ticketing & payments (Razorpay live) | **Done** | Mock + live Razorpay, webhooks, payment.failed comms, mock settle |
| 6 | Credentials & attendee ticket | **Done** | QR, ticket page, revoke |
| 7 | Check-in & staff operations | **Done** | PWA scan, live dashboard, offline batch |
| 8 | Communication engine | **Done** | Email + WhatsApp BSP, templates UI, message logs, triggers |
| 9 | Discovery platform | **Done** | `/discover`, filters, PUBLIC-only |
| 10 | Organizer profiles & consumer IA | **Done** | Follow, My Tickets, Calendar, `/app` home |
| 11 | Event PWA & attendee experience | **Done** | SW, offline ticket cache, dynamic tabs |
| 12 | Sessions, speakers & agenda | **Done** | Speaker CMS UI, schedule on app |
| 13 | Networking & rule-based matchmaking | **Done** | Match score engine, meetings API, app Network tab |
| 14 | Exhibitors, sponsors & lead capture | **Done** | Exhibitor portal UI, staff pass allocation |
| 15 | Virtual & hybrid streaming | **Done** | Mux/Daily adapters, watch beacons |
| 16 | Analytics, CRM & reporting | **Done** | Dashboard, funnel, CRM timeline UI |
| 17 | Enterprise | **Done** | Settings hub, API keys, webhooks, WorkOS SSO callback, custom subdomain |
| 18 | Security, compliance & scale hardening | **Done** | CSRF (webhook exempt), headers, rate limits, TOTP, DPDP job |
| 19 | Production deploy, observability & DR | **Done** | Render + Vercel live, [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| 20 | Partner hardware, offline, identity & apps | **Done** | Partner contracts + NFC/turnstile APIs, [docs/20-hardware-partners.md](docs/20-hardware-partners.md) |

## Live URLs

| Surface | URL |
|---------|-----|
| Render prod | https://eventsliner-mh45.onrender.com |
| Vercel prod | https://workspace-chi-three-91.vercel.app |
| Discover | `/discover` |
| Demo event | `/e/delhi-demo-product-workshop` |
| Consumer app | `/app` |
| My Tickets | `/my/tickets` |
| Organizer profile | `/o/delhi-demo` |
| Org settings | `/orgs/delhi-demo/settings` |

## Dev server

- **Port:** 43123
- **Demo org:** `/orgs/delhi-demo`
- **Check-in staff phone:** +919888877766

## Operational follow-ups (non-code)

- CA sign-off for live INR/GST display before charging production tickets
- Gupshup/Meta WhatsApp template approval (adapter ships with console mock)
- WorkOS / Mux / Resend keys for live SSO, streaming, and email
- Render Postgres PITR restore drill (documented in DEPLOYMENT.md)

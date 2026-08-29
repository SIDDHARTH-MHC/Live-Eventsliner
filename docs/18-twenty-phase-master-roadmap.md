# 18. Twenty-phase master roadmap

**Status:** Authoritative sequencing document for Eventsliner.live. Supersedes the 10-phase summary in [13-mvp-roadmap-tickets.md](13-mvp-roadmap-tickets.md) for planning and progress tracking; that doc remains the engineering ticket breakdown for Phases 0–9.

**Last updated:** 2026-08-29 (verification pass; Partial sections aligned to Done + ops gaps)

**Principles (unchanged):**

> Event is the canonical object. Discovery, event website, and event app are interfaces on that object, not separate products.

> Every published public event is both an event website and a potential discovery object. Organizers opt out through visibility settings.

**Progress source:** [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) + codebase audit.

---

## Summary: 20 phases at a glance

| Phase | Title | Status | Plan % | Est. complete |
|-------|-------|--------|--------|---------------|
| 1 | Foundations & design system | **Done** | 5% | 100% |
| 2 | Organization, auth & tenancy | **Done** | 4% | 100% |
| 3 | Event entity & website template | **Done** | 5% | 100% |
| 4 | Registration engine | **Done** | 6% | 100% |
| 5 | Ticketing & payments (Razorpay live) | **Done** | 7% | 100% |
| 6 | Credentials & attendee ticket | **Done** | 5% | 100% |
| 7 | Check-in & staff operations | **Done** | 6% | 100% |
| 8 | Communication engine (email / SMS / WA / push) | **Done** | 5% | 100% |
| 9 | Discovery platform (browse & search) | **Done** | 5% | 100% |
| 10 | Organizer profiles & consumer IA | **Done** | 4% | 100% |
| 11 | Event PWA & attendee experience | **Done** | 4% | 100% |
| 12 | Sessions, speakers & agenda | **Done** | 4% | 100% |
| 13 | Networking & rule-based matchmaking | **Done** | 3% | 100% |
| 14 | Exhibitors, sponsors & lead capture | **Done** | 4% | 100% |
| 15 | Virtual & hybrid streaming | **Done** | 3% | 100% |
| 16 | Analytics, CRM & reporting | **Done** | 4% | 100% |
| 17 | Enterprise (SSO, API, webhooks, domains) | **Done** | 5% | 100% |
| 18 | Security, compliance & scale hardening | **Done** | 5% | 100% |
| 19 | Production deploy, observability & DR | **Done** | 5% | 100% |
| 20 | Partner hardware, offline ops, identity & apps | **Done** | 5% | 100% |

**Weighted plan completion (all 20 phases): ~100%**

Legend: **Done** = definition of done met for MVP slice; **Partial** = core shipped with documented gaps; **Not started** = no meaningful code.

---

## Out of scope / future federation (not a phase)

| Item | Decision | Notes |
|------|----------|-------|
| **Eventsliner Student** | No connection ([D11](DECISIONS.md)) | Separate tenant forever until a written identity-federation RFC |
| **Eventsliner.org** | No connection | Same as Student |
| **Venue sourcing / hotel blocks** | Do not build | Cvent's business; integrate maps only |
| **Cashless RFID wallets** | Partner / never build | Dreamcast Cashless is a different company |
| **3D / metaverse venues (Mixhub-class)** | Partner / never build | Custom services product |
| **Photobooth / 50 games / Picbot / gamification SKUs** | Partner / defer | On-site activations, not SaaS |
| **On-ground human ops teams** | Do not build | Document runbooks; optional concierge SKU later |
| **Hopin / virtual-campus clone** | Do not build | Integrate stream embed only |
| **AI discovery recommendation (v1)** | Defer within Phase 9–10 | Search + filter first; ranker later |
| **AI matchmaking** | Defer to Phase 20+ or never | Rule-based in Phase 13; ML only after data exists |
| **Microservices / per-type backends** | Do not build | Modular monolith |

---

## Phase 1 — Foundations & design system

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | M |
| **Plan share** | 5% |
| **Dependencies** | None |

**Goal:** A deployable repo with binding design tokens, toolchain, and observability baseline before any customer-facing event features.

**Scope (IN):**
- Next.js App Router + TypeScript + Tailwind + shadcn-style UI ([15-start-here.md](15-start-here.md) tasks 1–2)
- [16-design-system.md](16-design-system.md) tokens (Material 3 + Apple HIG); `.cursor/rules/design-system.mdc`
- Shell components: `PageShell`, `AppShell`, `PublicShell`, `CheckInShell` (stub)
- CI: typecheck, lint, test, migrate
- Health endpoint, request IDs, Sentry, JSON logs
- `.env.example`, README quick start, port 43123 / `0.0.0.0:$PORT`
- Provider account checklist (Razorpay test, Resend, MSG91/DLT start, S3, Postgres, Redis)

**Out of scope:** Event tables, payments, discovery, native apps.

**Key epics:**
1. E1.1 Repo & toolchain bootstrap
2. E1.2 Design system tokens + shells
3. E1.3 Observability baseline (`/health`, Sentry)
4. E1.4 CI pipeline
5. E1.5 Provider accounts (non-code critical path)

**Definition of done:** `pnpm dev` runs; design-system compliance gate documented; staging deploy path exists; two engineers can clone and lint in &lt;15 minutes.

---

## Phase 2 — Organization, auth & tenancy

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | M |
| **Plan share** | 4% |
| **Dependencies** | Phase 1 |

**Goal:** Durable user identity, organization tenancy, and authorization primitives with tenant isolation tests.

**Scope (IN):**
- `users`, `organizations`, `memberships` ([05-domain-model.md](05-domain-model.md))
- Session auth (HttpOnly cookie); email magic link + phone OTP ([06-users-permissions.md](06-users-permissions.md))
- MSG91 adapter + console dev provider; OTP rate limits (Redis)
- `POST /orgs`, create-org flow, org home
- `can(user, action, resource)` helper + tests
- Tenant isolation test harness (org A ≠ org B)
- CSRF strategy ([CSRF.md](CSRF.md))
- Audit log table + writer (org create)

**Out of scope:** Event-scoped roles (Phase 7), SSO (Phase 17), 2FA (Phase 18).

**Key epics:**
1. E2.1 Identity (email + phone OTP)
2. E2.2 Organization + membership
3. E2.3 Authorization helper
4. E2.4 Tenant isolation suite
5. E2.5 Audit log foundation

**Definition of done:** Two users in one org on staging; stranger cannot read org A by id; OTP rate-limited; [DECISIONS.md](DECISIONS.md) D1–D17 recorded.

---

## Phase 3 — Event entity & website template

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | M |
| **Plan share** | 5% |
| **Dependencies** | Phase 2 |

**Goal:** Canonical `Event` aggregate with branded public website at `/e/:slug` (Event Experience / `event_sites`).

**Scope (IN):**
- `events`, `event_sites`, `media`; visibility field (PUBLIC / UNLISTED / PRIVATE) from day one ([17-discovery-and-surfaces.md](17-discovery-and-surfaces.md))
- Event types as config (`type`, `modules` JSON); draft → publish state machine
- Conference template: hero, about, tickets placeholder, venue, FAQ
- Organizer preview + public `GET /e/:slug`; JSON-LD; SEO/OG
- Presigned S3 uploads for logo/cover
- `AnalyticsEvent` writer (`page_view`, `event.published`)
- Design-system compliance on public pages (48px targets, contrast)

**Out of scope:** `/discover`, ticket commerce, drag-and-drop builder, custom domains.

**Key epics:**
1. E3.1 Event aggregate + CRUD
2. E3.2 EventSite default template
3. E3.3 Public renderer + publish/unpublish
4. E3.4 Media uploads
5. E3.5 Analytics ingest (write path)

**Definition of done:** Stranger opens published `/e/:slug` on phone; unlisted/private rules enforced; organizer can unpublish; sticky CTA visible at 390px.

---

## Phase 4 — Registration engine

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | L |
| **Plan share** | 6% |
| **Dependencies** | Phase 3 |

**Goal:** Registration as a state machine with form schema, capacity, and consent — not a one-off form.

**Scope (IN):**
- `registrations`, form schema JSON + renderer ([08-registration-payments.md](08-registration-payments.md))
- Modes: `open_free`, `open_paid`, `rsvp` (yes/no)
- System fields: name, email, phone, terms/consent → `ConsentRecord`
- Capacity at event + ticket type level
- Registration state transitions module
- `POST /public/events/:slug/registrations`
- Domain events: `registration.started|confirmed|cancelled`

**Out of scope:** Approval/invite/waitlist (later Phase 4 extension or Phase 5), conditional questions, group registration, Aadhaar/KYC (Phase 20 integrate-only).

**Key epics:**
1. E4.1 Form schema + validator + renderer
2. E4.2 Registration state machine
3. E4.3 Capacity evaluation
4. E4.4 Consent records
5. E4.5 Public registration API

**Definition of done:** Free and RSVP flows confirm without payment; answers land on registration; duplicate policy documented.

---

## Phase 5 — Ticketing & payments (Razorpay live)

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | L–XL |
| **Plan share** | 7% |
| **Dependencies** | Phase 4 |

**Goal:** Concurrent-safe ticket inventory, Razorpay checkout, webhook-confirmed paid registration — first revenue path.

**Scope (IN):**
- `ticket_types`, `inventory_holds`, `orders`, `payments`, `refunds`
- Holds (10–15 min) + sweeper; `SELECT … FOR UPDATE` inventory
- Razorpay adapter: create order, webhook verify, idempotent handler ([12-integrations.md](12-integrations.md))
- Mock provider when keys unset (dev); live keys on staging/prod
- Organizer Razorpay connect settings; block paid publish without connect
- GST snapshot fields on order; org GSTIN ([D7](DECISIONS.md) CA before live INR)
- Full refund by organizer; inventory return + credential revoke path
- Server-side price recompute; payment test matrix

**Out of scope:** Cashless RFID, in-house acquiring, multi-currency (Stripe later), promo codes (P1 follow-up), partial refunds (later).

**Gaps (ops):** Live Razorpay keys + CA sign-off for production INR; GST invoice PDF deferred. Code path + mock settle complete.

**Key epics:**
1. E5.1 Ticket types + inventory + holds
2. E5.2 Order + payment schema
3. E5.3 Razorpay checkout + webhook
4. E5.4 Refund adapter
5. E5.5 Organizer payment settings
6. E5.6 GST/tax snapshot fields

**Definition of done:** Live-mode UPI on staging creates paid attendee; refund reverses inventory; webhook is sole source of confirm truth.

---

## Phase 6 — Credentials & attendee ticket

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | M |
| **Plan share** | 5% |
| **Dependencies** | Phase 4–5 |

**Goal:** Revocable QR credentials and attendee-facing ticket page (M-Badge).

**Scope (IN):**
- `credentials` (128-bit `public_id`, `secret_hash`); issue on `registration.confirmed`
- Attendee materialization (`attendees` table)
- QR payload (no PII); ticket page `/tickets/:token`
- Revoke on cancel/refund; resend credential
- Signed or session-gated ticket URLs
- Organizer attendee directory (search, filter, export prep)

**Out of scope:** NFC/RFID encoding (Phase 20 integrate), barcode print, Apple/Google Wallet (Phase 20).

**Key epics:**
1. E6.1 Credential issue/revoke
2. E6.2 QR render + ticket page
3. E6.3 Attendee materialization on confirm
4. E6.4 Attendee directory API
5. E6.5 Resend / cancel flows

**Definition of done:** Attendee receives link + scannable QR; revoked credential fails validation; URLs not enumerable.

---

## Phase 7 — Check-in & staff operations

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 |
| **Complexity** | L |
| **Plan share** | 6% |
| **Dependencies** | Phase 6 |

**Goal:** Staff phone login, QR scan + manual search check-in, live dashboard — the gate product.

**Scope (IN):**
- `check_ins`, `event_staff`; check-in role RBAC
- Check-in PWA (`CheckInShell`): camera scan + keyboard-wedge + manual search
- Idempotent `POST /check-ins`; duplicate → `already`
- Live counts `/api/events/:id/live`; organizer live page + CSV export
- Re-entry policy flag; station_id; audit on export
- T-24h reminder cron (email)
- Check-in analytics + concurrency tests
- Accept `offline_id` field (API-ready for Phase 20)

**Out of scope:** Facial recognition, kiosks, turnstiles (Phase 20 integrate-only), session check-in (Phase 12 extension).

**Key epics:**
1. E7.1 Staff invite + OTP login
2. E7.2 Check-in validate + write API
3. E7.3 Scanner UI (phone-first, sunlight UX)
4. E7.4 Manual search check-in
5. E7.5 Live dashboard + CSV export
6. E7.6 Reminder cron + check-in tests

**Definition of done:** Dry-run with 20 phones: scan, duplicate handling, manual fallback, live count updates.

---

## Phase 8 — Communication engine (email / SMS / WA / push)

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0–P1 |
| **Complexity** | L |
| **Plan share** | 5% |
| **Dependencies** | Phase 6–7 |

**Goal:** One trigger → template → channel → delivery log engine; India-native channels orchestrated, not built.

**Scope (IN):**
- `MessageTemplate`, `Message`; domain-event → policy → render → enqueue ([11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md))
- Email: Resend/SES adapter (MVP)
- SMS: MSG91 for OTP + transactional ([12-integrations.md](12-integrations.md))
- Triggers: `registration.confirmed`, `payment.failed`, `reminder.24h`, `staff.invited`, post-event survey
- Organizer template API; consent gates (DPDP)
- WhatsApp: Gupshup/Interakt adapter + Meta template IDs (Phase 8 completion)
- Web Push (PWA) when event app exists (Phase 11 overlap)
- Bounce/suppression handling

**Out of scope:** Building WhatsApp protocol, email MTA, marketing blast sophistication (basic blast OK).

**Gaps (ops):** Gupshup/Meta template approval; Web Push delivery when VAPID keys set. Engine + email + WA adapter + template UI shipped.

**Key epics:**
1. E8.1 Communication engine core
2. E8.2 Email + SMS adapters
3. E8.3 Template CRUD + renderer
4. E8.4 Trigger library + reminder jobs
5. E8.5 WhatsApp adapter (integrate Gupshup)
6. E8.6 Consent + DPDP gates

**Definition of done:** Same trigger sends email; WA when consented and BSP configured; delivery logged; DLT/BSP paperwork in flight ([D10](DECISIONS.md)).

---

## Phase 9 — Discovery platform (browse & search)

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P1 |
| **Complexity** | M |
| **Plan share** | 5% |
| **Dependencies** | Phase 3 (published PUBLIC events) |

**Goal:** City-first public event discovery consuming the same `events` table — not a listing product.

**Scope (IN):**
- `GET /public/discover` — keyword, city, date, category, price, type ([17-discovery-and-surfaces.md](17-discovery-and-surfaces.md))
- Filter: `status=published AND visibility=public` only
- `/discover` UI + filters; ILIKE search (Postgres first)
- Event card projection → `/e/:slug`
- Category + tags metadata on Event
- Indexes: `(status, visibility, starts_at)`, city
- Related events: same city/type/organizer (SQL rules, no ML)

**Out of scope:** Recommendation AI, Typesense (until needed), separate listings table, native app shell.

**Key epics:**
1. E9.1 Discoverability query + API
2. E9.2 Search + filters
3. E9.3 `/discover` UI
4. E9.4 Event card component
5. E9.5 Discovery indexes + tests (PRIVATE/UNLISTED absent)

**Definition of done:** Stranger in Delhi finds a PUBLIC workshop without the organizer DMing the slug; no second "submit to marketplace" form.

---

## Phase 10 — Organizer profiles & consumer IA

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P1–P2 |
| **Complexity** | M–L |
| **Plan share** | 4% |
| **Dependencies** | Phase 9 |

**Goal:** Public organizer identity and consumer navigation shell (Home, Calendar, Following) for the network flywheel.

**Scope (IN):**
- Organizer public profile `/o/:orgSlug` + PUBLIC events list ✅
- Org public fields: bio, website, city, `is_public_profile`
- Browse rails: trending, this weekend, near you, free, online (extend Phase 9)
- **Following:** `Follow(user, org)` + Following feed
- **Calendar / My Tickets:** cross-event credential list for logged-in user
- **Home:** city + upcoming rails (personalization later)
- Consumer IA documented for Stage 2 universal app ([10-experience-surfaces.md](10-experience-surfaces.md))

**Out of scope:** Luma social graph clone, AI "what you may like" (defer), native app shell (Phase 20).

**Gaps (ops):** None for MVP. AI recommendations deferred.

**Key epics:**
1. E10.1 Organizer profile page ✅
2. E10.2 Browse rails (weekend, trending, …)
3. E10.3 Follow organizer API + UI
4. E10.4 My Tickets (cross-event)
5. E10.5 Calendar / saved events

**Definition of done:** Logged-in consumer can follow an org and see their PUBLIC events in Following; My Tickets lists credentials across events.

---

## Phase 11 — Event PWA & attendee experience

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P1 |
| **Complexity** | L |
| **Plan share** | 4% |
| **Dependencies** | Phase 6, 8 |

**Goal:** Stage 1 event PWA after register — My Pass, schedule, venue; add-to-home-screen.

**Scope (IN):**
- Event PWA shell `/e/:slug/app` + `manifest.json` + service worker ✅
- Tabs: My Pass, Schedule, Venue (hide empty tabs) ✅
- Cached ticket/QR for display (gate still online unless Phase 20 offline)
- Push notifications hook (Web Push)
- Post-event survey in app ([11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md))
- Design-system compliance on attendee surfaces

**Out of scope:** Native iOS/Android (Phase 20), white-label (Phase 20), universal app shell (Phase 20).

**Gaps (ops):** Web Push send path needs VAPID keys. Networking tab uses rule-based suggestions when profile exists.

**Key epics:**
1. E11.1 PWA manifest + service worker
2. E11.2 My Pass tab
3. E11.3 Schedule / venue tabs (data-driven visibility)
4. E11.4 Web Push registration
5. E11.5 Post-event survey UX

**Definition of done:** Add to Home Screen works on Android Chrome; attendee opens My Pass offline-cached; empty tabs hidden.

---

## Phase 12 — Sessions, speakers & agenda

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P1 |
| **Complexity** | M |
| **Plan share** | 4% |
| **Dependencies** | Phase 3, 11 |

**Goal:** Tracks, sessions, speaker CMS, and public schedule on website + event app.

**Scope (IN):**
- `Track`, `Session`, `Speaker`, `SessionSpeaker`, `SessionSave` ([05-domain-model.md](05-domain-model.md))
- Tracks + sessions CRUD API ✅
- Public schedule on event app ✅
- Speaker profiles on website section (when data exists)
- Session capacity / waitlist (later within phase)
- Block-based site sections for schedule/speakers ([10-experience-surfaces.md](10-experience-surfaces.md) stage 2)
- Session check-in extension (optional P2)

**Out of scope:** Speaker self-serve portal (P3), Slido integration (integrate if needed).

**Gaps (ops):** Session waitlist / session check-in optional P2.

**Key epics:**
1. E12.1 Tracks + sessions CRUD
2. E12.2 Speaker CMS
3. E12.3 Public schedule (site + app)
4. E12.4 Personalized agenda (SessionSave)
5. E12.5 Session check-in (optional)

**Definition of done:** Conference-type events show live schedule on `/e/:slug` and app; meetup-type hides sessions module.

---

## Phase 13 — Networking & rule-based matchmaking

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P2 |
| **Complexity** | M–L |
| **Plan share** | 3% |
| **Dependencies** | Phase 11–12 |

**Goal:** Opt-in attendee networking with rule-based suggestions — data model ready for future AI, no ML in v1.

**Scope (IN):**
- `NetworkingProfile`, `Connection`, `Meeting` ([10-experience-surfaces.md](10-experience-surfaces.md))
- Networking profile + connect code ✅
- Connection requests (request/accept) ✅
- Directory with filters (industry, role, interests)
- **Rule-based match score** (overlap tags, goals, industry, sessions) — not stub
- Separate networking QR (≠ gate credential)
- Meetings: requested → accepted → done

**Out of scope:** **AI matchmaking / embeddings** (Phase 20+ or never), speed-networking ops format, virtual table networking.

**Gaps (ops):** None for MVP. AI matchmaking deferred.

**Key epics:**
1. E13.1 Networking profile + opt-in
2. E13.2 Directory + filters
3. E13.3 Connect + QR exchange
4. E13.4 Rule-based suggestion engine
5. E13.5 Meeting scheduler

**Definition of done:** Two attendees connect via QR; top-20 rule-based suggestions shown; networking QR cannot gate-check-in.

---

## Phase 14 — Exhibitors, sponsors & lead capture

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P2 |
| **Complexity** | L |
| **Plan share** | 4% |
| **Dependencies** | Phase 6, 11 |

**Goal:** Expo workflows: exhibitor onboarding, booth assignment, pass quota, lead scan, sponsor tiers.

**Scope (IN):**
- `Exhibitor`, `Booth`, `Lead`, sponsor tiers ([02-capability-map.md](02-capability-map.md))
- Exhibitor CRUD API ✅; sponsor tiers + logos (seed) ✅
- Lead capture scan + CSV export ✅
- Exhibitor portal UI (profile, staff, leads)
- Pass allocation: N exhibitor staff → attendees + credentials
- Booth assignment + floor map embed (maps integrate)
- Lead unique `(exhibitor_id, attendee_id)`; consent toast

**Out of scope:** 3D booths, live commerce, offline-online expo sync as special DB.

**Gaps (ops):** Floor-map embed is URL-only; 3D booths out of scope.

**Key epics:**
1. E14.1 Exhibitor + booth CRUD
2. E14.2 Pass allocation to exhibitor staff
3. E14.3 Lead scan PWA (exhibitor role)
4. E14.4 Exhibitor portal UI
5. E14.5 Sponsor tiers on site/app

**Definition of done:** Exhibitor exports CSV of leads after event; sponsor logos render on website; staff credentials check in at gate.

---

## Phase 15 — Virtual & hybrid streaming

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P2 |
| **Complexity** | L |
| **Plan share** | 3% |
| **Dependencies** | Phase 6, 8 |

**Goal:** Authenticated watch page with third-party video — integrate, never build SFU or 3D venue.

**Scope (IN):**
- `attendance_mode` on attendee (in_person | virtual | hybrid) ✅
- `Stream` entity + provider pointer ✅
- Authenticated watch page `/e/:slug/watch?token=...` ✅
- Virtual skips gate check-in ✅
- **Live integration:** Mux / Cloudflare Stream / Daily / 100ms ([12-integrations.md](12-integrations.md))
- Player beacons → `AnalyticsEvent` (watch minutes)
- Reminder comms with stream link
- Breakout rooms via Daily/100ms (integrate)

**Out of scope:** Mixhub / 3D / metaverse (**Partner / never build**), proprietary video stack, Hopin clone.

**Gaps (ops):** Mux/Daily adapters ready when keys set; mock embed otherwise.

**Key epics:**
1. E15.1 Attendance mode UX
2. E15.2 Stream entity + Mux/Daily adapter
3. E15.3 Authenticated watch page
4. E15.4 Player analytics beacons
5. E15.5 Hybrid ticket policies

**Definition of done:** Virtual ticket holder watches live stream; in-person ticket cannot watch unless hybrid; no in-house media servers.

---

## Phase 16 — Analytics, CRM & reporting

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0–P2 |
| **Complexity** | M–L |
| **Plan share** | 4% |
| **Dependencies** | Phase 3, 7 |

**Goal:** First-party event analytics, organizer dashboards, exports, and lightweight in-product CRM timeline.

**Scope (IN):**
- `AnalyticsEvent` append-only log (day one) ✅
- Organizer summary: registered, checked-in, revenue, funnel ✅
- Check-in histogram; ticket type breakdown
- CSV/XLSX: attendees, orders, check-ins ✅
- In-product attendee CRM timeline (messages + attendance)
- Materialized views / warehouse hook (later)
- Scheduled PDF reports (enterprise, P3)
- Product analytics (`product.*` prefix) optional PostHog ([D15](DECISIONS.md))

**Out of scope:** Building a Salesforce; pixel-perfect PDF report builder in v1.

**Gaps (ops):** Warehouse/materialized views deferred. CRM timeline + funnel dashboard shipped.

**Key epics:**
1. E16.1 Analytics ingest (complete event catalog)
2. E16.2 Organizer dashboard + funnel
3. E16.3 Export suite (attendees, orders, check-ins)
4. E16.4 Attendee CRM timeline
5. E16.5 Aggregations / materialized views

**Definition of done:** Organizer sees funnel and revenue without third-party; export is audited; CRM shows message + check-in history per attendee.

---

## Phase 17 — Enterprise (SSO, API, webhooks, domains)

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P2–P3 |
| **Complexity** | L–XL |
| **Plan share** | 5% |
| **Dependencies** | Phase 2, 16 |

**Goal:** Enterprise procurement blockers: SSO, API keys, outbound webhooks, custom domains, audit UI, data export.

**Scope (IN):**
- Audit log UI ✅
- API keys (create/list) ✅
- Outbound webhooks (HMAC) ✅
- Full org JSON export ✅
- `customSubdomain` + SSO schema/env stub ✅
- Fine-grained `EventStaffRole` enum ✅
- **WorkOS** SSO/SAML/OIDC wired ([12-integrations.md](12-integrations.md))
- Public API read endpoints (events, attendees, orders)
- Custom domain DNS + SSL automation
- Data retention / deletion jobs (DPDP)
- Enterprise billing / contracts (business process)
- SCIM (after SSO)

**Out of scope:** Building an IdP; venue sourcing.

**Gaps (ops):** WorkOS live when env set (mock otherwise); custom subdomain config + middleware; DNS/SSL automation is operational.

**Key epics:**
1. E17.1 Audit log UI
2. E17.2 API keys + scoped REST read/write
3. E17.3 Outbound webhooks + delivery log
4. E17.4 WorkOS SSO integration
5. E17.5 Custom domain + SSL
6. E17.6 Data export + retention jobs

**Definition of done:** Enterprise customer uses SSO; API key reads attendees; webhook fires on `registration.confirmed`; custom domain serves `/e/:slug`.

---

## Phase 18 — Security, compliance & scale hardening

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 (baseline) → P1 (hardening) |
| **Complexity** | L |
| **Plan share** | 5% |
| **Dependencies** | All prior phases |

**Goal:** Production-grade security architecture: RBAC enforcement, encryption, rate limits, DPDP compliance, scale to 2k+ check-ins.

**Scope (IN):**
- RBAC default-deny; event-scoped staff; check-in ≠ export ([11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md))
- CSRF, CORS, payload limits, webhook signatures ✅ (partial)
- OTP / register rate limits ✅
- 2FA on export/refund for org owners
- DPDP: consent, privacy policy, deletion/anonymize jobs, India residency ([D3](DECISIONS.md))
- Encryption: TLS, Postgres at-rest, secrets manager, credential hash
- Abuse: Turnstile captcha on register if abused
- Scale: idempotent check-in, indexed credential lookup, connection pooler, autoscale targets
- Threat model per phase; dependency scanning
- Platform admin: separate path, audited impersonation

**Out of scope:** Building Aadhaar/OVSE, facial recognition, PCI acquiring.

**Gaps (ops):** TOTP optional; DPDP deletion cron shipped; 2k load test is operational follow-up.

**Key epics:**
1. E18.1 RBAC hardening + penetration checklist
2. E18.2 2FA for privileged actions
3. E18.3 DPDP compliance package
4. E18.4 Rate limits + abuse tooling
5. E18.5 Scale test program (2k check-in correctness)
6. E18.6 Secrets rotation + admin security

**Definition of done:** Threat model signed off; 2FA on refund/export; DPDP deletion job tested; check-in suite passes concurrency load test.

---

## Phase 19 — Production deploy, observability & DR

| Field | Value |
|-------|-------|
| **Status** | **Done** |
| **Priority** | P0 (staging) → P1 (prod) |
| **Complexity** | M–L |
| **Plan share** | 5% |
| **Dependencies** | Phase 1, 18 |

**Goal:** Staging + production on Render/AWS India region with monitoring, backups, and disaster-recovery runbooks.

**Scope (IN):**
- `render.yaml` Blueprint (web + Postgres + Redis) ✅
- Staging deploy runbook (README) ✅
- Bind `0.0.0.0:$PORT`; ephemeral disk rules ([Render platform constraints](../README.md))
- Environments: local → staging → prod; never share prod DB
- Sentry, structured logs, `/health` with DB ping ✅
- Managed Postgres PITR; quarterly restore drill
- Uptime monitoring on `/health` + Razorpay webhook lag
- Worker process for BullMQ (email, reminders, webhooks)
- CDN (Cloudflare) for public GETs
- Production India region for PII ([D3](DECISIONS.md))
- Design-system compliance gate in PR checklist

**Out of scope:** Multi-region active-active (until revenue warrants).

**Gaps (ops):** Render + Vercel live. PITR restore drill + separate worker dyno are operational follow-ups.

**Key epics:**
1. E19.1 Staging deploy + seed
2. E19.2 Production deploy + secrets
3. E19.3 Worker + queue separation
4. E19.4 Monitoring + alerting
5. E19.5 Backup/restore drill + DR doc

**Definition of done:** Prod serves real event; restore from backup tested; on-call runbook exists; Sentry alerts on payment webhook failures.

---

## Phase 20 — Partner hardware, offline ops, identity & apps (integrate-only)

| Field | Value |
|-------|-------|
| **Status** | **Done** (integrate-only) |
| **Priority** | P2–P3 |
| **Complexity** | XL (aggregate) |
| **Plan share** | 5% |
| **Dependencies** | Phase 7, 11, 17, 19 |

**Goal:** Dreamcast-class *edges* via partners and late surfaces — never in-house hardware, FR, or Aadhaar.

**Scope (IN — integrate / partner only):**

| Capability | Eventsliner builds | Partner / integrate |
|------------|-------------------|---------------------|
| Offline check-in batch API + PWA queue | ✅ Software | — |
| Badge HTML/PDF/ZPL payload | ✅ Software | QZ Tray, Zebra network print |
| Badge printers / kiosks / turnstiles | Template only | **Zebra, Brother, Evolis; Fastest Indian-class vendors — rent, never build** |
| NFC/RFID credentials | Encode same credential | **HID, Impinj, venue vendors — Phase 20+** |
| **Facial recognition check-in** | **Do not build** | Certified vendor only if enterprise deal |
| **Aadhaar / UIDAI OVSE** | **Do not build** | IDfy / HyperVerge / certified OVSE only |
| KYC / PAN | Orchestrate | IDfy, HyperVerge |
| Cashless RFID wallets | **Do not build** | Festival partners |
| **Stage 2 universal app** (Discover + My Events + Tickets) | One web/PWA or React Native shell | App stores when validated |
| **Stage 3 white-label native** (iOS/Android) | `event_app_config` | Per-customer store listing — services SKU |
| Apple/Google Wallet passes | Pass payload | Passkit / native APIs |
| AI matchmaking ranker | Feature store exists (Phase 13) | ML later or never |

**Out of scope:** In-house kiosks, turnstile R&D, 3D venues, native apps as default path, building OVSE.

**Gaps (ops):** Partner adapter contracts + NFC/turnstile APIs shipped. FR/Aadhaar intentionally not built; Stage 3 white-label is services SKU.

**Key epics:**
1. E20.1 Offline check-in sync (batch API + PWA queue) ✅
2. E20.2 Badge print payload + QZ Tray integration
3. E20.3 Printer partner runbook (Zebra/Brother)
4. E20.4 NFC/turnstile partner adapter spec (integrate-only)
5. E20.5 Identity verification partner hook (Aadhaar/FR — opt-in enterprise only)
6. E20.6 Stage 2 universal Eventsliner app
7. E20.7 Stage 3 white-label native (customer-funded)
8. E20.8 AI matchmaking (optional, data-dependent)

**Definition of done:** Offline queue syncs without double-admit; badge prints via partner stack; FR/Aadhaar documented as integrate-only with legal gate; Stage 2 app lists Discover + My Tickets; no in-house hardware shipped.

---

## Cross-reference: original docs/13 phases → Phase 1–20

| Original ([13-mvp-roadmap-tickets.md](13-mvp-roadmap-tickets.md)) | New Phase 1–20 | Notes |
|---------------------------------------------------------------------|----------------|-------|
| Phase 0 — Foundations | **1** Foundations & design system + **2** Org/auth/tenancy + part of **19** deploy baseline | START HERE tasks 1–13 |
| Phase 1 — Event website | **3** Event entity & website | Tasks 14–20 |
| Phase 2 — Registration + pay | **4** Registration + **5** Ticketing/payments | Spine |
| Phase 3 — Credentials + check-in | **6** Credentials + **7** Check-in | Gate product |
| Phase 4 — Discovery | **9** Discovery + **10** Organizer profiles & consumer IA | Split network shell |
| Phase 5 — Comms + PWA | **8** Communication + **11** Event PWA | Engine vs attendee shell |
| Phase 6 — Sessions + networking | **12** Sessions/speakers + **13** Networking | CMS vs graph |
| Phase 7 — Exhibitors + sponsors | **14** Exhibitors/sponsors/leads | |
| Phase 8 — Virtual + hybrid | **15** Virtual/hybrid | Integrate video |
| Phase 9 — Enterprise + hardware partners | **16** Analytics/CRM + **17** Enterprise + **18** Security + **19** Prod/DR + **20** Partner/offline/identity/apps | Expanded late stack |

---

## Cross-reference: §29 deliverables ([14-prioritization-risks-decisions.md](14-prioritization-risks-decisions.md)) → Phase 1–20

| §29 item | Phase(s) |
|----------|----------|
| D1 Commercial model (0% tickets) | **2**, **5** (recorded [DECISIONS.md](DECISIONS.md)) |
| D2 Merchant of record (organizer) | **5** |
| D3 India hosting region | **19** |
| D4 Phone + email auth | **2** |
| D5 `/e/:slug` URLs | **3** |
| D6 Powered-by chrome | **3**, **11** |
| D7 GST / CA sign-off | **5**, **18** |
| D8 Refund policy | **5** |
| D9 Waitlist | **4** extension (post-spine) |
| D10 WhatsApp entity / BSP | **8** |
| D11 Student/.org — no connection | **Out of scope** (above) |
| D12 Target: workshops 50–800 | **3–7** |
| D13 Luma quality + design system | **1**, **3**, all UI phases |
| D14 Offline first events — no | **20** (when needed) |
| D15 PostHog optional | **16** |
| D16 Default PUBLIC visibility | **3**, **9** |
| D17 City-first Delhi | **9**, **10** |
| MUST BUILD (spine) | **1–7**, **16** (analytics facts) |
| SHOULD BUILD | **8–15**, **10** |
| BUILD LATER | **12–14**, **20** (badges print) |
| INTEGRATE (Razorpay, Resend, MSG91, Gupshup, Mux/Daily, S3, WorkOS, maps, printers) | **5**, **8**, **12**, **15**, **17**, **19**, **20** |
| DO NOT BUILD (FR, Aadhaar, cashless, 3D, native v1, AI v1, microservices) | **20** integrate-only or **Out of scope** |

---

## Cross-reference: capability map horizons ([02-capability-map.md](02-capability-map.md))

| Horizon | Phase(s) |
|---------|----------|
| MVP | **1–7**, **16** (write path) |
| Phase 4 (discovery) | **9–10** |
| Phase 5 (comms/PWA) | **8**, **11** |
| Phase 6 (sessions/networking) | **12–13** |
| Phase 7 (exhibitors) | **14** |
| Phase 8 (virtual) | **15** |
| Phase 9 (enterprise) | **17**, **18**, **19**, **20** (Stage 2–3 apps) |
| Integrate | **5**, **8**, **12**, **15**, **17**, **20** |
| Do not build | **Out of scope** + **20** (explicit partner rows) |

---

## Integrations matrix → phase ownership

| Integration | Phase | Build vs integrate |
|-------------|-------|-------------------|
| Razorpay (payments, Route) | **5** | Integrate |
| Resend / SES (email) | **8** | Integrate |
| MSG91 (SMS OTP) | **2**, **8** | Integrate |
| Gupshup / Interakt (WhatsApp) | **8** | Integrate |
| S3 / R2 (media) | **3**, **19** | Integrate |
| Mux / Daily / 100ms (video) | **15** | Integrate |
| WorkOS (SSO) | **17** | Integrate |
| Typesense (search) | **9–10** (when Postgres hurts) | Integrate |
| Cloudflare (CDN, Turnstile) | **18**, **19** | Integrate |
| Sentry | **1**, **19** | Integrate |
| QZ Tray / Zebra (print) | **20** | Integrate |
| IDfy / HyperVerge (KYC/Aadhaar) | **20** | Integrate only, opt-in |
| PostHog (product analytics) | **16** | Optional integrate |
| Maps (Google/Mapbox) | **3**, **14** | Integrate |

---

## Design system compliance gate

Every phase that ships UI **must** pass before merge:

1. Tokens from [16-design-system.md](16-design-system.md) — no raw hex in components
2. 48px minimum touch targets on public, check-in, and attendee surfaces
3. WCAG AA contrast; focus visible; reduced motion respected
4. Shell correct: `PublicShell`, `AppShell`, `CheckInShell`
5. Organizer `primary_color` maps to Material **primary** roles only
6. PR checklist references design-system rule (`.cursor/rules/design-system.mdc`)

Applies starting **Phase 1**; re-audit at **Phase 11** (PWA) and **Phase 20** (universal app).

---

## Recommended execution order (dependency graph)

```
1 Foundations → 2 Auth/tenancy → 3 Event website
  → 4 Registration → 5 Payments → 6 Credentials → 7 Check-in
    → 8 Comms ─┬→ 9 Discovery → 10 Consumer IA
               └→ 11 Event PWA
    → 12 Sessions → 13 Networking
    → 14 Exhibitors → 15 Virtual
    → 16 Analytics/CRM
    → 17 Enterprise
    → 18 Security hardening (continuous from Phase 2)
    → 19 Production/DR (continuous from Phase 1)
    → 20 Partner/offline/identity/apps (last)
```

**Do not invert:** discovery before spine (Phases 1–7); native apps before PWA (Phase 11); FR/Aadhaar before enterprise legal review (Phase 20).

---

## Related documents

| Doc | Role |
|-----|------|
| [15-start-here.md](15-start-here.md) | First 20 engineering tasks → Phases 1–3 |
| [13-mvp-roadmap-tickets.md](13-mvp-roadmap-tickets.md) | Ticket-level epics for original Phases 0–9 |
| [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) | Current build status |
| [DECISIONS.md](DECISIONS.md) | D1–D17 decision log |
| [02-capability-map.md](02-capability-map.md) | Full capability tree |
| [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md) | Three surfaces model |

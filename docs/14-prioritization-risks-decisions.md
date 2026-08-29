# 25–29. Prioritization, complexity, risks, and decisions

---

## 25. Prioritization framework

Scoring (qualitative, not fake precision):

- **P0** — cannot run a real event or cannot take first revenue without it
- **P1** — needed immediately after first events (trust, ops, India-native)
- **P2** — expands the surface to conferences/expos
- **P3** — enterprise / hardware / AI / vanity

**First revenue** = organizer ran a paid or serious free event on the product.

### MUST BUILD

| Feature | Pri | Business value | Complexity | Deps | Risk | First revenue? |
|---------|-----|----------------|------------|------|------|----------------|
| User + OTP/email auth | P0 | High | M | SMS/email 3P | OTP abuse | Yes |
| Organization | P0 | High | S | User | — | Yes |
| Event + types as config | P0 | High | M | Org | Overdesign types | Yes |
| Public event page template | P0 | High | M | Event, media | Ugly page kills conversion | Yes |
| Registration state machine | P0 | High | L | Event | God-object form | Yes |
| Ticket types + inventory + holds | P0 | High | M | Event | Oversell | Yes |
| Razorpay checkout + webhooks | P0 | High | L | Order | Money bugs | **Yes** |
| Attendee record | P0 | High | M | Registration | Merged with User | Yes |
| Credential + QR | P0 | High | M | Attendee | Guessable IDs | Yes |
| Confirmation email | P0 | High | M | Comms, email 3P | Spam folder | Yes |
| Check-in scan + search | P0 | High | L | Credential, staff RBAC | Gate chaos | Yes |
| Staff role + OTP | P0 | High | M | Auth | Overprivilege | Yes |
| Basic analytics facts + summary | P0 | Med | M | Events | Afterthought dashboards | Yes |
| Attendee CSV | P0 | High | S | Attendee | PII leak | Yes |
| Tenant isolation | P0 | High | M | All | Fatal | Yes |
| Consent / terms | P0 | Med | S | Form | Legal | Yes |

### SHOULD BUILD (soon after MVP)

| Feature | Pri | Value | Cx | Deps | Risk | First revenue? |
|---------|-----|-------|----|------|------|----------------|
| **Discovery search + city browse + organizer profiles** | **P1** | **High (flywheel)** | M | Published PUBLIC events | Building it *before* the spine, or never | After first events exist |
| 24h reminder email | P1 | High (no-shows) | S | Jobs | — | Helps |
| Communication engine (not hardcoded) | P1 | High | L | Messages | Rework if delayed | No |
| WhatsApp ticket | P1 | High India | L | BSP, consent | Meta approval | Differentiator |
| Refund UX + policy | P1 | High | M | Razorpay | Partial cases | Trust |
| GST invoice PDF | P1 | High India | L | Tax advice | Wrong tax | B2B |
| Promo codes | P1 | Med | M | Orders | Stacking bugs | Sometimes |
| Waitlist | P1 | Med | M | Inventory | Fairness | Sometimes |
| Approval / invite modes | P1 | Med | M | Registration | — | Corporate |
| Manual add attendee / walk-in | P1 | Med | M | Attendee | Free comps mess inventory | Door sales |
| Speaker + schedule sections | P1 | Med | M | Site | — | Conferences |
| Survey / feedback | P1 | Med | M | Forms | — | Retention |
| 2FA on export/refund | P1 | Med | M | Auth | — | Trust |

### BUILD LATER

| Feature | Pri | Value | Cx | Notes |
|---------|-----|-------|----|-------|
| Group registration | P2 | High for some | L | Don't fake it |
| Conditional questions | P2 | Med | L | |
| Badge templates + print payload | P2 | High expo | L | Software only |
| Session check-in | P2 | Med | M | |
| Access zones | P2 | Med | L | |
| Exhibitor portal + leads | P2 | High expo $ | L | Monetizable add-on |
| Networking + rule match | P2 | Med | L | Collect profile fields |
| PWA app shell + push | P2 | Med | L | Phase 5 attendee experience |
| Discovery personalization / “what you may like” | P3 | Med | L | After Phase 4 search works; no AI required to start |
| Offline check-in | P2 | High mega | XL | After online is perfect |
| Custom subdomain | P2 | Low–med | M | |
| Virtual watch page | P2 | Med | L | 3P video |
| Outbound webhooks / Zapier | P2 | Med | M | |

### DO NOT BUILD — INTEGRATE / NEVER

| Feature | Why |
|---------|-----|
| Payment acquiring | PCI, RBI, fraud |
| WhatsApp protocol | Meta BSP |
| Email MTA | Deliverability |
| Facial recognition | Legal, bias, lighting, Dreamcast moat |
| Aadhaar in-house | UIDAI |
| Kiosks / turnstiles / RFID wallets | Hardware company |
| 3D / metaverse venue | Services tar pit |
| Native iOS/Android v1 | Cost; Stage 1 PWA then Stage 2 universal; Stage 3 white-label much later |
| AI matchmaking / discovery recommendation AI v1 | No data; search+filter is enough |
| Microservices | Premature |
| Per-type backends | Forbidden by principle |
| Separate listing/website/app backends | Forbidden: one Event |
| Venue sourcing / hotels | Cvent's business |
| Photobooth / 50 games / Picbot | Activations, not SaaS |
| Hopin clone | Market moved on |

---

## 25.1 Flywheel (why discovery is P1 after the spine)

```
more organizers → more events → more PUBLIC inventory → more discovery
  → more attendees → more registrations → more data → more organizer value → more organizers
```

Without discovery, Eventsliner is a Dreamcast-shaped OS that does not compound. Without the spine, discovery is Allevents-without-operations. **Sequence: P0 spine, then P1 discovery, then richer Dreamcast features.** Do not invert. Do not put discovery in the first 20 tasks.

**Every published public event is both an event website and a potential discovery object. Eventsliner.live must treat event discovery as a first-class platform capability, while allowing organizers to opt out through visibility settings.**

**Event is the canonical object. Discovery, event website, and event app are interfaces on that object, not separate products.**

---

## 27. Estimated complexity (by phase)

| Phase | Engineering complexity | Main risk |
|-------|------------------------|-----------|
| 0 Foundations | M | Auth/DLT delays |
| 1 Event website | M | Taste / performance |
| 2 Registration + pay | **L–XL** | Money + inventory |
| 3 Check-in | **L** | Device zoo, races |
| **4 Discovery + search + org profiles** | **M** | Treating it as a second Event; or skipping it forever |
| 5 Comms / WA + event PWA | L | Meta / DLT; empty app tabs |
| 6 Sessions + networking | M–L | Scope creep CMS |
| 7 Exhibitors + sponsors | L | Permissions explosion |
| 8 Virtual | L | Media edge cases |
| 9 Enterprise / Dreamcast-class | L–XL | Sales-driven scope; hardware support |

Phases **2 and 3** are the first revenue project. Phase **4** is the next first-class capability (not optional forever, not in the first 20). Everything Dreamcast-fancy waits until 0–3 are dull.

---

## 28. Major technical risks

| Risk | Why it's real | Mitigation |
|------|---------------|------------|
| Oversell | Classic ticketing bug | Holds + row lock + tests |
| Webhook vs redirect race | User refreshes, webhook late | Poll + confirm only server-side |
| Check-in double-admit | Two scanners | Unique constraint |
| QR guessable | Sequential ids | 128-bit ids |
| Tenant leak | Forgot `org_id` | Shared query helper + tests |
| PII in logs / analytics | Default logging | Redact middleware |
| Razorpay account / settlement legal | Who holds money | Linked accounts; lawyer |
| DLT / WhatsApp not approved | India reality | Email-first; start paperwork now |
| Venue wifi | Check-in dies | Design offline_id; don't build offline yet; use staff LTE |
| Scope: "just add FR" | Sales | This document |
| **Explosion: website builder + iOS + Android + discovery + Dreamcast at once** | Five companies | Sequence in [13](13-mvp-roadmap-tickets.md) / [17](17-discovery-and-surfaces.md) |
| **Discovery as a listing table** | Dual writes, drift from Event | One Event; visibility × published |
| Event type forks | "Exhibition needs its own service" | Module flags |
| Building Mixhub | Ego | Integrate video |
| Connecting Student/.org too early | Coupled identity | Separate tenants forever until a written product decision |
| GST wrong | Fines | CA review before live INR |
| Attendee data ownership fight | Organizers remember Eventbrite | Contract + export + no resale |
| Staff UX on cheap Androids | Real events | Test on low-end devices, not just laptops |

---

## 29. Decisions required before coding

These are product/legal/business, not tickets. Do not silently pick them in a PR.

### D1 — Commercial model
Zero commission (Dreamcast/Luma-ish SaaS) vs ticket take-rate (Eventbrite). **Recommendation:** 0% on tickets at first; charge a platform fee later or per-event. Aligns with "your earnings stay yours" and is simpler legally if Razorpay pays the organizer directly.

### D2 — Who is the merchant of record
Organizer (Razorpay linked account) vs Eventsliner. **Recommendation:** organizer. We are software, not a ticket marketplace.

### D3 — Hosting region
India (`ap-south-1`) vs cheapest US host. **Recommendation:** India for prod PII. Prototype anywhere.

### D4 — Auth first factor
Phone-first vs email-first. **Recommendation:** both; **staff must have phone**. Attendees: email+phone collected always.

### D5 — Public URL scheme
`/e/slug` vs subdomain. **Recommendation:** path in v1.

### D6 — Eventsliner branding on attendee surfaces
How visible. **Recommendation:** tiny "Powered by" in footer, removable later for paid plans. Don't dominate.

### D7 — GST treatment
Inclusive vs exclusive display; SAC code; who issues invoice (us vs organizer). **Needs a CA.** Blocks "live paid."

### D8 — Refund policy default
Organizer-defined vs platform-enforced windows. **Recommendation:** organizer-defined, we execute.

### D9 — Waitlist / overbook
Off until after MVP spine (not Phase 4 discovery). **Recommendation:** yes, after Phase 2–3 are stable.

### D10 — WhatsApp entity
Which legal entity applies to Meta/BSP. Start now. (Comms engine is **Phase 5**.)

### D11 — Eventsliner Student / .org
Confirmed **no connection**. Revisit only with a written identity-federation RFC.

### D12 — First target event type
Meetups vs paid workshops vs association conferences. **Recommendation:** paid workshops + small conferences (50–800). Enough commerce to test the spine, not IMC.

### D13 — Design taste bar
Luma-level public pages. Assign someone with taste. A correct-but-ugly MVP will be judged as Townscript.

**Binding constraint:** those pages (and every other surface) ship inside [16-design-system.md](16-design-system.md) — Material Design 3 tokens/structure + Apple HIG interaction and accessibility. Clarity, not decoration. Agents: `.cursor/rules/design-system.mdc` is `alwaysApply: true`. UI that ignores it is out of scope.

### D14 — Offline check-in in first 10 events
**No**, unless a specific venue is a basement Faraday cage — then LTE routers, not a 6-week offline sync project.

### D15 — Analytics vendor for our SaaS
PostHog vs first-party only. Either is fine; customer dashboards stay first-party.

### D16 — Default visibility: PUBLIC vs UNLISTED
Whether a newly created (or newly published) event is **PUBLIC** (in discovery once published) or **UNLISTED** (website by link only).

**Recommendation:** default **PUBLIC** so the flywheel has inventory; one-click UNLISTED/PRIVATE to opt out. Corporate event type may default UNLISTED. Confirm before Phase 4 ships; store the field from Phase 1.

### D17 — Discovery geography: city-first India
Whether Phase 4 browse is city-first (Delhi, Bengaluru, Mumbai, …) vs a single national feed.

**Recommendation:** **city-first India**, Delhi as the first example city (“this weekend in Delhi”, “near you”). Keyword search still works nationally. Do not wait on a global recommendation model.

Record the answers in `DECISIONS.md` when coding starts.

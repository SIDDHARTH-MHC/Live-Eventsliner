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
| PWA app shell + push | P2 | Med | L | |
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
| Native iOS/Android v1 | Cost; PWA + WhatsApp |
| AI matchmaking v1 | No data |
| Microservices | Premature |
| Per-type backends | Forbidden by principle |
| Venue sourcing / hotels | Cvent's business |
| Photobooth / 50 games / Picbot | Activations, not SaaS |
| Hopin clone | Market moved on |

---

## 27. Estimated complexity (by phase)

| Phase | Engineering complexity | Main risk |
|-------|------------------------|-----------|
| 0 Foundations | M | Auth/DLT delays |
| 1 Event + site | M | Taste / performance |
| 2 Registration + pay | **L–XL** | Money + inventory |
| 3 Check-in | **L** | Device zoo, races |
| 4 Comms / WA | L | Meta / DLT |
| 5 Sessions | M | Scope creep CMS |
| 6 Expo / network | L | Permissions explosion |
| 7 PWA | M | Push flakiness |
| 8 Virtual | L | Media edge cases |
| 9 Enterprise | L | Sales-driven scope |
| 10 Hardware | XL | Support burden |

Phase 2 and 3 are the project. Everything else is optional until those are dull.

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
Off until Phase 4. **Recommendation:** yes.

### D10 — WhatsApp entity
Which legal entity applies to Meta/BSP. Start now.

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

Record the answers in a `DECISIONS.md` when coding starts.

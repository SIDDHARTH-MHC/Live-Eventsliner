# Decisions log

Fill this before application code starts. Context: [14-prioritization-risks-decisions.md](14-prioritization-risks-decisions.md).

| ID | Question | Decision | Owner | Date |
|----|----------|----------|-------|------|
| D1 | Commercial model (0% vs take-rate) | **0% on tickets; SaaS later** | Engineering | 2026-08-29 |
| D2 | Merchant of record | **Organizer via Razorpay linked accounts** | Engineering | 2026-08-29 |
| D3 | Hosting region | **India for prod PII** (`ap-south-1` or equivalent) | Engineering | 2026-08-29 |
| D4 | Auth first factor | **Email + phone; staff phone required** | Engineering | 2026-08-29 |
| D5 | Public URL scheme | **`/e/:slug`** | Engineering | 2026-08-29 |
| D6 | Eventsliner chrome on attendee surfaces | **Small footer, removable later** | Engineering | 2026-08-29 |
| D7 | GST treatment / invoice issuer | **Needs CA** — defer live INR charges until CA sign-off | Product | 2026-08-29 |
| D8 | Refund policy default | **Organizer-defined** | Engineering | 2026-08-29 |
| D9 | Waitlist in MVP | **No** | Engineering | 2026-08-29 |
| D10 | Legal entity for WhatsApp/DLT | **TBD — start MSG91/DLT registration in parallel** | Product | 2026-08-29 |
| D11 | Eventsliner Student / .org | **No connection** | Product | 2026-08-29 |
| D12 | First target event type | **Paid workshops + small conferences (50–800)** | Product | 2026-08-29 |
| D13 | Design taste bar | **Luma-quality public pages inside the binding design system** ([16-design-system.md](16-design-system.md); `.cursor/rules/design-system.mdc`). Material 3 structure + Apple HIG interaction/a11y. Building UI without that system is forbidden. | Engineering | 2026-08-29 |
| D14 | Offline check-in for first events | **No** | Engineering | 2026-08-29 |
| D15 | Product analytics vendor | **Optional PostHog; customer dashboards first-party** | Engineering | 2026-08-29 |
| D16 | Default visibility PUBLIC vs UNLISTED | **PUBLIC** (opt out via UNLISTED/PRIVATE); corporate type may default UNLISTED | Engineering | 2026-08-29 |
| D17 | Discovery geography | **City-first India; Delhi as first example city** | Product | 2026-08-29 |

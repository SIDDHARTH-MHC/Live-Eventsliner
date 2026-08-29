# Decisions log

Fill this before application code starts. Context: [14-prioritization-risks-decisions.md](14-prioritization-risks-decisions.md).

| ID | Question | Decision | Owner | Date |
|----|----------|----------|-------|------|
| D1 | Commercial model (0% vs take-rate) | _Recommended: 0% on tickets; SaaS later_ | | |
| D2 | Merchant of record | _Recommended: organizer via Razorpay linked accounts_ | | |
| D3 | Hosting region | _Recommended: India for prod PII_ | | |
| D4 | Auth first factor | _Recommended: email + phone; staff phone required_ | | |
| D5 | Public URL scheme | _Recommended: `/e/:slug`_ | | |
| D6 | Eventsliner chrome on attendee surfaces | _Recommended: small footer, removable later_ | | |
| D7 | GST treatment / invoice issuer | _Needs CA_ | | |
| D8 | Refund policy default | _Recommended: organizer-defined_ | | |
| D9 | Waitlist in MVP | _Recommended: no_ | | |
| D10 | Legal entity for WhatsApp/DLT | | | |
| D11 | Eventsliner Student / .org | **No connection** | | |
| D12 | First target event type | _Recommended: paid workshops + small conferences (50–800)_ | | |
| D13 | Design taste bar | **Luma-quality public pages inside the binding design system** ([16-design-system.md](16-design-system.md); `.cursor/rules/design-system.mdc`). Material 3 structure + Apple HIG interaction/a11y. Building UI without that system is forbidden. | | |
| D14 | Offline check-in for first events | _Recommended: no_ | | |
| D15 | Product analytics vendor | _Optional PostHog; customer dashboards first-party_ | | |
| D16 | Default visibility PUBLIC vs UNLISTED | _Recommended: PUBLIC (opt out via UNLISTED/PRIVATE); corporate type may default UNLISTED_ | | |
| D17 | Discovery geography | _Recommended: city-first India; Delhi as first example city_ | | |

# 0. Executive thesis

## The one-sentence conclusion

Dreamcast is not a self-serve event SaaS. It is an **India-first enterprise event-tech company that sells software + hardware + on-ground humans as one package**, priced per event, optimized for conferences, exhibitions, government events, and mega footfall (thousands to lakhs). Eventsliner.live should **not** copy that business. It should build the **software core** Dreamcast's software sits on, ship it as self-serve, make it India-native, and keep the architecture open so enterprise and on-ground capability can be added later.

## What reverse-engineering actually revealed

Public Dreamcast properties (`dreamcast.in`, `dreamcast.co`, `godreamcast.com`) describe a suite, not a single product:

| Named product / module | What it really is |
|------------------------|-------------------|
| Event Registration Platform | Software. Branded microsites, multi-tier forms, paid/unpaid, invite/approval, WhatsApp CRM |
| On-ground Registration / Check-in | Software + hardware + staff. QR, RFID, facial recognition, kiosks, turnstiles |
| Fastest Indian / Badge Kiosk | In-house hardware. 10-second badge print, QR + facial recognition |
| Ticket ka ATM | In-house hardware. Self-serve ticket / wristband kiosk |
| M-Badge | Software. WhatsApp/email digital badge |
| Mobile Event App | Software, often white-label / custom per event |
| Mixhub | Virtual / 3D / metaverse event environment |
| WebinarPlus | Webinar / online session product |
| Mindmixer | Networking / matchmaking / communications |
| Cashless | RFID/NFC wallets, vendor POS, festival payments |
| Picbot | AI event photo sharing by face |
| Game Management System | On-site gamification |
| Event CRM | Attendee relationship + campaign layer |
| On-ground Event Teams | Humans. Coordinators, product consultants, 24×7 support |

Dreamcast's own comparison pages are unusually honest about the real differentiator: **Cvent wins enterprise workflow, Bizzabo wins engagement UX, Dreamcast wins on-ground execution at Indian mega-event scale.** Testimonials talk about badge-print throughput, last-minute changes, and staff who stay on-site — not about a prettier form builder.

That distinction is the most important finding in this plan.

## Five layers. Eventsliner should only build some of them.

| Layer | Dreamcast | Eventsliner.live v1 | Eventsliner later |
|-------|-----------|--------------------|-------------------|
| 1. Software platform | Yes, custom / sales-led | **Build. Self-serve.** | Deepen |
| 2. Hardware (kiosks, printers, RFID, turnstiles) | In-house + deployed | **Do not build. Integrate printers later.** | Partner / rent |
| 3. Third-party integrations | Payments, CRM, WhatsApp, Aadhaar/UIDAI | **Integrate. Never build payments, video, WhatsApp transport, Aadhaar.** | Same |
| 4. Human / event operations | Core offer. On-site teams | **Do not hire an ops army.** Document runbooks. | Optional concierge |
| 5. Enterprise services | Event-to-event quotes, 24×7, dry runs | **Out of MVP.** | SSO, SLA, audit, API |

If Eventsliner tries to be Dreamcast in year one, it will spend its engineering and capital on kiosks, facial recognition, and on-site staffing — none of which create a repeatable software business, and none of which a new product can operate reliably.

## What Eventsliner should compete on

Not "more features than Dreamcast." That is a losing race against a 15-year ops company.

Compete on the gap **between** Luma and Dreamcast:

| Competitor | What they own | What they leave open |
|------------|---------------|----------------------|
| Luma | Beautiful pages, community, speed | Weak India payments/GST/WhatsApp, weak onsite, weak B2B multi-category registration |
| Eventbrite | Public discovery + ticketing | High fees, generic pages, weak B2B/expo, weak India-native ops |
| Townscript / Konfhub | India payments, GST, basic tickets | Weak event website quality, weak check-in product, weak path to exhibitors/networking |
| Dreamcast | Mega-event on-ground + WhatsApp + hardware | Not self-serve, custom pricing, overkill under ~500 attendees, sales cycle |
| Cvent / Bizzabo | Global enterprise programs | Expensive, US-centric, weak Indian on-ground and WhatsApp |

**Eventsliner.live wedge:** a self-serve platform that feels as fast as Luma, settles money like an Indian ticketing product (UPI, GST invoice, no surprise commission if that is the pricing choice), and treats **credential → check-in → attendance** as a first-class product — not a spreadsheet afterthought.

That wedge can grow into Dreamcast-class capability. It cannot start there.

## What "Dreamcast-like" actually requires underneath

Almost every Dreamcast screenshot is a skin on the same small set of systems:

1. **Identity** — who is this person, across events
2. **Organization + event** — who owns the event, what kind of event, what timezone/venue
3. **Registration engine** — a state machine, not a form
4. **Ticket / inventory / order / payment** — commerce
5. **Attendee record** — the operational person-at-this-event object
6. **Credential** — a scannable, revocable proof of access
7. **Check-in / access** — validate credential against rules, write attendance
8. **Communication engine** — templates + triggers + channels
9. **Analytics event log** — every meaningful action as data
10. **RBAC** — staff can do some things, not others

If those ten exist, event websites, badges, session scan, exhibitor lead capture, and networking are additions. If they do not exist, every new feature becomes a second product.

This plan is organized around those ten systems. Features are mapped onto them, not the other way around.

## Brutally small MVP (preview)

The first shippable product is the shortest path that can run a real event:

```
Organization → Event → Public page → Registration
→ Ticket / RSVP → Payment → Attendee → Credential (QR)
→ Confirmation (email) → Staff check-in → Attendance → Basic analytics
```

That is enough to charge a customer and not embarrass them on event day.

Everything else — badges, WhatsApp at scale, sessions, exhibitors, PWA app, virtual, SSO, Aadhaar, printers — is sequenced after this spine works.

## Explicit non-goals until the spine exists

- Facial recognition / Aadhaar / UIDAI
- Proprietary video or 3D virtual venues
- Custom payment processing or cashless RFID wallets
- In-house kiosks, turnstiles, or printers
- Native iOS / Android apps
- AI matchmaking
- Microservices
- Separate backends per event type
- Any connection to Eventsliner Student or Eventsliner.org

# 3. Competitive analysis

The goal is not to copy anyone. It is to see the category, isolate what is commodity, what is hard, and what is not worth building.

---

## 3.1 Category map

```
Self-serve / PLG                    Sales-led / enterprise
     │                                      │
     │  Luma                                │  Cvent
     │  Eventbrite (public)                 │  Bizzabo
     │  Townscript / Konfhub                │  Dreamcast
     │                                      │  Whova (mid)
     │                                      │
In-person ticketing ──────────── Virtual-first
     Eventbrite                    Hopin / RingCentral Events
     Dreamcast (gate)              Airmeet
     Luma (light)                  vFairs / Mixhub-class
```

Eventsliner.live should sit **left-of-center and down**: self-serve, in-person-first, India-native, with a path up and right.

---

## 3.2 Dreamcast

**Does better**

- On-ground reliability at 20k–300k people
- QR + kiosk + badge print + turnstile as one vendor
- WhatsApp as the primary attendee channel
- Multi-category B2B registration (delegate / exhibitor / press / student)
- Government / high-security story (invite, Aadhaar OVSE, FR)
- Humans who absorb last-minute change
- Zero-commission positioning vs marketplaces
- White-label / "we disappear behind your brand"

**Does not do (or does poorly)**

- Product-led self-serve. No public signup, no transparent price
- Fast time-to-first-event for a 50–300 person organizer
- Consumer-grade event page design (they are ops-first, not Luma-first)
- A documented public API culture
- Global venue sourcing (Cvent's real moat)
- Being cheap enough for community meetups

**Commodity in their suite:** forms, email, ticket SKUs, QR generation.

**Difficult to replicate:** on-site muscle memory, hardware fleet, government trust, 15 years of Indian mega-event scars.

**Not worth building:** their hardware, cashless RFID, 3D Mixhub, photobooths, in-house FR.

**Eventsliner differentiation vs Dreamcast:** self-serve, hours-not-weeks launch, modern UX, transparent pricing, software-only reliability. Do not fight them at IMC-scale gates in year one.

---

## 3.3 Luma

**Does better**

- Taste. Event pages people are proud to share
- Speed: create and publish in minutes
- Calendar / host graph / community discovery
- Delightful attendee UX (hosts, guests, plus-ones)
- Social proof and "who else is going" (when opted in)

**Does not do**

- Serious Indian payments (UPI as first-class, GST invoices, settlement to Indian orgs)
- WhatsApp transactional stack
- On-site check-in as a product you would trust at a 2,000-person gate
- Multi-category B2B / expo workflows
- Badge / access / exhibitor leads
- Enterprise RBAC, SSO, audit

**Commodity:** pretty pages, RSVP, calendar holds.

**Difficult to replicate:** taste and community flywheel.

**Not worth copying blindly:** their discovery social network (expensive, not the Indian B2B job-to-be-done).

**Eventsliner differentiation vs Luma:** India commerce + credential/check-in spine + event types beyond house parties and tech mixers. Steal their *page quality bar*, not their business.

---

## 3.4 Eventbrite

**Does better**

- Public marketplace demand
- Ticketing literacy (fees, refunds, on-sale, holds)
- Check-in app that organizers already know
- Scale of consumer ticketing
- Organizer education / defaults

**Does not do**

- Brand-safe B2B (Eventbrite-looking pages)
- Low take-rate (fees are the product)
- Expo / matchmaking / lead retrieval
- India-native WhatsApp / GST depth vs local players
- Complex approval / invite / government flows
- Treating organizer data as sacred (Dreamcast attacks this directly)

**Commodity:** ticket types, promo codes, checkout.

**Difficult to replicate:** marketplace SEO and demand.

**Not worth building:** a public consumer marketplace in v1. That is a different company.

**Eventsliner differentiation vs Eventbrite:** no (or low, transparent) ticket tax; organizer-owned list; better B2B registration; India rails.

---

## 3.5 Cvent

**Does better**

- Enterprise event *programs* (hundreds of events / year)
- Venue sourcing marketplace (~340k venues) — unique
- Procurement-friendly: SSO, legal, reporting, RFPs
- Complex registration logic at global scale
- Housing / travel / budget modules
- Multilingual, multicurrency

**Does not do**

- Pleasant UX (widely reported as heavy)
- Indian on-ground hardware + WhatsApp culture
- Affordable mid-market
- Fast self-serve for a single conference

**Commodity:** attendee lists, email blasts, survey.

**Difficult to replicate:** venue graph, enterprise sales machine, compliance paperwork.

**Not worth building:** venue sourcing, hotel blocks, travel booking. Those are adjacent marketplaces.

**Eventsliner differentiation vs Cvent:** not competing for Fortune 500 global meeting programs. Competing for Indian organizers who would be crushed by Cvent's cost and UI.

---

## 3.6 Bizzabo

**Does better**

- Branded B2B conference experience
- Attendee app + networking as a coherent product
- AI session / people recommendations (Bizzy)
- Marketing-team friendliness
- Hybrid session UX
- Sponsor storytelling (not just a logo strip)
- Klik SmartBadge hardware partnership (they still don't own the gate like Dreamcast)

**Does not do**

- Mega-event Indian gates
- Transparent cheap pricing (contracts often ~$18k+/yr)
- Deep on-site badge/kiosk/turnstile
- WhatsApp-native India

**Commodity:** conference website, speaker grid, agenda.

**Difficult to replicate:** polished engagement loop + AI that is trained on years of B2B events.

**Not worth building first:** their hardware badge program.

**Eventsliner differentiation vs Bizzabo:** price, India, self-serve, check-in seriousness. Steal their *attendee-experience coherence* later, not their sales motion.

---

## 3.7 Hopin / RingCentral Events

**Does better**

- Virtual-first stages, expo halls, networking rooms as one metaphor
- Livestream operations for digital-first events
- Chat / Q&A / booths in a virtual venue

**Does not do**

- In-person as a first-class product (Hopin's original sin after 2020)
- Indian on-ground
- Being a trusted ticketing/check-in system
- Independence (now RingCentral-shaped; market confidence is mixed)

**Commodity:** "embed a stream and a chat."

**Difficult to replicate:** a full virtual campus. Also **not worth replicating.** Virtual campuses died as a must-have. Hybrid now means "in-person event + a stream + a Slack/WhatsApp."

**Eventsliner differentiation:** in-person spine first. Virtual = authenticated watch page + 3P video. Never build Hopin.

---

## 3.8 Whova

**Does better**

- Mid-market event *app*: agenda, community, attendee list, announcements
- Organizers buy it specifically for engagement, not for tickets
- Check-in that is "good enough" for conferences
- Strong word of mouth among association events

**Does not do**

- Beautiful public pages / discovery
- Being the system of record for complex ticketing
- Hardware-class gates
- India-first communications

**Commodity:** agenda, speaker bios, push announcements.

**Difficult to replicate:** the habit of "open Whova at the conference."

**Not worth matching immediately:** shipping an app store app just to say you have one.

**Eventsliner differentiation:** own registration+tickets+check-in, then add Whova-like engagement in the PWA. Many organizers today buy Townscript *and* Whova. That bundle is the opening.

---

## 3.9 Airmeet

**Does better**

- Virtual/hybrid social (tables, networking, booths)
- Webinar → conference spectrum
- Engagement during livestreams
- India-origin company with global virtual customers

**Does not do**

- Physical check-in / badges / expos at Dreamcast depth
- Being the default for paid in-person tickets

**Commodity:** webinar rooms, polls.

**Difficult to replicate:** virtual networking UX they already iterated.

**Not worth building:** virtual table networking in v1.

**Eventsliner differentiation:** opposite starting point — physical events. Integrate Airmeet/Daily if a customer is hybrid-heavy.

---

## 3.10 India peers (must mention)

| Player | Strength | Gap Eventsliner can take |
|--------|----------|--------------------------|
| **Townscript** | Self-serve India tickets, UPI, GST, known brand | Event page quality, check-in as a product, path to expo/networking |
| **Konfhub** | Developer/community conferences, GST, some logic | Broader event types, check-in/credential spine, website taste |
| **Allevents.in** | Discovery / city listing | Not a serious operations platform |
| **Insider / BookMyShow** | Consumer demand + venues | Not B2B; they own the customer; organizers are inventory |
| **Explara** | Older India ticketing | UX debt |
| **Zoho Backstage** | Cheap if already in Zoho | Experience quality, India event-ops depth |

Dreamcast rarely shows up in "best event tools 2026" Western listicles. Townscript rarely shows up in Dreamcast's competitive pages. **That silence is the mid-market.**

---

## 3.11 What is commodity

Build these, but do not fantasize they are moats:

- Event title, date, venue, description
- Basic RSVP form
- Ticket types with a price and a cap
- Stripe/Razorpay checkout
- Confirmation email
- QR code generation
- CSV export
- Speaker cards on a website
- Logo strip of sponsors

Every competitor has these. Quality of execution still matters (Luma proves it).

---

## 3.12 What is difficult to replicate (real moats)

| Moat | Who has it | Should Eventsliner chase? |
|------|------------|---------------------------|
| On-site mega-event operations | Dreamcast | No, not first |
| Consumer marketplace demand | Eventbrite, BMS | No |
| Venue graph + enterprise procurement | Cvent | No |
| Community/host network | Luma | Lightly (public pages, not a social network) |
| WhatsApp + India settlement + GST as one flow | Dreamcast, Townscript | **Yes** |
| Credential → check-in correctness under load | Dreamcast, Eventbrite | **Yes, software-only** |
| Taste | Luma | **Yes** |
| Exhibitor lead economy | Dreamcast, Swapcard, Cvent | Later, it's monetizable |
| Hardware installed base | Dreamcast, Bizzabo Klik | No |

---

## 3.13 What is not worth building

- Facial recognition
- Aadhaar in-house
- RFID cashless wallets
- 3D/metaverse venues
- Native apps before PWA
- Venue sourcing
- Hotel booking
- Photobooth / social wall / 50 games
- Custom payment acquiring
- A Hopin clone
- A second backend for webinars vs conferences

---

## 3.14 Eventsliner positioning statement

**For Indian and India-first organizers running real in-person events (50–5,000 people to start), Eventsliner.live is the self-serve event operating system that takes you from a branded page to a scanned credential without a sales call, without Eventbrite fees, and without a Dreamcast-sized production contract.**

Later: the same OS grows into sessions, exhibitors, networking, WhatsApp, and optional on-site print partners — still one event object.

---

## 3.15 Competitive scorecard (target, not current — there is no product yet)

| Job | Luma | Eventbrite | Townscript | Dreamcast | Cvent | Eventsliner target |
|-----|------|------------|------------|-----------|-------|--------------------|
| Publish a beautiful page tonight | A | C | C | D | D | **A** |
| Collect UPI + GST cleanly | D | C | A | B | C | **A** |
| Multi-category B2B registration | D | C | B | A | A | **A (phased)** |
| Trust the gate at 500 people | C | B | C | A | B | **A** |
| Trust the gate at 50,000 people | F | C | D | A | B | **C then B** |
| WhatsApp ticket | F | F | B | A | F | **A (phase 4)** |
| Exhibitor leads | F | F | D | A | A | **B (phase 6)** |
| Virtual venue | D | D | D | B | B | **C (integrate)** |
| Self-serve price | A | B | A | F | F | **A** |
| Enterprise SSO / audit | F | C | D | C | A | **B (phase 9)** |

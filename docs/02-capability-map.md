# 2. Dreamcast-class capability map

This is the master tree. Every leaf is a capability, not a marketing phrase.

Legend used on every leaf:

| Field | Meaning |
|-------|---------|
| Does | What it does |
| Who | Primary users |
| Why | Job to be done |
| Flow | Happy-path workflow |
| Data | Core records |
| BE / FE | Backend / frontend needs |
| API | Key endpoints or events |
| Deps | Platform dependencies |
| 3P | Third parties |
| Sec | Security notes |
| Horizon | `MVP` / `Later` / `Enterprise` / `Integrate` / `Do not build` |
| Cx | Complexity: S / M / L / XL |
| Pri | P0–P3 |

Event type is a configuration on `Event`, not a fork of this tree.

```
Event Platform
├── Identity & Access
├── Organizations
├── Event Creation & Configuration
├── Event Website
├── Registration
├── Ticketing
├── Payments & Commerce
├── Attendee Management
├── Credentials
├── Check-in
├── Badge Management
├── Access Control
├── Sessions & Agenda
├── Speakers
├── Exhibitors
├── Sponsors
├── Networking
├── Matchmaking
├── Communication
├── Event App
├── Virtual Events
├── Hybrid Events
├── Streaming
├── Lead Capture
├── Engagement (Polls / Q&A / Surveys / Games)
├── Analytics
├── CRM
├── Reporting
├── Integrations
├── Admin
└── Enterprise
```

---

## 2.1 Identity & Access

### 2.1.1 User account
- **Does:** Creates a durable person identity (email and/or phone) used across orgs and events.
- **Who:** Everyone.
- **Why:** Without this, attendees, staff, and organizers fragment into duplicate records.
- **Flow:** Sign up → verify email or OTP → session.
- **Data:** `User` (email, phone, name, avatar, locale).
- **BE:** Auth service, session store, OTP.
- **FE:** Sign-in, verify, account settings.
- **API:** `POST /auth/*`, `GET /me`.
- **Deps:** Session, notification (OTP).
- **3P:** SMS OTP (MSG91), email.
- **Sec:** Credential stuffing, OTP abuse, account takeover.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.1.2 Phone-first login (India)
- **Does:** Login/signup with mobile OTP.
- **Who:** Attendees and staff in India.
- **Why:** Email-only auth fails for on-site staff and many attendees.
- **Flow:** Enter phone → OTP → session. Link email later.
- **Data:** `User.phone`, `OtpChallenge`.
- **BE:** Rate-limited OTP issuer.
- **FE:** Phone collect + OTP.
- **API:** `POST /auth/otp/start|verify`.
- **Deps:** SMS 3P.
- **3P:** MSG91 / Twilio.
- **Sec:** OTP farming, SIM swap (later: device binding).
- **Horizon:** MVP (at least for staff). **Cx:** M. **Pri:** P0.

### 2.1.3 Organization membership
- **Does:** Ties users to orgs with roles.
- **Who:** Org owner, staff.
- **Why:** Events are owned by organizations, not raw users.
- **Flow:** Create org → invite members → accept.
- **Data:** `Membership`.
- **BE:** Invite tokens, RBAC.
- **FE:** Team settings.
- **API:** `/orgs/:id/members`.
- **Deps:** User, Org.
- **3P:** Email.
- **Sec:** Invite token leakage.
- **Horizon:** MVP (owner + one staff role). **Cx:** S. **Pri:** P0.

### 2.1.4 Event-scoped roles
- **Does:** Grants permissions on one event (check-in staff must not edit tickets).
- **Who:** Organizer assigning staff.
- **Why:** Event day staffing is temporary and high-risk if over-permissioned.
- **Flow:** Invite by phone/email → role → expiry optional.
- **Data:** `EventStaff`.
- **BE:** Policy checks on every event route.
- **FE:** Staff manager, staff home.
- **API:** `/events/:id/staff`.
- **Deps:** RBAC, Event.
- **3P:** None.
- **Sec:** Least privilege, revoke on demand.
- **Horizon:** MVP (check-in role). **Cx:** M. **Pri:** P0.

### 2.1.5 SSO / SAML / OIDC
- **Does:** Enterprise IdP login for organizer employees.
- **Who:** Enterprise org admins.
- **Why:** Required by large corporates; useless for first customers.
- **Horizon:** Enterprise. **Cx:** L. **Pri:** P3. **3P:** WorkOS / Clerk Enterprise.

---

## 2.2 Organizations

### 2.2.1 Organization profile
- **Does:** Billing entity, brand defaults, GST profile.
- **Who:** Org owner.
- **Why:** Events inherit brand and tax identity.
- **Data:** `Organization` (name, slug, logo, GSTIN, support contacts).
- **Horizon:** MVP. **Cx:** S. **Pri:** P0.

### 2.2.2 Multi-event portfolio
- **Does:** One dashboard across events.
- **Who:** Agencies, associations.
- **Why:** Recurring organizers will not tolerate one-login-per-event.
- **Horizon:** MVP (list). Deep analytics Later. **Cx:** S. **Pri:** P0.

### 2.2.3 Multi-organization user
- **Does:** One user in many orgs.
- **Who:** Freelancers, agencies.
- **Horizon:** Later. **Cx:** M. **Pri:** P2.

---

## 2.3 Event Creation & Configuration

### 2.3.1 Event entity
- **Does:** Canonical event: title, type, timezone, status, visibility.
- **Who:** Organizer.
- **Why:** Root object for every other module.
- **Flow:** Create → draft → configure → publish → live → completed → archived.
- **Data:** `Event` (type enum, status, starts_at, ends_at, timezone, visibility).
- **BE:** Status state machine; no deletes of published events with orders.
- **FE:** Create wizard, settings.
- **API:** `CRUD /events`.
- **Deps:** Org, User.
- **3P:** None.
- **Sec:** Tenant isolation (`org_id` on every query).
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.3.2 Event types as config
- **Does:** Meetup / conference / workshop / exhibition / festival / corporate / sports / webinar / hybrid — same tables, different default modules and UI.
- **Who:** Organizer.
- **Why:** Prevents forked backends.
- **Data:** `Event.type`, `Event.module_flags`.
- **Horizon:** MVP (type field + defaults). **Cx:** S. **Pri:** P0.

### 2.3.3 Venue & dates
- **Does:** Physical address, map, multi-day, multi-venue later.
- **Who:** Organizer, attendees.
- **Why:** Public page + calendar + reminders.
- **Data:** `Venue`, `EventDate` (or fields on Event for v1).
- **3P:** Maps (Google / Mapbox) later.
- **Horizon:** MVP (single venue + datetime). Multi-venue Later. **Cx:** S. **Pri:** P0.

### 2.3.4 Capacity
- **Does:** Hard cap at event and/or ticket type.
- **Who:** Organizer.
- **Why:** Fire code, room size, hospitality.
- **Data:** `Event.capacity`, `TicketType.quantity`.
- **BE:** Transactional decrement; waitlist hook.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.3.5 Publish / unpublish
- **Does:** Public URL goes live; draft stays private.
- **Who:** Organizer.
- **Why:** Incomplete events must not be joinable.
- **Sec:** Unpublish must not void paid tickets silently.
- **Horizon:** MVP. **Cx:** S. **Pri:** P0.

---

## 2.4 Event Website

### 2.4.1 Public event page
- **Does:** Branded, mobile-first page: hero, about, tickets, venue, FAQ.
- **Who:** Prospective attendees.
- **Why:** Discovery and conversion. This *is* the product for many organizers.
- **Flow:** Open URL → decide → register.
- **Data:** `EventSite`, section content, media.
- **BE:** Public read API, CDN cache.
- **FE:** Template renderer.
- **API:** `GET /public/events/:slug`.
- **Deps:** Event, Tickets, Media.
- **3P:** CDN, image optimizer.
- **Sec:** No PII on public page.
- **Horizon:** MVP (one excellent template). **Cx:** M. **Pri:** P0.

### 2.4.2 Section library
- **Does:** About, speakers, schedule, sponsors, exhibitors, venue, FAQ, custom HTML/markdown block.
- **Horizon:** MVP (about, tickets, venue, FAQ). Speakers/schedule Later. **Cx:** M. **Pri:** P1.

### 2.4.3 Branding
- **Does:** Logo, colors, cover, favicon, fonts later.
- **Horizon:** MVP (logo + primary color + cover). **Cx:** S. **Pri:** P0.

### 2.4.4 Custom domain / subdomain
- **Does:** `event.brand.com` or `slug.eventsliner.live`.
- **Horizon:** Subpath `eventsliner.live/e/:slug` MVP. Subdomain Later. Custom domain Enterprise. **Cx:** L for custom domain. **Pri:** P2/P3.

### 2.4.5 SEO & social
- **Does:** Title, description, OG image, sitemap.
- **Horizon:** MVP basics. **Cx:** S. **Pri:** P1.

### 2.4.6 Drag-and-drop builder
- **Does:** Full visual builder.
- **Horizon:** **Do not build** until templates + block config are proven. **Cx:** XL. **Pri:** P3.

Website architecture is expanded in [10-experience-surfaces.md](10-experience-surfaces.md).

---

## 2.5 Registration

Registration is a **state machine**, not a form. Full design: [08-registration-payments.md](08-registration-payments.md).

### 2.5.1 Free registration
- **Does:** Collect identity + answers, create attendee + credential, no payment.
- **Who:** Attendee.
- **Why:** Meetups, community, internal.
- **Flow:** Form → submit → confirmed → QR.
- **Data:** `Registration`, `Attendee`, `Credential`.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.5.2 Paid registration
- **Does:** Same as free, blocked on successful payment.
- **Deps:** Order, Payment, Ticket inventory.
- **Horizon:** MVP. **Cx:** L. **Pri:** P0. First revenue.

### 2.5.3 RSVP (yes / no / maybe)
- **Does:** Invitation response without ticket commerce.
- **Who:** Private / corporate guests.
- **Horizon:** MVP (yes/no is enough). Maybe Later. **Cx:** S. **Pri:** P0.

### 2.5.4 Approval registration
- **Does:** Submit → pending → organizer approve/reject → then credential (and charge if paid-on-approval).
- **Who:** Curated conferences, govt, campus.
- **Horizon:** Later. **Cx:** M. **Pri:** P1.

### 2.5.5 Invite-only
- **Does:** Registration URL requires a token or allowlisted email/phone.
- **Horizon:** Later. **Cx:** M. **Pri:** P1.

### 2.5.6 Ticket types / categories
- **Does:** GA, Early bird, VIP, Student, Speaker — different price, quota, access, form.
- **Horizon:** MVP (price, quota, visibility). Access rules Later. **Cx:** M. **Pri:** P0.

### 2.5.7 Capacity & waitlists
- **Does:** When sold out, join waitlist; promote when a spot frees.
- **Horizon:** Capacity MVP. Waitlist Later. **Cx:** M. **Pri:** P1.

### 2.5.8 Registration questions
- **Does:** Custom fields: text, select, multi, file, T&C, dietary, GSTIN.
- **Horizon:** MVP (small field set). Conditional Later. **Cx:** M. **Pri:** P0.

### 2.5.9 Conditional questions
- **Does:** Show field if previous answer matches.
- **Horizon:** Later. **Cx:** L. **Pri:** P2.

### 2.5.10 Group / guest registration
- **Does:** One buyer, N attendees with per-person details.
- **Horizon:** Later (single attendee first). **Cx:** L. **Pri:** P1.

### 2.5.11 Coupons / promo codes
- **Does:** Percent or fixed discount, constraints, usage caps.
- **Horizon:** Later (can launch paid events without this). **Cx:** M. **Pri:** P1.

### 2.5.12 Deadlines
- **Does:** Sales open/close, early-bird windows.
- **Horizon:** MVP (sales window on ticket type). **Cx:** S. **Pri:** P0.

### 2.5.13 Terms / consent
- **Does:** Required legal + marketing opt-in (WhatsApp/SMS/email), stored with timestamp and version.
- **Horizon:** MVP. **Cx:** S. **Pri:** P0. Compliance.

### 2.5.14 Custom confirmation
- **Does:** Organizer-authored confirmation copy and extra instructions.
- **Horizon:** MVP (template vars). Rich editor Later. **Cx:** S. **Pri:** P1.

### 2.5.15 Refunds / cancellations / transfers
- **Does:** Policy-driven money movement and credential revoke/reissue.
- **Horizon:** Refund MVP (full, staff-initiated). Partial / transfer Later. **Cx:** L. **Pri:** P1.

### 2.5.16 On-spot / walk-in registration
- **Does:** Staff creates attendee at the door, optionally takes payment, issues credential immediately.
- **Horizon:** Later (staff can manually add attendee in P1). Full walk-in desk Later. **Cx:** M. **Pri:** P1.

### 2.5.17 Aadhaar / KYC registration
- **Does:** UIDAI-backed identity lock.
- **Horizon:** **Do not build.** Enterprise + certified vendor only. **Cx:** XL. **Pri:** P3.

---

## 2.6 Ticketing

### 2.6.1 Ticket type catalog
- **Does:** Named inventory SKU attached to an event.
- **Data:** `TicketType` (name, price, currency, quantity, sold, sales_start/end, visibility).
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.6.2 Inventory
- **Does:** Concurrent-safe remaining count.
- **BE:** DB constraints + transactional hold.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0. High risk if wrong.

### 2.6.3 Holds
- **Does:** Reserve inventory for N minutes during checkout.
- **Why:** Prevents oversell under payment latency.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.6.4 Hidden / access-code tickets
- **Does:** VIP or speaker tickets not on the public page.
- **Horizon:** Later. **Cx:** S. **Pri:** P2.

---

## 2.7 Payments & Commerce

### 2.7.1 Checkout
- **Does:** Create order, collect payer details, start provider session.
- **3P:** Razorpay (India). Stripe later for international.
- **Horizon:** MVP. **Cx:** L. **Pri:** P0. First revenue.

### 2.7.2 Payment webhooks
- **Does:** Source of truth for paid / failed / refunded.
- **Sec:** Signature verify, idempotency keys.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.7.3 Taxes & GST invoice
- **Does:** GST calculation, invoice PDF, organizer GSTIN.
- **Horizon:** Invoice MVP if charging in India (almost certainly yes). Full GSTR Later. **Cx:** L. **Pri:** P0 for tax fields; P1 for e-invoice.

### 2.7.4 Platform fees vs zero commission
- **Does:** Either absorb SaaS fee or take a cut. Dreamcast markets zero commission.
- **Horizon:** Decision required before coding. Implementation MVP. **Cx:** M. **Pri:** P0.

### 2.7.5 Refunds / partial refunds / failures
- **Does:** Provider refund + local state + inventory return + credential revoke.
- **Horizon:** Full refund MVP. Partial Later. **Cx:** L. **Pri:** P1.

### 2.7.6 Settlement
- **Does:** Organizer payouts. Use Razorpay Route / linked accounts. Do not hold funds ourselves.
- **Horizon:** MVP via Razorpay. **Cx:** M. **Pri:** P0. **Integrate.**

### 2.7.7 Cashless RFID wallets
- **Does:** In-venue F&B spend.
- **Horizon:** **Do not build.** Dreamcast Cashless is a different company.

---

## 2.8 Attendee Management

### 2.8.1 Attendee record
- **Does:** Person-at-this-event. Not the same as User.
- **Why:** Guests may not have accounts; staff may register people; one user may attend many events.
- **Data:** `Attendee` (event_id, user_id nullable, name, email, phone, ticket_type, status, answers JSON).
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.8.2 Attendee directory (organizer)
- **Does:** Search, filter, edit, resend credential, cancel.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.8.3 Import / export
- **Does:** CSV in/out for agencies and Excel-native organizers.
- **Horizon:** Export MVP. Import Later. **Cx:** M. **Pri:** P1.

### 2.8.4 Duplicates
- **Does:** Detect same phone/email on same event.
- **Horizon:** MVP (unique constraint optional by event policy). **Cx:** S. **Pri:** P1.

---

## 2.9 Credentials

### 2.9.1 Credential issuance
- **Does:** Creates a unique, revocable token after registration is confirmed.
- **Data:** `Credential` (attendee_id, public_id, secret_hash, type=qr, status, issued_at).
- **Why:** Check-in must not trust a name on a screenshot.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.9.2 QR payload
- **Does:** Signed or high-entropy code rendered as QR.
- **3P:** Generate ourselves (standard QR). No vendor needed.
- **Sec:** Do not put PII in the QR. Rotate on transfer.
- **Horizon:** MVP. **Cx:** M. **Pri:** P0.

### 2.9.3 Barcode / NFC / RFID
- **Does:** Alternate encodings of the same credential.
- **Horizon:** Barcode Later (printers). NFC/RFID Phase 10. **Cx:** L–XL. **Pri:** P3.

### 2.9.4 M-Badge
- **Does:** Mobile rendering of credential + name + event branding, deliverable via WhatsApp/email.
- **Horizon:** MVP as "Your ticket" page + email image. WhatsApp Later. **Cx:** S. **Pri:** P0.

---

## 2.10 Check-in

Full design: [09-checkin-badges.md](09-checkin-badges.md).

### 2.10.1 Staff scanner
- **Does:** Camera or keyboard-wedge scan → validate → check in.
- **Who:** Check-in staff.
- **Flow:** Login → select event → scan → result (ok / already in / invalid / wrong zone).
- **BE:** Idempotent `CheckIn` write, realtime counter.
- **FE:** PWA, large tap targets, loud success/fail.
- **Horizon:** MVP. **Cx:** L. **Pri:** P0.

### 2.10.2 Manual search check-in
- **Does:** Find attendee by name/phone/email when QR fails.
- **Horizon:** MVP. **Cx:** S. **Pri:** P0.

### 2.10.3 Re-entry
- **Does:** Policy: allow multiple scans or one-time.
- **Horizon:** MVP (flag). **Cx:** S. **Pri:** P1.

### 2.10.4 Offline check-in
- **Does:** Local cache of valid tokens; queue scans; sync.
- **Horizon:** Later. Design the API to allow it. **Cx:** XL. **Pri:** P2.

### 2.10.5 Multiple stations
- **Does:** Concurrent scanners, no double-admit races.
- **Horizon:** MVP (correctness). **Cx:** M. **Pri:** P0.

### 2.10.6 Session check-in
- **Does:** Scan into a session for attendance analytics / CME / F&B.
- **Horizon:** Later. **Cx:** M. **Pri:** P2.

### 2.10.7 Kiosk / turnstile / facial
- **Horizon:** **Integrate / do not build.** Enterprise hardware.

---

## 2.11 Badge Management

### 2.11.1 Badge template
- **Does:** Layout: name, org, role, QR, logo, color by ticket type.
- **Horizon:** Later. **Cx:** L. **Pri:** P2.

### 2.11.2 Print job
- **Does:** Send one badge to a networked printer (Zebra/Brother).
- **3P:** Printer SDK / CUPS / QZ Tray / vendor cloud.
- **Horizon:** Later. **Cx:** L. **Pri:** P2. Software we build: payload. Hardware we don't.

### 2.11.3 Reprint / status
- **Does:** Mark printed, reprint with audit.
- **Horizon:** Later. **Cx:** M. **Pri:** P2.

---

## 2.12 Access Control

### 2.12.1 Access rules
- **Does:** Credential + location + time → allow/deny (VIP lounge, expo hall, staff door).
- **Data:** `AccessRule`, `Zone`.
- **Horizon:** Later (everything is event-gate in MVP). **Cx:** L. **Pri:** P2.

### 2.12.2 Zone footfall
- **Does:** Count ins/outs for density.
- **Horizon:** Later. **Cx:** L. **Pri:** P3.

---

## 2.13 Sessions & Agenda

### 2.13.1 Tracks & sessions
- **Does:** Time-bound sessions with room, capacity, speakers.
- **Horizon:** Phase 5. **Cx:** M. **Pri:** P1.

### 2.13.2 Personalized agenda
- **Does:** Attendee saves sessions.
- **Horizon:** Phase 5–7. **Cx:** M. **Pri:** P2.

### 2.13.3 Session capacity / waitlist
- **Horizon:** Later. **Cx:** M. **Pri:** P2.

---

## 2.14 Speakers

### 2.14.1 Speaker profiles
- **Does:** Name, photo, bio, company, sessions.
- **Who:** Organizer publishes; speaker may later self-edit.
- **Horizon:** Phase 5. **Cx:** S. **Pri:** P1.

### 2.14.2 Speaker portal
- **Does:** Upload slides, travel, availability.
- **Horizon:** Later. **Cx:** M. **Pri:** P3.

---

## 2.15 Exhibitors

Full design: [10-experience-surfaces.md](10-experience-surfaces.md).

### 2.15.1 Exhibitor account & profile
- **Does:** Company, booth, description, staff, products.
- **Horizon:** Phase 6. **Cx:** M. **Pri:** P2.

### 2.15.2 Booth assignment
- **Does:** Map booth code to exhibitor.
- **Horizon:** Phase 6. **Cx:** S. **Pri:** P2.

### 2.15.3 Pass allocation
- **Does:** Organizer grants N exhibitor staff tickets; exhibitor assigns people (IMC-style).
- **Horizon:** Phase 6. **Cx:** M. **Pri:** P2.

### 2.15.4 Lead capture / QR scan
- **Does:** Exhibitor scans attendee credential → `Lead`.
- **Horizon:** Phase 6. **Cx:** M. **Pri:** P2. First expo revenue add-on.

### 2.15.5 Meeting requests
- **Does:** Buyer/exhibitor booking.
- **Horizon:** Phase 6+. **Cx:** L. **Pri:** P3.

---

## 2.16 Sponsors

### 2.16.1 Sponsor tiers & logos
- **Does:** Display on site/app; optional landing URL.
- **Horizon:** Phase 5 (logos on site). **Cx:** S. **Pri:** P1.

### 2.16.2 Sponsor analytics
- **Does:** Impressions, booth visits, leads.
- **Horizon:** Later. **Cx:** M. **Pri:** P3.

---

## 2.17 Networking

### 2.17.1 Networking profile
- **Does:** Interests, industry, role, goals, company, geo — the feature vector for later AI.
- **Horizon:** Phase 6. Collect fields early even if unused. **Cx:** M. **Pri:** P2.

### 2.17.2 Directory + connect
- **Does:** Opt-in attendee list, request/accept connection.
- **Horizon:** Phase 6. **Cx:** M. **Pri:** P2.

### 2.17.3 Digital card / QR exchange
- **Does:** Scan to connect without typing.
- **Horizon:** Phase 6. **Cx:** S. **Pri:** P2.

### 2.17.4 Meetings
- **Does:** Time-boxed 1:1 with status.
- **Horizon:** Phase 6. **Cx:** L. **Pri:** P3.

---

## 2.18 Matchmaking

### 2.18.1 Rule-based matching
- **Does:** Score by overlapping tags / goals / industry.
- **Horizon:** Phase 6. **Cx:** M. **Pri:** P2.

### 2.18.2 AI recommendations
- **Does:** Embeddings / ranking model on the same profile + behavior events.
- **Horizon:** Phase 9+. **Do not build** before data exists. **Cx:** XL. **Pri:** P3.

---

## 2.19 Communication

Full design: [11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md).

### 2.19.1 Communication engine
- **Does:** Trigger + template + audience + channel + delivery log. One system for all messages.
- **Horizon:** MVP (email confirm + reminder). **Cx:** L. **Pri:** P0.

### 2.19.2 Email
- **3P:** Resend or SES.
- **Horizon:** MVP. **Integrate.** **Cx:** M. **Pri:** P0.

### 2.19.3 WhatsApp
- **3P:** Gupshup / Interakt / WATI. Template-message compliance.
- **Horizon:** Phase 4. Apply for BSP early. **Cx:** L. **Pri:** P1. India differentiator.

### 2.19.4 SMS
- **3P:** MSG91. OTP + transactional.
- **Horizon:** OTP MVP. Marketing SMS Later. **Cx:** S. **Pri:** P0 (OTP).

### 2.19.5 Push
- **Deps:** PWA push or native later.
- **Horizon:** Phase 7. **Cx:** M. **Pri:** P2.

### 2.19.6 Trigger library
- Registration confirmed, payment failed, 24h reminder, event start, session start, schedule change, feedback request, waitlist promoted.
- **Horizon:** Confirm + reminder MVP. Rest as triggers are added. **Cx:** M. **Pri:** P0/P1.

---

## 2.20 Event App

### 2.20.1 Responsive attendee site / PWA
- **Does:** Ticket, schedule, speakers, venue, notifications.
- **Horizon:** Ticket page MVP. Full PWA Phase 7. **Cx:** L. **Pri:** P1 then P2.
- **Decision:** No native app first. See [10-experience-surfaces.md](10-experience-surfaces.md).

### 2.20.2 Native iOS / Android
- **Horizon:** **Do not build** until PWA is validated. **Cx:** XL. **Pri:** P3.

---

## 2.21 Virtual / Hybrid / Streaming

### 2.21.1 Webinar / livestream watch page
- **Does:** Authenticated attendees see an embed + chat later.
- **3P:** Mux / Cloudflare Stream / YouTube unlisted / 100ms.
- **Horizon:** Phase 8. **Integrate video. Never build SFU.** **Cx:** L. **Pri:** P2.

### 2.21.2 Video rooms / breakouts
- **3P:** Daily / 100ms / LiveKit Cloud.
- **Horizon:** Phase 8. **Cx:** L. **Pri:** P3.

### 2.21.3 Virtual booths / 3D / metaverse
- **Horizon:** **Do not build.** Dreamcast Mixhub is a custom-services product.

### 2.21.4 Hybrid attendance flag
- **Does:** Same attendee model, `attendance_mode = in_person | virtual | hybrid`.
- **Horizon:** Field in MVP schema. UX Phase 8. **Cx:** S. **Pri:** P2.

---

## 2.22 Lead Capture

Covered under exhibitors. Also usable by sponsors. Same `Lead` entity.

---

## 2.23 Engagement

### 2.23.1 Polls
- **Does:** Live session questions, results.
- **Horizon:** Phase 5/7. **Cx:** M. **Pri:** P2. Could integrate Slido first.

### 2.23.2 Q&A
- **Does:** Moderated questions, upvote.
- **Horizon:** Phase 5/7. **Cx:** M. **Pri:** P2.

### 2.23.3 Surveys
- **Does:** Post-event CSAT / NPS / session feedback.
- **Horizon:** Phase 4–5. **Cx:** M. **Pri:** P1.

### 2.23.4 Gamification / games / photo AI
- **Horizon:** **Do not build.** Dreamcast engagement SKUs. Integrate later if a customer pays.

---

## 2.24 Analytics

Full design: [11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md).

### 2.24.1 Raw event tracking
- **Does:** Append-only `AnalyticsEvent` for page_view, register_start, register_complete, payment_ok, check_in, etc.
- **Horizon:** MVP (write path). **Cx:** M. **Pri:** P0.

### 2.24.2 Organizer dashboard
- **Does:** Registrations, revenue, check-in rate, funnel.
- **Horizon:** MVP numbers. Charts Later. **Cx:** M. **Pri:** P0.

### 2.24.3 Aggregations / warehouse
- **Horizon:** Later (materialized views, then warehouse). **Cx:** L. **Pri:** P2.

---

## 2.25 CRM

### 2.25.1 In-product attendee CRM
- **Does:** Timeline of messages + attendance per person.
- **Horizon:** Later. Attendee list is enough first. **Cx:** L. **Pri:** P2.

### 2.25.2 External CRM sync
- **Does:** HubSpot / Salesforce / Zoho push.
- **Horizon:** Enterprise. **Cx:** L. **Pri:** P3. **Integrate.**

Dreamcast "Event CRM" is mostly WhatsApp automation + attendee DB. Do not invent a Salesforce.

---

## 2.26 Reporting

### 2.26.1 CSV / XLSX exports
- **Does:** Attendees, orders, check-ins.
- **Horizon:** MVP (attendees). **Cx:** S. **Pri:** P0.

### 2.26.2 Scheduled PDF reports
- **Horizon:** Enterprise. **Cx:** M. **Pri:** P3.

---

## 2.27 Integrations

### 2.27.1 Webhooks out
- **Does:** Signed event notifications to customer URLs.
- **Horizon:** Enterprise / Phase 9. **Cx:** M. **Pri:** P3.

### 2.27.2 Public API + API keys
- **Horizon:** Enterprise. **Cx:** L. **Pri:** P3.

### 2.27.3 Zapier / Make
- **Horizon:** Later. Fast way to delay a public API. **Cx:** M. **Pri:** P2.

---

## 2.28 Admin (platform)

### 2.28.1 Platform admin
- **Does:** Support impersonation (audited), kill switches, org lookup.
- **Horizon:** MVP internal (even if crude). **Cx:** M. **Pri:** P1.

### 2.28.2 Abuse / fraud tools
- **Does:** Rate limits, block phones, flag card testing.
- **Horizon:** MVP basics. **Cx:** M. **Pri:** P0.

---

## 2.29 Enterprise

SSO, audit logs, data retention, custom domains, SLA, DPA, advanced RBAC, SCIM, dedicated region. All **Enterprise / Phase 9**. See [11-comms-virtual-analytics-security.md](11-comms-virtual-analytics-security.md).

---

## 2.30 Capability → Eventsliner decision rollup

| Capability | Decision |
|------------|----------|
| User/org/event/registration/ticket/payment/attendee/QR/check-in/email/analytics | **MUST BUILD** |
| WhatsApp orchestration, sessions, speakers, surveys, PWA, promo codes, waitlist, group reg | **SHOULD BUILD** |
| Badges+print, exhibitors, networking, access zones, offline scan, approval/invite | **BUILD LATER** |
| Payments, email/SMS/WhatsApp transport, video, maps, Aadhaar, printers, search hosting | **INTEGRATE** |
| Facial recognition, kiosks, turnstiles, cashless RFID, 3D venues, native apps, AI match, games, photobooths | **DO NOT BUILD** |

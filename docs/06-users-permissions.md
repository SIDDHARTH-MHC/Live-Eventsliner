# 6–7. User types, permission matrix, and journeys

---

## 6.1 User types

Roles are **claims**, not separate products. One human can be an organizer of event A and an attendee of event B.

### Platform admin
- **Sees:** all orgs (support tool), kill switches, provider health.
- **Does:** lock orgs, inspect (audited) registrations for support, rotate secrets.
- **Not in product UI for customers.**

### Organization owner
- **Sees:** billing, team, all events, all money, audit.
- **Does:** delete/close org, transfer ownership, connect Razorpay, set GSTIN.

### Organization admin
- **Sees:** all events, members (not billing if we split later).
- **Does:** create events, invite members. v1: treat as owner-minus-billing.

### Event organizer / Event manager
- **Sees:** one event's configuration, attendees, orders, analytics.
- **Does:** everything on that event except org billing and deleting the org.
- **v1:** org admin *is* event manager for all events. Split when an agency asks.

### Registration manager
- **Sees:** attendees, registrations, form answers, waitlist.
- **Does:** approve, edit attendee fields, resend credential, cancel (refund may require manager).
- **v1:** fold into event manager. Keep the role name in the enum so we can split.

### Check-in staff
- **Sees:** scanner UI, search-by-name, today's counts. **Not** full attendee PII dump, **not** revenue.
- **Does:** scan, manual check-in, maybe walk-in create (if granted).
- **This is the MVP staff role.**

### Volunteer
- **Sees:** same as check-in or narrower (directions-only later).
- **Does:** scan only. No manual override.
- **v1:** alias of check-in with a flag `can_manual_search=false` later.

### Speaker
- **Sees:** own profile, own sessions, attendee-level public schedule.
- **Does:** edit bio (later), upload slides (later).
- **v1:** speakers are content records, not logins.

### Exhibitor admin / exhibitor staff
- **Sees:** exhibitor dashboard, own leads, own booth staff.
- **Does:** assign passes, scan leads, request meetings.
- **Phase 6.**

### Sponsor
- **Sees:** sponsor kit, optional lead/impression metrics.
- **Does:** upload creatives (later).
- **v1:** logo record only.

### Attendee
- **Sees:** public event page, own ticket/QR, later app features.
- **Does:** register, pay, show QR, update own profile if we allow.
- **May not have a User account** (magic-link / QR-only). v1: create a user on register if email/phone given.

### VIP
- **Sees:** same as attendee + VIP session/lounge markers.
- **Does:** nothing extra in software at first. Ticket type encodes access.
- **Not a separate role.** `ticket_type` or `attendee.category = vip`.

### Media
- **Sees:** press kit, media badge category.
- **Does:** register via media ticket or invite.
- **Not a separate RBAC role.**

---

## 6.2 Permission matrix

Actions × roles. `P` = platform admin, `O` = org owner, `A` = org admin, `M` = event manager, `R` = registration manager, `C` = check-in staff, `E` = exhibitor staff, `S` = speaker, `T` = attendee.

| Action | P | O | A | M | R | C | E | S | T |
|--------|---|---|---|---|---|---|---|---|---|
| Create org | | self | | | | | | | |
| Close org / billing | Y | Y | | | | | | | |
| Invite org members | Y | Y | Y | | | | | | |
| Create event | Y | Y | Y | | | | | | |
| Edit event settings | Y | Y | Y | Y | | | | | |
| Publish event | Y | Y | Y | Y | | | | | |
| Edit site | Y | Y | Y | Y | | | | | |
| Manage ticket types | Y | Y | Y | Y | | | | | |
| Connect payments | Y | Y | | | | | | | |
| View orders / revenue | Y | Y | Y | Y | | | | | |
| Refund | Y | Y | Y | Y | | | | | |
| View attendees + PII | Y | Y | Y | Y | Y | limited | own leads | | self |
| Edit attendee | Y | Y | Y | Y | Y | walk-in only | | | self limited |
| Export attendees | Y | Y | Y | Y | Y | | | | |
| Resend credential | Y | Y | Y | Y | Y | | | | self |
| Revoke credential | Y | Y | Y | Y | Y | | | | |
| Check in scan | Y | Y | Y | Y | Y | Y | | | |
| Manual check-in | Y | Y | Y | Y | Y | Y | | | |
| View analytics | Y | Y | Y | Y | counts | counts | own | | |
| Send campaign | Y | Y | Y | Y | | | | | |
| Manage staff | Y | Y | Y | Y | | | | | |
| Impersonate (audited) | Y | | | | | | | | |
| Scan leads | | | | | | | Y | | |
| View others' tickets | | | | | | | | | |

**v1 implemented roles:** Platform admin (internal), Org owner, Event manager (same as owner for that org's events), Check-in staff, Attendee.

VIP / Media / Volunteer are **ticket categories or flags**, not extra auth systems.

---

## 6.3 Implementation notes

- Authorize in one `can(user, action, resource)` helper. No scattered `if (role === ...)`.
- Event staff tokens should work on a phone with bad wifi: short-lived session + refresh.
- Check-in UI must fail closed if the role is missing, not fail open because the event id is in the URL.
- Exports are an audit event.

---

## 7. User journeys

### 7.1 Organizer (core revenue journey)

```
Create account (email or phone)
  → Create organization (name, country, GSTIN later)
  → Create event (type, title, date, timezone, venue, capacity)
  → Configure event (cover, description, brand color)
  → Create registration form (name, email, phone, terms; extra fields)
  → Create ticket types (Free / Paid / RSVP)
  → Configure payments (Razorpay connect) if any price > 0
  → Preview public page
  → Publish
  → Share URL
  → Manage attendees (search, resend, cancel)
  → Send communications (auto confirm; manual blast later)
  → Event day: open live dashboard + staff check-in
  → Check-in happens
  → Analyze (registered vs checked-in, revenue)
  → Export CSV / complete event
```

**Failure paths to design, not just the happy path**

- Razorpay not connected and they add a paid ticket → block publish of paid SKUs
- Publish with zero tickets → allow RSVP-only if a free/RSVP type exists
- Unpublish after sales → page shows cancelled/closed; existing tickets remain valid unless cancelled
- Refund → credential revoked → if already checked in, flag exception

### 7.2 Attendee

```
Discover event (link, QR poster, WhatsApp, later SEO)
  → Event page
  → Select ticket
  → Register (fields + consent)
  → Pay if needed (UPI / card)
  → Confirmation screen + email
  → QR credential ("Your ticket" page, add to phone)
  → Reminder T-24h
  → Arrive
  → Present QR (or name + phone)
  → Check-in
  → Attend (later: sessions, networking)
  → Feedback (later)
  → Post-event email (later)
```

**Failure paths**

- Payment success webhook delayed → "we're confirming" page + poll + email when done. Never tell them they failed if Razorpay succeeded.
- Lost email → retrieve by phone OTP
- Dead phone at gate → manual search
- Duplicate registration → show existing ticket

### 7.3 Event staff (check-in)

```
Receive invite SMS/email
  → Login phone OTP
  → See assigned events
  → Enter Check-in mode (kiosk-ish, bright, loud)
  → Scan QR  or  Search name/phone
  → System verifies credential + event + status
  → Grant: big green + name + ticket type
  → Deny: big red + reason (already in / invalid / cancelled)
  → Optional: undo within N seconds (audit)
```

Staff must be able to do this in sunlight, with gloves, with one hand, on a ₹10k Android phone.

### 7.4 Speaker (later)

```
Organizer adds speaker
  → Optional invite to claim profile
  → Speaker uploads photo/bio/slides
  → Appears on site/app
  → Event day: speaker badge category, session check-in optional
  → Post-event: download Q&A
```

v1: organizer-only CMS. No speaker login.

### 7.5 Exhibitor (later)

```
Organizer creates exhibitor + booth + pass quota
  → Exhibitor admin invited
  → Completes profile / products
  → Assigns staff passes (creates attendees)
  → Staff receive QR
  → On-site: staff scan visitor QR → Lead
  → Request/accept meetings
  → Export leads
  → See booth traffic analytics
```

### 7.6 Sponsor (later)

```
Organizer adds sponsor tier + asset
  → Logo on site
  → Optional landing URL
  → Optional promo code
  → After event: impression / click / lead report
```

v1: organizer uploads logo. No sponsor login.

### 7.7 VIP

```
Same as attendee
  → Ticket type VIP (hidden or public)
  → Credential encodes category
  → Check-in shows gold treatment + optional lounge access (later AccessRule)
  → Badge color (later)
```

No special app. Special ticket.

### 7.8 Virtual attendee (later)

```
Register (ticket may be cheaper)
  → Attendee.attendance_mode = virtual
  → No gate check-in
  → Authenticated stream page at start time
  → Watched-minutes analytics from player events
  → Same comms engine (reminder = "starts in 1 hour, here's the link")
```

### 7.9 Hybrid attendee (later)

```
Register with mode picker or two ticket types
  → If in-person: QR + gate
  → If virtual: stream
  → If they switch: organizer or self-service policy
  → One attendee id, two possible presence facts
```

Do not create `HybridAttendee`. Mode is a field.

### 7.10 Walk-in (later, but design the attendee model for it)

```
Staff: "New attendee"
  → Short form
  → Collect payment (or comp)
  → Issue credential
  → Immediate check-in
```

This is why Attendee can be created without a prior public Registration URL visit.

---

## 7.11 Journey × MVP coverage

| Journey | MVP | Notes |
|---------|-----|-------|
| Organizer create → publish → export | Yes | Payments if paid |
| Attendee register → QR → email | Yes | WhatsApp later |
| Staff scan / search | Yes | Online only |
| Speaker self-serve | No | CMS only |
| Exhibitor / sponsor portals | No | Logos optional on template |
| VIP as ticket type | Yes | No lounge engine |
| Virtual / hybrid | Schema only | |
| Walk-in | Manual add attendee nice-to-have | Full desk later |

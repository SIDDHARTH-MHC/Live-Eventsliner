# 4. Core platform and dependency graph

Do not treat Dreamcast features — or Luma discovery — as independent products. Almost all of them are views on a small number of engines. **Event is the canonical object. Discovery, event website, and event app are interfaces on that object, not separate products.**

**Every published public event is both an event website and a potential discovery object. Eventsliner.live must treat event discovery as a first-class platform capability, while allowing organizers to opt out through visibility settings.**

Canonical product write-up: [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md).

---

## 4.1 Foundational systems (what we actually need)

| System | Job | v1 shape |
|--------|-----|----------|
| **User identity** | Durable person. Email and/or phone. | Single `users` table + auth |
| **Organizations** | Tenant / billing / brand owner | `organizations` + `memberships` |
| **Event entity** | Root aggregate. Type is a field. Visibility is a field. | `events` |
| **Event types** | Defaults and module flags, not schemas | Enum + `modules` JSON |
| **Event Experience** | Branded website + later PWA/app config. v1 table `event_sites`. | `event_sites` now; later `event_experience` / `event_app_config` |
| **Discoverability** | Whether a published Event is marketplace inventory | Rule: `status=published` AND `visibility=public`. Not a second listing table. Built as APIs/UI in **Phase 4**, modeled **now**. |
| **Roles & permissions** | Org-wide and event-scoped | `memberships.role`, `event_staff.role` |
| **Registration engine** | State machine: draft → pending_payment → pending_approval → confirmed → cancelled | `registrations` |
| **Ticket engine** | SKUs + inventory + holds | `ticket_types`, `inventory_holds` |
| **Payment engine** | Provider-agnostic order/payment/refund | `orders`, `payments`, `refunds` |
| **Attendee database** | Person-at-event operational record | `attendees` |
| **Credential engine** | Revocable proof of access | `credentials` |
| **QR identity** | Encoding of a credential, not a separate product | Field + renderer |
| **Check-in engine** | Validate + write attendance | `check_ins` |
| **Session engine** | Time-boxed content units | Tables in Phase 6 |
| **Communication engine** | Trigger → template → channel → log | `messages`, `templates` |
| **Notification transport** | Email/SMS/WA/push adapters | Integrations |
| **Content management** | Event Experience sections, speaker/sponsor copy | `event_sites`, `contents` |
| **Media management** | Images, files, future recordings | `media` + object storage |
| **Discovery / search (public)** | Keyword, city, date, category, price, type; browse rails | **Phase 4.** Postgres first → Typesense if needed. No recommendation AI initially. |
| **Organizer public profile** | Discovery identity for the host | Fields on `organizations` + public projection. Phase 4. |
| **Networking graph** | Profiles, edges, meetings | Phase 6 |
| **Analytics / event tracking** | Append-only facts | `analytics_events` |
| **Search (ops)** | Attendee lookup | Postgres ILIKE → Typesense |
| **Audit logs** | Who did what | `audit_logs` (staff actions from day one) |
| **Billing (platform)** | How Eventsliner charges organizers | Decide; keep off the ticket path if SaaS-sub |
| **API layer** | HTTP + webhooks | REST in one Next.js app |
| **Integration layer** | Provider adapters | `integrations` + webhook inbox |

Systems we do **not** need as platforms in v1: search cluster, CDP, ML feature store, media transcoding, separate "CRM product," device management, badge OS, a separate "marketplace service" with its own Event clone.

Discovery is a **foundational system** in this table because the flywheel depends on it. It is **not** an MVP build. First 20 tasks do not implement `/discover`.

---

## 4.2 The spine

This is the only dependency chain that must be true on day one:

```
Organization
  └── Event
        ├── visibility (public | unlisted | private)
        ├── EventExperience / EventSite (public page at /e/:slug)
        ├── TicketType(s)
        ├── RegistrationForm
        └── Registration
              ├── Order ── Payment
              └── Attendee
                    └── Credential (QR)
                          └── CheckIn
                                └── Attendance fact
                                      └── AnalyticsEvent
```

**Discoverability (same Event, later interface):**

```
Event
  → published
    → if PUBLIC  → discovery object (index, /discover, event card, organizer profile)
    → if UNLISTED → website by link only
    → if PRIVATE  → invite/permission only
```

Do not invert this: `/e/:slug` is the event website (Phase 1). Discovery consumes published PUBLIC events (Phase 4). Both are interfaces on Event.

Communication hangs off the same transitions:

```
Registration.confirmed → Message(confirmation)
Event.starts_at - 24h  → Message(reminder)
CheckIn.created        → AnalyticsEvent + optional Message
Event.completed        → Message(feedback)   [later]
```

---

## 4.3 Full dependency graph

```
User ─────────────────────────────────────────────┐
  │                                               │
  ├── Membership ── Organization ── Event         │
  │                     │           │             │
  │                     │           ├── Venue     │
  │                     │           ├── EventSite │  (Experience; website + later app)
  │                     │           ├── TicketType
  │                     │           ├── FormSchema
  │                     │           ├── Session*  │
  │                     │           ├── Speaker*  │
  │                     │           ├── Exhibitor*
  │                     │           └── Staff     │
  │                     │                         │
  │                     └── public profile* ──────┼── Discovery* (published + PUBLIC)
  │                                               │
  └── (optional link) ── Attendee ────────────────┘
                              │
                              ├── Registration
                              │     └── Order
                              │           └── Payment
                              │           └── Invoice
                              │
                              ├── Credential
                              │     └── CheckIn ── AccessRule*
                              │
                              ├── Lead* (as visitor)
                              ├── Connection* / Meeting*
                              └── SurveyResponse*

* = not MVP. Discovery* = Phase 4 (modeled now; not first 20).

AnalyticsEvent listens to all writes above.
Message listens to selected domain events.
AuditLog listens to privileged writes.
```

### Critical chains (make these explicit in code as domain events)

**Registration → money → access**

```
Registration
  → Attendee
  → Ticket assignment (inventory)
  → Order
  → Payment
  → Credential
  → QR
  → CheckIn
  → Attendance
  → Analytics
```

**Staff path (walk-in, later)**

```
Staff action
  → Registration (source=onsite)
  → Attendee
  → Payment? 
  → Credential
  → CheckIn
```

**Exhibitor lead (later)**

```
Attendee.Credential
  → scanned by ExhibitorStaff
  → Lead
  → Analytics
  → (optional) CRM webhook
```

**Networking (later)**

```
Attendee
  → NetworkingProfile
  → Connection / Meeting
  → Analytics
```

**Session attendance (later)**

```
Credential
  → SessionCheckIn
  → SessionAttendance
  → Analytics
```

**Discoverability (Phase 4 — same graph, new interface)**

```
Event.published + Event.visibility=public
  → Discovery index
  → GET /public/discover (search, browse, city)
  → Event card → /e/:slug
  → Organization public profile
```

If a feature cannot attach to this graph, it is probably a separate product (cashless wallets, photobooths, venue sourcing). A "listing" that is not an Event is a separate product — do not build it.

---

## 4.4 Event type must not fork the graph

| Type | Modules on | Modules off by default |
|------|------------|------------------------|
| Meetup | Site, RSVP/free, QR, check-in, email | Tickets paid optional, exhibitors off |
| Workshop | Site, paid/free, capacity, check-in | Exhibitors off |
| Conference | Site, paid, multi ticket, speakers*, sessions* | Exhibitors optional |
| Exhibition | Site, categories, exhibitors*, leads* | Sessions optional |
| Festival | Site, paid, check-in | Sessions light; cashless never ours |
| Corporate | Invite/approval*, RSVP, check-in | Public discovery off by default (visibility unlisted/private) |
| Sports | Tickets, check-in | Speakers off |
| Webinar | Site, registration, `attendance_mode=virtual` | Check-in off; stream 3P |
| Hybrid | All of conference + `attendance_mode` | Stream 3P |

Same tables. Feature flags / `event.modules`.

---

## 4.5 Modular monolith map

One deployable. Folders are modules with enforced imports (lint/boundaries), not networks.

```
apps/web (Next.js)
  modules/
    identity/
    orgs/
    events/
    sites/          # Event Experience (v1: event_sites)
    registration/
    ticketing/
    payments/
    attendees/
    credentials/
    checkin/
    communications/
    analytics/
    audit/
    media/
    # later: discovery (Phase 4), sessions, speakers, exhibitors, networking, badges
```

**Rule:** `payments` may not import `checkin`. Both import `attendees` only through domain events or a thin application service. Start pragmatic; tighten boundaries when the first accidental coupling appears.

**Do not** start with:

- event-service, registration-service, check-in-service as separate repos
- a message bus "because scale"
- per-event-type databases

Add Redis + a queue in v1 (they are infrastructure, not microservices). Split a module out only when it has an independent scale or compliance reason (almost never before 10× load).

---

## 4.6 What "scale to large events" actually means

| Load | What breaks first | Design now, implement when needed |
|------|-------------------|-----------------------------------|
| 200 attendees | Nothing if you can take payments | — |
| 2,000 attendees, 4 gates | Check-in write contention, staff UX | Idempotent check-in, indexed credential lookup |
| 20,000 attendees | QR validation latency, wifi | Offline queue, edge cache of bloom/allow-list |
| 200,000 attendees | Everything + hardware + humans | You are now Dreamcast; don't pretend otherwise |

v1 targets **correctness at 2,000** and a model that does not forbid 20,000.

Concrete design choices that keep the door open:

- Credential lookup by `public_id` (indexed), never by scanning a fat JWT that must be decrypted slowly
- Check-in unique constraint `(credential_id, location_id)` or `(credential_id)` depending on re-entry policy
- Analytics as append-only, never "update a counter row" as the only source of truth (counters can be cached)
- Inventory held in a transaction, not `quantity - 1` in the app without a lock
- All public pages cacheable; all check-in routes not

---

## 4.7 Domain events (application-level)

Emit these internally from day one (in-process bus is enough):

| Event | Consumers |
|-------|-----------|
| `org.created` | Analytics |
| `event.published` | Analytics; **if visibility=public, discovery index (Phase 4 consumer)** |
| `registration.started` | Analytics (funnel) |
| `registration.confirmed` | Credential issue, confirmation message, analytics |
| `registration.cancelled` | Revoke credential, inventory, analytics |
| `payment.succeeded` | Confirm registration |
| `payment.failed` | Message, analytics |
| `payment.refunded` | Cancel path |
| `credential.issued` | Render QR, message |
| `checkin.recorded` | Analytics, live counter |
| `staff.invited` | Message |

This is how communication stays a platform rather than `sendEmail()` sprinkled in route handlers.

# 17–20. Communication, analytics, enterprise, security

Virtual/hybrid build-vs-buy is in [10-experience-surfaces.md](10-experience-surfaces.md). This document covers the remaining platform engines.

---

## 17. Communication system

### 17.1 Principle

One engine. Features emit **domain events**. The engine maps events → templates → channels → deliveries. No `sendWhatsApp()` inside the registration controller.

```
Domain event
  → CommunicationPolicy (event_id, trigger, enabled, channels[])
  → Template render (variables)
  → Consent check (channel)
  → Enqueue Message
  → Provider adapter
  → Update Message status (webhook)
```

### 17.2 Channels

| Channel | v1 | Provider |
|---------|----|----------|
| Email | **Yes** | Resend or SES |
| SMS | OTP yes; tickets no (cost) | MSG91 |
| WhatsApp | Phase 5 | Gupshup or Interakt |
| Push | Phase 5 | Web Push |
| In-app inbox | Later | Own |

### 17.3 Trigger catalog

| Trigger | MVP | Template vars |
|---------|-----|----------------|
| `registration.confirmed` | **Yes** | name, event, when, venue, ticket_url, qr |
| `payment.failed` | Yes | retry_url |
| `registration.cancelled` | Yes | |
| `reminder.24h` | **Yes** | same + directions |
| `reminder.1h` | Later | |
| `event.published` (org) | Later | |
| `session.starting` | Phase 6 | |
| `schedule.changed` | Phase 6 | |
| `event.completed` / feedback | Phase 5 | survey_url |
| `waitlist.promoted` | When waitlist exists | |
| `staff.invited` | Yes | login_url |
| Campaign blast | Phase 5 | audience query |

Reminders: a scheduled job `SELECT events WHERE starts_at BETWEEN now+23h AND now+25h` and attendees confirmed not yet reminded. Store `Message` to be idempotent.

### 17.4 Templates

Platform defaults + per-event override. Variables in `{{attendee.first_name}}` style. Escape HTML.

WhatsApp requires **pre-approved templates** at Meta. Design trigger copy to fit template constraints. Start BSP application during Phase 1 even if we send only email — approval takes weeks.

### 17.5 Consent & DPDP

- Transactional (ticket, OTP, reminder of an event they registered for): allowed
- Promotional: explicit opt-in, stored on `ConsentRecord`
- WhatsApp: extra opt-in checkbox on the form
- Unsubscribe link on marketing email
- Do not buy lists

### 17.6 Deliverability

- SPF/DKIM/DMARC on the sending domain
- Prefer sending as `updates@eventsliner.live` first; custom domain later
- Bounce handling: suppress address
- Never send from a developer's Gmail

---

## 18. Analytics

Analytics is not a dashboard someone adds in Phase 9. It is an **append-only log** written from day one.

### 18.1 Raw events (minimum set)

| Name | When |
|------|------|
| `page_view` | Public event page |
| `register_start` | Form opened |
| `register_submit` | Form posted |
| `register_complete` | Confirmed |
| `register_abandon` | inferred or checkout leave |
| `payment_succeeded` / `failed` | |
| `ticket_view` | Attendee opens QR |
| `checkin_ok` / `already` / `deny` | |
| `email_sent` / `failed` | |
| `export_ran` | Audit-ish |

Later: `session_attend`, `lead_captured`, `connect_request`, `stream_minute`, `survey_submitted`.

### 18.2 Properties

`event_id`, `org_id`, `attendee_id?`, `ticket_type_id?`, `utm_*`, `source`, `attendance_mode`. No raw PAN, no full answers, IP hashed.

### 18.3 Aggregations

v1: SQL at read time.

```
registrations, confirmed, cancelled
revenue_cents
checkins / confirmed = attendance rate
funnel: view → start → submit → paid
checkin histogram by hour
```

Materialized view per event if it gets slow. Warehouse later.

### 18.4 Dashboards

Organizer home for an event:

- Big numbers: registered, checked in, revenue
- Funnel
- Ticket type breakdown
- (Later) session heat, exhibitor leads, message delivery

Empty state: "Publish and share your link — numbers will show up here."
Loading: skeletons.
Error: retry.

### 18.5 Reports & exports

CSV: attendees, orders, check-ins. Phase 1 attendees is enough.

Do not build a pixel-perfect PDF report builder in v1.

### 18.6 Product analytics vs event analytics

Use the same table or a parallel `product_analytics` for Eventsliner's own SaaS funnel (org created, event published). Don't mix blindly; prefix names `product.*` vs `event.*`.

Third-party: PostHog is acceptable for **our** product analytics. Customer-facing event analytics should be first-party so we are not blocked by a vendor on event day.

---

## 19. Enterprise functionality (not MVP)

| Capability | Why enterprises ask | Phase |
|------------|---------------------|-------|
| Multiple orgs / user | Agencies | 5–9 |
| Multiple events | Already in v1 model | 1 |
| Multiple staff + fine RBAC | Agencies, associations | 5 |
| SSO (SAML/OIDC) | IT | 9 — WorkOS |
| Audit logs | Compliance | Write in v1; UI in 9 |
| Custom domains | Brand | 9 |
| Public API + API keys | Integrations | 9 |
| Webhooks out | Salesforce etc. | 9 |
| Data export (full) | Exit, legal | 5 (CSV is a start) |
| Enterprise billing / contracts | Procurement | 9 |
| SLA (uptime, support hours) | Legal | Business, not code |
| Security questionnaire / SOC2 path | Procurement | Process + the security section |
| Data retention / deletion jobs | DPDP | 9, design now |
| DPA / data residency India | Legal | Region choice in v1 |
| SCIM | Huge IT | After SSO |

**MVP enterprise posture:** India region, encrypted in transit, audit log table, export CSV, no "we sell your attendees." That is already a Dreamcast-shaped promise without SSO.

---

## 20. Security architecture

This platform will hold **attendee PII** and **payment metadata**. Security is not a phase.

### 20.1 Authentication

- OTP rate limits; lock phone after N failures
- Session rotation on privilege change
- Optional password with Argon2id if we add passwords
- 2FA for org owners before they can export or refund (soon after MVP; worth doing early)

### 20.2 Authorization / RBAC

- Default deny
- Event-scoped staff
- Check-in role cannot export
- Platform impersonation always audited + time-boxed

### 20.3 Session management

- Server-side session store (Redis or DB)
- Absolute and idle timeouts (staff shorter)
- Logout all devices on owner request

### 20.4 API security

- CSRF on cookie session mutations
- CORS allowlist
- Payload size limits
- Webhook signature verification
- No GraphQL introspection in prod
- Rate limits (see architecture)

### 20.5 Payment security

- PCI: hosted checkout only
- No card data in logs
- Idempotent refunds
- Confirm only from provider source of truth

### 20.6 Personal data / DPDP / privacy

- Lawful purpose + consent records
- Privacy policy and terms before launch
- Attendee data access scoped
- Organizer DPA later
- Do not train public models on attendee PII
- India residency for prod DB

### 20.7 Encryption

- TLS everywhere
- Postgres at rest (managed)
- Secrets in a secret manager, not `.env` in the image
- Credential secrets hashed
- Backup encryption

### 20.8 Audit logging

Log: login fail, role change, refund, export, credential revoke, impersonation, payment setting change, mass message.

### 20.9 Abuse prevention

- OTP / register rate limits
- Captcha on public register if abused (Turnstile)
- Ticket card-testing: velocity on failed payments
- Staff invite only by known roles

### 20.10 Data deletion

- Attendee deletion request → anonymize PII, keep non-identifying aggregates
- Org closure → retention window then wipe
- Backups expire on a schedule (document the lag)

### 20.11 Backups & secrets

- PITR, tested restore
- Separate prod/staging credentials
- Rotate Razorpay/webhook secrets

### 20.12 Admin security

- Platform admin on a different path + hardware 2FA
- No production access from personal laptops without SSO later
- Break-glass documented

### 20.13 Threats to take seriously on event day

- Staff phone stolen → revoke session
- QR screenshot shared → live validate + optional photo match later (not FR)
- Enumerator guessing ticket URLs → unguessable ids
- Competitor scraping attendee lists → never public
- Webhook replay → idempotency

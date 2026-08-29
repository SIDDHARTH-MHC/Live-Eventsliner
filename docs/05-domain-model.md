# 5. Domain and data model

Storage default: **PostgreSQL** for all transactional entities. JSONB for form schemas, form answers, and module flags. **Object storage** for media. **Redis** for sessions, OTP, inventory holds, rate limits. **Append-only Postgres table** for analytics in v1 (move hot analytics later if needed).

Do not introduce Mongo, Neo4j, or a warehouse in v1. Networking "graph" is two tables (`profiles`, `connections`). Search is Postgres until it hurts.

Tenant rule: almost every row has `org_id` and/or `event_id`. Queries always filter by tenant. Never rely on the application "remembering."

---

## 5.1 Entity set (what is actually necessary)

### Keep for v1

`User`, `Organization`, `Membership`, `Event`, `Venue` (can be columns on Event at first, promote when multi-venue appears), `EventSite`, `TicketType`, `InventoryHold`, `Registration`, `Attendee`, `Order`, `Payment`, `Refund`, `Coupon` (table now, UI later — optional), `Credential`, `CheckIn`, `Message`, `MessageTemplate`, `Media`, `AnalyticsEvent`, `AuditLog`, `EventStaff`, `ConsentRecord`.

`Invoice` — include if we charge INR. Minimum viable: store Razorpay payment id + tax snapshot; PDF can wait one sprint after first paid event.

### Promote from fields to tables when needed

`EventDate`, `Track`, `Session`, `Speaker`, `Sponsor`, `Exhibitor`, `Booth`, `Lead`, `Meeting`, `Connection`, `NetworkingProfile`, `AccessRule`, `Zone`, `BadgeTemplate`, `BadgePrint`, `Device`, `Survey`, `Poll`, `Question`, `Answer`, `Stream`, `Recording`, `ApiKey`, `Webhook`, `Invitation`.

### Drop or delay from the suggested list

| Suggested | Verdict |
|-----------|---------|
| `QRCode` as its own entity | No. Encoding of `Credential`. |
| `Staff` | Use `User` + `EventStaff`. |
| `Communication` | Use `Message`. |
| `EventActivity` | Use `AnalyticsEvent` + `AuditLog`. |
| `Device` | Only when hardware exists. |
| `Question`/`Answer` as first-class for registration | Form schema JSON + answers JSON until surveys need querying. |

---

## 5.2 Entity definitions

### User

- **Purpose:** Login identity. May or may not be an attendee.
- **Fields:** `id`, `email` (nullable unique), `phone` (nullable unique), `email_verified_at`, `phone_verified_at`, `name`, `avatar_media_id`, `locale`, `timezone`, `status`, `created_at`, `updated_at`.
- **Relationships:** memberships, event_staff, optional attendees.
- **Ownership:** self. Platform admin can lock.
- **Lifecycle:** active → disabled → deleted (anonymize).
- **Permissions:** self-read/write profile.
- **Storage:** relational.
- **Indexes:** unique email, unique phone, `(status)`.
- **Constraints:** at least one of email or phone; E.164 phones.

### Organization

- **Purpose:** Tenant. Owns events and branding. Billing customer.
- **Fields:** `id`, `name`, `slug` unique, `logo_media_id`, `primary_color`, `support_email`, `support_phone`, `gstin`, `billing_address` JSONB, `country`, `timezone`, `status`, `created_at`.
- **Relationships:** memberships, events, later API keys.
- **Ownership:** org owner role.
- **Lifecycle:** trial → active → suspended → closed.
- **Permissions:** members by role.
- **Indexes:** unique slug.
- **Constraints:** slug `[a-z0-9-]`.

### Membership

- **Purpose:** User ↔ org with a role.
- **Fields:** `id`, `org_id`, `user_id`, `role` (`owner` \| `admin` \| `member`), `invited_by`, `accepted_at`, `created_at`.
- **Indexes:** unique `(org_id, user_id)`, `(user_id)`.
- **Constraints:** exactly one `owner` recommended (enforce in app first).

### Event

- **Purpose:** Root aggregate for one happening.
- **Fields:** `id`, `org_id`, `title`, `slug` (unique per org; globally unique public slug recommended), `type` enum, `status` (`draft` \| `published` \| `cancelled` \| `completed` \| `archived`), `visibility` (`public` \| `unlisted` \| `private`), `description`, `timezone`, `starts_at`, `ends_at`, `venue_id` nullable, `capacity` nullable, `currency` default `INR`, `modules` JSONB, `attendance_modes` (`in_person` \| `virtual` \| `hybrid`), `cover_media_id`, `created_by`, `published_at`, `created_at`, `updated_at`.
- **Relationships:** org, ticket_types, registrations, attendees, site, staff.
- **Ownership:** org.
- **Lifecycle:** see status. Published events with payments cannot hard-delete.
- **Permissions:** org admin+ configure; public read if published+public.
- **Indexes:** `(org_id, starts_at)`, unique `public_slug`, `(status, starts_at)`, `(org_id, slug)`.
- **Constraints:** `ends_at >= starts_at`; slug unique.

### Venue

- **Purpose:** Physical place. Reusable later across events.
- **Fields:** `id`, `org_id`, `name`, `address_line1`, `city`, `state`, `postal_code`, `country`, `lat`, `lng`, `notes`, `map_url`.
- **v1 shortcut:** nullable columns on `Event` until a second venue appears. Promote without changing public API.
- **Indexes:** `(org_id)`.

### EventSite

- **Purpose:** Configurable public page.
- **Fields:** `id`, `event_id` unique, `template_id`, `theme` JSONB (colors, logo), `sections` JSONB (ordered list of `{type, visible, data}`), `seo` JSONB, `custom_domain` nullable later, `published_version`.
- **Ownership:** event.
- **Lifecycle:** always exists (created with event).
- **Storage:** relational + JSONB. Not a CMS product.
- **Indexes:** `event_id`.

### TicketType

- **Purpose:** Inventory SKU.
- **Fields:** `id`, `event_id`, `name`, `description`, `price_cents`, `currency`, `quantity` nullable (null = unlimited), `sold_count` (denormalized, reconcile from orders), `sales_starts_at`, `sales_ends_at`, `visibility` (`public` \| `hidden`), `access_code` nullable, `sort_order`, `is_active`, `metadata` JSONB.
- **Relationships:** event; referenced by order items / registrations.
- **Lifecycle:** active → archived (never delete if sold).
- **Indexes:** `(event_id, sort_order)`.
- **Constraints:** `price_cents >= 0`; `sold_count <= quantity` when quantity set.

### InventoryHold

- **Purpose:** Temporary reservation during checkout.
- **Fields:** `id`, `ticket_type_id`, `qty`, `expires_at`, `order_id` nullable, `session_id`.
- **Storage:** Redis preferred for TTL; Postgres also fine with a sweeper.
- **Indexes:** `(ticket_type_id)`, `(expires_at)`.

### Registration

- **Purpose:** Intent + workflow instance to attend.
- **Fields:** `id`, `event_id`, `org_id`, `attendee_id` nullable until created, `ticket_type_id`, `status` (`started` \| `pending_payment` \| `pending_approval` \| `confirmed` \| `waitlisted` \| `rejected` \| `cancelled` \| `expired`), `source` (`web` \| `import` \| `onsite` \| `invite`), `answers` JSONB, `consent_ids`, `order_id` nullable, `utm` JSONB, `started_at`, `confirmed_at`, `cancelled_at`.
- **Ownership:** event/org. Attendee can read own.
- **Lifecycle:** state machine (see registration doc). Terminal: confirmed, rejected, cancelled, expired.
- **Indexes:** `(event_id, status)`, `(event_id, created_at)`, `(order_id)`.
- **Constraints:** one open registration per (event, email/phone) per policy.

### Attendee

- **Purpose:** Operational person at this event. Badge, check-in, communications target.
- **Fields:** `id`, `event_id`, `org_id`, `user_id` nullable, `registration_id`, `ticket_type_id`, `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `photo_media_id`, `category` (denormalized ticket name / role), `status` (`registered` \| `checked_in` \| `no_show` \| `cancelled`), `attendance_mode`, `answers` JSONB, `created_at`.
- **Relationships:** credential, check_ins, later leads/connections.
- **Ownership:** org. Attendee can view own ticket.
- **Lifecycle:** created on confirm (or on submit for free). Cancelled on refund.
- **Indexes:** `(event_id, email)`, `(event_id, phone)`, `(event_id, last_name)`, `(event_id, status)`, unique `(event_id, email)` optional by policy.
- **Constraints:** email or phone required.

**Why Attendee ≠ User ≠ Registration:** a User logs in; a Registration is a workflow; an Attendee is who shows up on the list and at the gate. Collapsing them makes walk-ins, imports, plus-ones, and speakers-who-don't-register painful.

### Order

- **Purpose:** Commerce document. One payment attempt series.
- **Fields:** `id`, `event_id`, `org_id`, `buyer_email`, `buyer_phone`, `buyer_name`, `status` (`created` \| `pending` \| `paid` \| `failed` \| `refunded` \| `partially_refunded` \| `expired`), `subtotal_cents`, `discount_cents`, `tax_cents`, `fee_cents`, `total_cents`, `currency`, `coupon_id`, `provider` (`razorpay`), `provider_order_id`, `expires_at`, `paid_at`.
- **Relationships:** items (ticket_type, qty, attendee snapshots), payments, refunds.
- **Indexes:** `(event_id, status)`, unique `provider_order_id`.
- **Constraints:** money in integer cents.

### Payment

- **Purpose:** One provider attempt.
- **Fields:** `id`, `order_id`, `provider`, `provider_payment_id`, `status`, `amount_cents`, `method` (upi/card/netbanking), `raw_last_payload` JSONB (trimmed), `created_at`.
- **Indexes:** unique `provider_payment_id`.
- **Sec:** never store card PAN/CVV.

### Refund

- **Fields:** `id`, `order_id`, `payment_id`, `amount_cents`, `reason`, `status`, `provider_refund_id`, `created_by`, `created_at`.

### Invoice (minimal)

- **Fields:** `id`, `order_id`, `org_id`, `number`, `gstin_seller`, `gstin_buyer`, `line_items` JSONB, `tax_breakup` JSONB, `pdf_media_id`, `issued_at`.
- **Lifecycle:** issued on paid. Credit note on refund (later).

### Coupon / PromoCode

- **Fields:** `id`, `event_id`, `code`, `type` (`percent` \| `fixed`), `value`, `max_redemptions`, `redeemed`, `min_order_cents`, `ticket_type_ids`, `starts_at`, `ends_at`, `active`.
- **Indexes:** unique `(event_id, lower(code))`.
- **Horizon:** table can exist; UI later.

### Credential

- **Purpose:** Revocable access token for an attendee.
- **Fields:** `id`, `attendee_id` unique (v1: one active), `event_id`, `public_id` (short, printed in QR), `secret_hash`, `kind` (`qr` \| `barcode` \| `nfc` later), `status` (`active` \| `revoked` \| `expired` \| `superseded`), `issued_at`, `revoked_at`, `revoke_reason`.
- **Ownership:** system-issued; org can revoke.
- **Lifecycle:** issued on confirm; revoke on cancel/transfer; reissue new row.
- **Indexes:** unique `public_id`, `(event_id, status)`, `attendee_id`.
- **Constraints:** `public_id` high-entropy (128-bit) or signed. **No PII in QR.**
- **Storage:** relational. QR image is derived, cacheable in object storage.

### CheckIn

- **Purpose:** A successful (or failed, if you log attempts) validation event.
- **Fields:** `id`, `event_id`, `attendee_id`, `credential_id`, `location` (`gate` \| `session` later), `location_id` nullable, `station_id` nullable, `staff_user_id`, `result` (`ok` \| `already` \| `invalid` \| `revoked` \| `wrong_event` \| `denied`), `offline_id` nullable, `scanned_at`, `synced_at`.
- **Ownership:** event.
- **Lifecycle:** immutable after write. Corrections = new row + staff audit.
- **Indexes:** `(event_id, scanned_at)`, `(attendee_id)`, `(credential_id, location_id)`, unique partial index for one-time entry: unique `(credential_id) WHERE result='ok' AND location='gate'` when re-entry is off.
- **Permissions:** check-in staff create; organizers read.

### AccessRule (later)

- **Fields:** `id`, `event_id`, `zone_id`, `ticket_type_ids`, `role_allow`, `starts_at`, `ends_at`.
- **v1:** implicit rule "any active credential for this event at location=gate."

### EventStaff

- **Purpose:** Event-scoped RBAC.
- **Fields:** `id`, `event_id`, `user_id`, `role` (`manager` \| `registration` \| `checkin` \| `scanner`), `created_by`, `created_at`.
- **Indexes:** unique `(event_id, user_id)`.

### MessageTemplate

- **Fields:** `id`, `org_id` nullable (platform defaults), `event_id` nullable, `key` (`registration_confirmed`, `reminder_24h`, …), `channel`, `subject`, `body`, `wa_template_name` nullable.

### Message

- **Purpose:** One outbound communication.
- **Fields:** `id`, `event_id`, `attendee_id` nullable, `user_id` nullable, `channel`, `template_key`, `to_address`, `status` (`queued` \| `sent` \| `delivered` \| `failed` \| `skipped`), `provider_id`, `error`, `payload` JSONB, `created_at`.
- **Indexes:** `(event_id, created_at)`, `(attendee_id)`, `(status)`.
- **Storage:** relational. High volume later → separate table / cold storage.

### Media

- **Fields:** `id`, `org_id`, `event_id` nullable, `kind`, `storage_key`, `mime`, `bytes`, `width`, `height`, `created_by`.
- **Storage:** metadata in Postgres; bytes in object storage.

### AnalyticsEvent

- **Purpose:** Raw fact log.
- **Fields:** `id` bigserial, `occurred_at`, `org_id`, `event_id`, `actor_user_id`, `attendee_id`, `name` (`page_view`, `register_start`, `register_complete`, `payment_succeeded`, `checkin_ok`, `email_sent`, …), `properties` JSONB, `anon_id`, `ua`, `ip_hash`.
- **Ownership:** platform. Organizers read aggregates, not raw IPs.
- **Lifecycle:** append-only. Retention policy later.
- **Indexes:** `(event_id, name, occurred_at)`, `(event_id, occurred_at)`.
- **Storage:** Postgres v1. Partition by month if needed. ClickHouse only after pain.

### AuditLog

- **Purpose:** Privileged actions (refund, role change, impersonate, data export, credential revoke).
- **Fields:** `id`, `org_id`, `event_id`, `actor_user_id`, `action`, `target_type`, `target_id`, `before` JSONB, `after` JSONB, `ip`, `created_at`.
- **Indexes:** `(org_id, created_at)`, `(event_id, created_at)`.
- **Permissions:** org owner + platform admin.

### ConsentRecord

- **Purpose:** Proof of T&C / marketing opt-in.
- **Fields:** `id`, `registration_id`, `kind` (`terms` \| `privacy` \| `whatsapp` \| `email_mkt`), `version`, `accepted`, `accepted_at`, `ip`.
- **Constraints:** terms must be true to confirm.

---

## 5.3 Later entities (defined now so v1 doesn't paint us into a corner)

### Session / Track / Speaker

- `Track(event_id, name)`
- `Session(event_id, track_id, title, starts_at, ends_at, room, capacity)`
- `Speaker(event_id, name, bio, photo, company)`
- `SessionSpeaker(session_id, speaker_id)`
- `SessionSave(attendee_id, session_id)` — personalized agenda

### Exhibitor / Booth / Lead

- `Exhibitor(event_id, org_name, booth_id, profile JSONB, status)`
- `ExhibitorStaff(exhibitor_id, user_id)`
- `Booth(event_id, code, hall)`
- `Lead(exhibitor_id, attendee_id, captured_by, notes, captured_at)` unique `(exhibitor_id, attendee_id)`

### Networking

- `NetworkingProfile(attendee_id, industry, role, company, geo, interests[], goals[], looking_for[], offering[], visibility)`
- `Connection(event_id, requester_id, addressee_id, status)` unique pair
- `Meeting(event_id, a_id, b_id, starts_at, location, status)`

These three profile tables **are the AI feature store**. Do not invent a parallel ML schema later.

### Badge

- `BadgeTemplate(event_id, name, width_mm, height_mm, layers JSONB)`
- `BadgePrint(attendee_id, template_id, status, printed_at, printer_id, staff_id)`

### Survey / Poll

- Prefer a generic `Form` model reused from registration: `Form(owner_type, owner_id, schema)`, `FormResponse(form_id, attendee_id, answers)`.

### Stream

- `Stream(event_id, session_id, provider, provider_asset_id, access_policy)` — pointer only.

### Invitation

- `Invitation(event_id, email/phone, ticket_type_id, token_hash, status, expires_at)`

### APIKey / Webhook

- `ApiKey(org_id, prefix, hash, scopes, last_used_at)`
- `Webhook(org_id, url, secret, events[])`
- `WebhookDelivery(webhook_id, event_name, status, attempts)`

---

## 5.4 Ownership & permission sketch

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Organization | any signed-in user | members | owner/admin | owner (soft) |
| Event | org admin+ | public if published; else members/staff | org admin+ / event manager | never if paid; archive |
| TicketType | event manager+ | public list if public | manager+ | if sold=0 |
| Registration | anyone (public form) or staff | owner attendee, org staff | limited | cancel |
| Attendee | system / staff | org staff; self | org registration role | no |
| Credential | system | self, staff | revoke: manager | no |
| CheckIn | check-in staff | event staff | no | no |
| Order/Payment | system | org admin, buyer | system | no |
| Analytics raw | system | platform | no | retention job |
| AuditLog | system | owner / platform | no | no |

---

## 5.5 Important cross-cutting constraints

1. **Money is integer cents.** Never float.
2. **Inventory changes in a transaction** with hold/order.
3. **Credential `public_id` is not sequential.** No `/ticket/1` guessing.
4. **PII minimization** on analytics: hash IPs, don't copy answers into analytics properties by default.
5. **Soft delete** users and orgs; hard delete only after legal retention with audit.
6. **Idempotency keys** on payment webhooks and check-in (`offline_id`).
7. **Timezones:** store `timestamptz`, display in `event.timezone`.
8. **One currency per event** in v1.

---

## 5.6 Suggested Postgres extensions & enums

- `pgcrypto` or app-level hashes for secrets
- `citext` for emails
- Enums for status fields (or text + check constraints for easier evolution — prefer text + check in v1)

---

## 5.7 ER sketch

```
Organization 1──* Event 1──* TicketType
     │              │
     *              ├── 1 EventSite
Membership          ├── * Registration *──1 Order *──* Payment
     │              ├── * Attendee 1──1 Credential
    User            │         └── * CheckIn
                    ├── * EventStaff ── User
                    └── * AnalyticsEvent
```

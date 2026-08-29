# 9–10. Registration engine and ticketing / payments

Registration is the most important subsystem after the event object. Treat it as a **workflow engine with plugins**, not as "a form that inserts a row."

---

## 9.1 Design goal

New registration *modes* must be addable without rewriting checkout, credentials, or check-in.

That means:

- A single `Registration` state machine
- Ticket types and form schemas as data
- Payment as an optional gate, not a fork of the codebase
- Confirmation as a domain event that always issues an attendee + credential

---

## 9.2 State machine

```
started
  ├─→ expired                 (hold timeout, abandoned)
  ├─→ cancelled               (user or staff)
  ├─→ waitlisted              (capacity)
  ├─→ pending_approval        (mode = approval)
  ├─→ pending_payment         (price > 0 and mode requires pay-now)
  └─→ confirmed               (free / RSVP yes / already approved+paid)

pending_payment
  ├─→ confirmed               (payment.succeeded)
  ├─→ expired
  └─→ cancelled

pending_approval
  ├─→ pending_payment         (approved and price > 0)
  ├─→ confirmed               (approved and free)
  └─→ rejected

waitlisted
  ├─→ pending_payment / confirmed   (promoted)
  └─→ cancelled / expired

confirmed
  ├─→ cancelled               (refund / admin)
  └─→ (terminal otherwise)

rejected, expired, cancelled are terminal.
```

`confirmed` is the **only** state that creates/activates `Attendee` + `Credential`.

---

## 9.3 Registration modes (strategy objects)

`event.registration_mode` or per `TicketType.mode`:

| Mode | Extra states | Pay? | Who confirms |
|------|--------------|------|----------------|
| `open_free` | — | No | System on submit |
| `open_paid` | pending_payment | Yes | Payment webhook |
| `rsvp` | — | No | System on yes; no on no |
| `approval` | pending_approval | Optional after | Organizer |
| `invite` | — | Optional | Token valid + submit |
| `waitlist` | waitlisted | When promoted | System |

Implement modes as **strategies** with the same interface:

```
canStart(ctx) → boolean
onSubmit(registration) → nextStatus
requiresPayment() → boolean
onPaymentSucceeded(registration)
onApprove(registration)
```

Adding `invite` is a new strategy + an `Invitation` table, not a new registration service.

---

## 9.4 Form engine

v1 schema (stored JSON on the event or ticket type):

```
{
  "fields": [
    { "id": "first_name", "type": "text", "required": true, "system": true },
    { "id": "last_name", "type": "text", "required": true, "system": true },
    { "id": "email", "type": "email", "required": true, "system": true },
    { "id": "phone", "type": "phone", "required": true, "system": true },
    { "id": "company", "type": "text", "required": false },
    { "id": "terms", "type": "consent", "required": true, "version": "2026-08-01" }
  ]
}
```

Supported types v1: `text`, `email`, `phone`, `select`, `textarea`, `consent`.

Later: `multiselect`, `file`, `conditional` (`showIf`), `gstin` (validated), `country`.

**Renderer:** one component that walks the schema. Organizer UI edits the schema. Do not generate unique React trees per event.

Answers stored on `Registration.answers` and copied to `Attendee.answers` on confirm.

System fields map to attendee columns (name, email, phone) so check-in search works.

---

## 9.5 Capacity

Evaluation order on submit:

1. Ticket type `sales_starts_at / sales_ends_at / is_active`
2. Ticket type remaining = `quantity - sold - active_holds`
3. Event remaining if `event.capacity` set
4. If none: `waitlist` if enabled, else `400 ticket_sold_out`

Holds: create `InventoryHold` for 10–15 minutes when entering `pending_payment`. Sweeper expires holds and registrations.

Confirm path increments `sold_count` inside the same transaction that marks the order paid (or immediately for free).

---

## 9.6 Group / guest (later)

Model: `Order` has many `Registration`/`Attendee`. Buyer is `Order.buyer_*`. Each guest has their own credential.

Do not fake this in v1 by comma-separated names. It breaks QR and check-in.

---

## 9.7 Transfers (later)

Revoke credential A, create attendee B (or mutate names if policy allows), issue credential B, audit log. Payment stays on the order.

---

## 9.8 Refunds & cancellations

Staff-initiated v1:

1. Policy check (window, already checked in?)
2. Razorpay refund
3. On refund webhook: registration cancelled, inventory++, credential revoked, message

Attendee self-serve refund: later.

---

# 10. Ticketing and payment architecture

## 10.1 Ticket types

See data model. Organizer creates 1–N types. RSVP is a type with `price=0` and mode `rsvp`. Free meetup is `price=0` mode `open_free`. Do not special-case "no tickets" — always at least one type (even if hidden as "General").

## 10.2 Inventory

```
available = quantity - confirmed_sold - unexpired_holds
```

Never compute sold only from a cached counter. Counter is an optimization; source of truth is confirmed orders + holds.

Race: two checkouts for the last ticket. Both create holds only if `available >= qty` inside `SELECT … FOR UPDATE` on `ticket_types`.

## 10.3 Pricing

v1: one currency per event (`INR`). Price inclusive or exclusive of GST — **pick one and label it**. Recommended: **display prices inclusive of GST** for consumer familiarity; store breakup on the order.

Platform fee: see decision log. If Eventsliner takes 0% (Dreamcast-style), charge SaaS subscription later. If we take a cut, show it before pay. **Do not surprise organizers.**

## 10.4 Taxes

India first:

- Collect organizer GSTIN on org
- Optionally collect buyer GSTIN on paid orders above a threshold
- Store HSN/SAC (events typically SAC 998596 or current applicable code — confirm with a CA before launch)
- Invoice number sequence per org

Do not build a full GST filing product. Export a tax CSV.

## 10.5 Discounts

`Coupon` applied at checkout. Recompute server-side. Never trust client totals.

## 10.6 Orders & payments

```
Create registration
  → Create order (pending) + hold
  → Create Razorpay order (amount, receipt=order_id, notes.event_id)
  → Client Checkout.js / Standard Checkout
  → Razorpay webhook payment.captured
       → verify signature
       → payment row
       → order.paid
       → registration.confirmed
       → attendee + credential
       → release hold (convert to sold)
       → enqueue confirmation message
```

**Never confirm on client-only callback.** The webhook (or a server-side payment fetch) is source of truth. Client success page polls `GET /registrations/:id` until confirmed or 2 minutes, then "we emailed you."

## 10.7 Payment failures

- `payment.failed` → order.failed, registration stays `pending_payment` until hold expires, allow retry creating a new Razorpay order
- Do not reuse a paid provider order

## 10.8 Refunds / partial

- Full refund v1 via Razorpay API
- Partial: later; need per-attendee cancel in a group order
- Refunds are async; local state `refund_pending` until webhook

## 10.9 Invoices & settlement

- **Settlement:** Razorpay Route / Easy Split / linked account so money lands on the organizer. Eventsliner should not be a settlement bank.
- If we cannot ship linked accounts on day one, **explicitly** hold funds on a platform Razorpay account only as a temporary hack with a written payout process — this is a legal/compliance decision, not an engineering preference.
- Invoices: generate PDF after paid; store in object storage.

## 10.10 Webhooks

- Persist raw (trimmed) payload
- Verify `X-Razorpay-Signature`
- Idempotent on `payment_id`
- Replay-safe

## 10.11 Initial payment providers

| Provider | Use | Why |
|----------|-----|-----|
| **Razorpay** | **Default, India** | UPI, cards, netbanking, wallets; organizer familiarity; Route/linked accounts; webhooks; test mode; GST-friendly; best API for this job |
| Cashfree | Backup / negotiate | Similar; good if Razorpay underwrites poorly |
| PayU | Backup | Legacy India |
| Stripe | International events later | When we have non-INR events. Stripe India exists but UPI/Razorpay still wins locally |
| PayPal | No | Fees, not India-first |
| In-house acquiring | **Never** | PCI, RBI, settlement, fraud |

**Do not build payment processing.** PCI scope = hosted checkout + webhook. No card data on our servers.

WhatsApp Pay / deep UPI intent: Razorpay already covers UPI. Don't custom-build UPI collect.

## 10.12 Test matrix (QA must have)

- Free confirm
- Paid success
- Paid fail + retry success
- Double-click pay
- Webhook before redirect
- Webhook after redirect
- Last-ticket race
- Expired hold then pay (must fail closed)
- Refund after confirm, before check-in
- Refund after check-in (policy)
- Duplicate webhook
- Razorpay downtime page

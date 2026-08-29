# 11–12. Check-in infrastructure and badge system

---

## 11. Check-in

### 11.1 Pipeline

```
Registration confirmed
  → Attendee
  → Credential issued (public_id + secret)
  → QR rendered (payload = public_id + signature or public_id only if unguessable)
  → Staff scanner reads payload
  → Validate (event, status, time window, access rule)
  → Write CheckIn
  → Mark attendee.checked_in
  → AnalyticsEvent
```

Validation is a pure function:

```
validate(credential, event, location, now) →
  ok | already | revoked | wrong_event | not_yet | expired | denied
```

Check-in write is a transaction. Success response includes attendee display name, ticket type, photo if any, and whether this was a duplicate.

### 11.2 Credential design

**Do:**

- 128-bit random `public_id` (base32 or base58), indexed
- Optional HMAC so a stolen list of ids without the event key is insufficient (nice-to-have v1)
- One active credential per attendee
- Revoke + reissue on transfer / suspected leak

**Do not:**

- Encode name, phone, ticket price in the QR
- Use autoincrement ids
- Use a JWT so fat it fails on cheap scanner cameras (short payload)

M-Badge = web page + email image of the same QR. WhatsApp image later.

### 11.3 Scanner

v1: **web app using `getUserMedia` + jsQR / BarcodeDetector**, plus a hidden input for hardware keyboard-wedge scanners.

Layout:

- Full-screen camera
- Huge success/fail
- Last 5 scans
- Toggle torch if available
- Offline banner (if offline mode later)

Staff auth: phone OTP, event-scoped role.

### 11.4 Manual search

Search `name`, `email`, `phone` with trigram / `ILIKE`. Show 5 results max. Tap → confirm identity ("this is Priya from Zoho?") → check in.

Log that this was manual (higher fraud risk).

### 11.5 Multiple stations

Each request includes `station_id` (random per browser tab, persisted in localStorage) and `staff_user_id`.

Race: two stations scan the same QR.

```
INSERT check_ins ...
ON CONFLICT (credential_id) WHERE one_time
  DO NOTHING
RETURNING ...
```

If conflict: return `already` with first check-in time and staff. **Never** create two `ok` gate check-ins when re-entry is off.

### 11.6 Re-entry

`event.checkin_policy = once | reentry`.

Re-entry: allow multiple `ok` rows; dashboard shows unique attendees and total scans.

### 11.7 Session check-in (later)

Same endpoint, `location=session`, `location_id=sessionId`. Different unique key. Used for session analytics, not gate.

### 11.8 VIP / staff / zone (later)

`AccessRule` evaluated inside `validate()`. VIP is a ticket type; staff credentials can be issued to `EventStaff` as attendees with category `staff` or a parallel staff credential. Prefer **staff are also attendees** so they can be scanned into zones too.

### 11.9 Offline (later, design now)

Realistic offline:

1. Before doors, staff device downloads `event_id + { public_id, name, type, status }[]` (or a Bloom filter + name cache)
2. Scans append to a local queue with `offline_id` UUID
3. On reconnect, `POST /check-ins/batch` idempotent on `offline_id`
4. Conflicts (already checked in elsewhere) surface as `already`

This is **P2**. Do not build it before online check-in is flawless. Wifi at Indian venues is often bad, so *design the batch API now* (accept `offline_id` in v1 even if unused).

### 11.10 NFC / barcode / kiosk / turnstile / facial

| Mode | MVP? | Notes |
|------|------|-------|
| QR camera | **Yes** | |
| Manual search | **Yes** | |
| Keyboard-wedge USB scanner | Yes if cheap | Same input as QR text |
| Barcode (Code128) | Later | Print-friendly |
| Offline | Later | |
| Session scan | Later | |
| Multiple gates | **Yes** (correctness) | |
| Re-entry policy | Yes flag | |
| VIP as ticket type | Yes | |
| NFC/RFID | No | Hardware partner |
| Kiosk | No | Dreamcast Fastest Indian |
| Turnstile | No | Integrator |
| Facial recognition | **No** | Legal + model + lighting + we will get it wrong |

### 11.11 What can realistically be MVP

**Must work on the first real event:**

- Online QR scan
- Manual search
- Loud UX
- Duplicate handling
- Live count
- Staff phone login
- Works on mid-range Android Chrome

**Must not slip into MVP:**

- Offline
- Facial
- Printers
- Turnstiles
- Native store apps

---

## 12. Badge system

Dreamcast's badge story is hardware + ops. Eventsliner's badge story is **software that can drive someone else's printer**.

### 12.1 Separate the layers

| Layer | We build? | When |
|-------|-----------|------|
| Badge data (name, org, type, QR, access color) | Yes | Already in attendee+credential |
| Badge template editor | Yes | Phase 5–6 |
| PDF / PNG / ZPL / TSPL payload | Yes | Phase 5–6 |
| Printer hardware | **No** | Ever |
| Kiosk enclosure | **No** | Ever |
| On-site print operators | **No** | Services SKU maybe |

### 12.2 Templates

Fields: name, company, ticket type, role, QR, photo, event logo, day, zone color.

v1 of badges (when we get there): **3 fixed templates** (landscape paper 4×6, landscape PVC CR80, name-sticker). Organizer picks colors and logo.

Later: block editor for badge (not a general design tool).

### 12.3 Printing workflow

```
Check-in ok (optional trigger) or Print desk
  → Render payload
  → Send to printer
  → BadgePrint row (printed | reprint | failed)
```

Reprint: allowed, audited, increment reprint count. Some events mark "REPRINT" on the badge.

### 12.4 Hardware ecosystem (integrate, don't invent)

| Class | Typical vendors | Use |
|-------|-----------------|-----|
| Desktop thermal (events) | **Zebra ZD421 / ZD621**, TSC | Paper badges, 4×6, ZPL |
| Label / sticker | **Brother QL-820NWB** | Cheap reprint / name tags |
| PVC card | **Evolis Primacy**, HID Fargo | Corporate / multi-day |
| Wristband printers | Zebra ZD + wristband stock | Festivals |
| Industrial / kiosk print engines | Custom | Dreamcast Fastest Indian class |

Connectivity: USB (painful in browsers), network (preferred), or a small local agent (**QZ Tray** or a Raspberry Pi print proxy). Browser cannot reliably talk raw USB to Zebra without an agent.

**Recommendation:** when we add printing, ship:

1. "Download PDF badge" (organizer pre-print)
2. "Print via QZ Tray / Zebra network" as an advanced option
3. Partner with a rental vendor for kiosks rather than manufacturing

### 12.5 Badge status

`not_printed` → `printed` → `reprinted` / `void`.

Void when credential revoked. A printed badge in the wild cannot be unprinted — access is revoked in software. This is why QR must be validated live, not trusted as an object.

### 12.6 MVP badge stance

**No badge product in MVP.** The M-Badge (phone QR) *is* the badge.

Add print when a paying conference asks. Until then, organizers can export a CSV and use Word/Avery mail merge — tell them that in the runbook. It is fine.

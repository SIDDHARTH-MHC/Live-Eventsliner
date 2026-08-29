# Phase 20 — Partner hardware & integrations (integrate-only)

Eventsliner does **not** build in-house hardware, facial recognition, or Aadhaar/OVSE. Code contracts live in `src/lib/partners/hardware.ts`.

## Badge printing — QZ Tray + Zebra

1. `GET /api/v1/attendees/:id/badge` — HTML badge
2. `GET /api/v1/attendees/:id/badge?format=zpl` — ZPL for Zebra via QZ Tray
3. Install [QZ Tray](https://qz.io/) on the check-in laptop
4. Optional: `BadgeTemplate.zplTemplate` per event

## NFC / turnstile

- Encode gate credential `public_id` via venue HID/Impinj
- `POST /api/v1/partners/nfc/uid` — API key scope `checkin:write` records `attendees.nfc_uid`
- `POST /api/v1/partners/turnstile/admit` — same admit semantics as QR check-in

## Offline check-in

- Check-in PWA queues scans with `offline_id`
- Batch sync: `POST /api/v1/events/:id/check-ins/batch`
- Idempotent by `offline_id`

## Identity verification (enterprise opt-in)

- **Do not build** Aadhaar/OVSE or facial recognition
- `OptInIdentityPartner` returns `not_configured` until `IDFY_API_KEY` / `HYPERVERGE_API_KEY` + legal review

## Stage 2 universal app

- `/app` — Discover + My Tickets + Following + Saved events (PWA-ready)

## Stage 3 event-specific native (Flutter)

- **Template:** `apps/eventsliner_event_app` (iOS + Android)
- **No code per event** — organizers configure `event_app_configs`; factory paints brand
- **Mode A (default):** one Eventsliner Live store app + runtime `GET /api/v1/public/events/:slug/app-config`
- **Mode B (enterprise):** CI flavor build (`--dart-define`) / Codemagic via `EVENT_APP_BUILD_WEBHOOK_URL`
- Design: [docs/22-flutter-event-app.md](22-flutter-event-app.md)

## Apple / Google Wallet

- Pass payload deferred to Passkit partner; QR credential URL is v1 path

## AI matchmaking

- Rule-based suggestions: `/api/v1/public/events/:slug/networking/suggestions`
- ML ranker deferred

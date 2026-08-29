# Phase 20 — Partner hardware & integrations (integrate-only)

Eventsliner does **not** build in-house hardware, facial recognition, or Aadhaar/OVSE. This document describes partner integration stubs.

## Badge printing — QZ Tray + Zebra

1. Organizer downloads badge from `GET /api/v1/attendees/:id/badge` (HTML/PDF)
2. Install [QZ Tray](https://qz.io/) on the check-in laptop
3. Configure Zebra/Brother network printer per vendor runbook
4. Optional: use `BadgeTemplate.zplTemplate` for direct ZPL to Zebra printers

## NFC / turnstile credentials

- Gate credential `public_id` can be encoded to NFC by venue vendor (HID, Impinj)
- Set `attendees.nfc_uid` when vendor encodes wristbands
- Turnstile vendors poll `POST /api/v1/events/:id/check-ins` — same as QR scan

## Offline check-in

- Check-in PWA queues scans with `offline_id`
- Batch sync: `POST /api/v1/events/:id/check-ins/batch`
- Idempotent by `offline_id` — no double-admit

## Identity verification (enterprise opt-in)

- **Do not build** Aadhaar/OVSE or facial recognition
- Integrate IDfy / HyperVerge via webhook when enterprise contract requires KYC
- Legal review required before enabling

## Stage 2 universal app

- `/app` — Discover + My Tickets + Following + Saved events (PWA-ready)
- Add to Home Screen on Android Chrome for app-like experience

## Stage 3 white-label native

- Customer-funded React Native shell using same APIs
- Per-customer App Store listing — services SKU, not default path

## Apple / Google Wallet

- Pass payload generation deferred to Passkit partner
- QR credential URL remains primary v1 path

## AI matchmaking

- Rule-based suggestions in Phase 13 (`/api/v1/public/events/:slug/networking/suggestions`)
- ML ranker deferred until sufficient opt-in data exists

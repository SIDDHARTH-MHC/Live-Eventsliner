# Eventsliner Live — Event App (Flutter)

Dreamcast-style **event-specific** attendee app for **iOS + Android** (and web).

> **No code per event.** Organizers configure branding in the dashboard.
> This one template is painted at **runtime** (Mode A) or rebuilt by **CI** (Mode B).

Architecture: [docs/22-flutter-event-app.md](../../docs/22-flutter-event-app.md)

## Modes

| Mode | Store listing | Branding |
|------|---------------|----------|
| **A — Universal** | One Eventsliner Live app | Deep link + `GET /api/v1/public/events/:slug/app-config` |
| **B — White-label** | Per-event listing | CI `--dart-define` from `event_app_configs` |

## Tabs

Home · My Pass (QR) · Schedule · More

## Talks to Eventsliner APIs

Base URL from `API_BASE_URL` (no trailing slash):

| Call | Endpoint |
|------|----------|
| App / brand config | `GET /api/v1/public/events/{EVENT_SLUG}/app-config` |
| Event summary | `GET /api/v1/public/events/{EVENT_SLUG}` |
| Schedule | `GET /api/v1/public/events/{EVENT_SLUG}/sessions` |
| Ticket / pass | `GET /api/v1/tickets/{token}` |

Ticket token is stored on-device. Attendees paste it from `/tickets/{token}` (email/WhatsApp).

## Dart-define white-label flags (Mode B)

| Flag | Meaning | Example |
|------|---------|---------|
| `API_BASE_URL` | Eventsliner API / web origin | `https://eventsliner-mh45.onrender.com` |
| `EVENT_SLUG` | Public event slug | `delhi-demo-product-workshop` |
| `APP_DISPLAY_NAME` | Store / in-app brand name | `Delhi Workshop` |
| `PRIMARY_COLOR` | Seed color hex (RRGGBB or AARRGGBB) | `6750A4` |

## Run (dev)

```bash
export PATH="$HOME/flutter/bin:$PATH"
cd apps/eventsliner_event_app
flutter pub get

# Android emulator → host (default API often 10.0.2.2:43123)
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:43123 \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=6750A4

# iOS simulator → host
flutter run \
  --dart-define=API_BASE_URL=http://127.0.0.1:43123 \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=0B57D0
```

## Build iOS / Android

```bash
cd apps/eventsliner_event_app

flutter build apk \
  --dart-define=API_BASE_URL=https://eventsliner-mh45.onrender.com \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=6750A4

flutter build appbundle \
  --dart-define=API_BASE_URL=https://eventsliner-mh45.onrender.com \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=6750A4

# iOS requires macOS + Xcode signing
flutter build ios \
  --dart-define=API_BASE_URL=https://eventsliner-mh45.onrender.com \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=6750A4
```

Dashboard **Generate build** → `POST .../app-config/builds` → CI webhook with the same dart-defines. Do not bake secrets into the binary.

## Analyze

```bash
cd apps/eventsliner_event_app && flutter analyze
```

# Eventsliner Live — Event App (Flutter)

Dreamcast-style **event-specific** attendee app for **iOS + Android**.

> **No code per event.** Organizers configure branding in the dashboard.
> This one template is painted at **runtime** (Mode A) or rebuilt by **CI** (Mode B).

Architecture: [docs/22-flutter-event-app.md](../../docs/22-flutter-event-app.md)

## Modes

| Mode | Store listing | Branding |
|------|---------------|----------|
| **A — Universal** | One Eventsliner Live app | Deep link + `GET /api/v1/public/events/:slug/app-config` |
| **B — White-label** | Per-event listing | CI `--dart-define` from `event_app_configs` |

## Run

```bash
export PATH="$HOME/flutter/bin:$PATH"
cd apps/eventsliner_event_app

flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:43123 \
  --dart-define=EVENT_SLUG=delhi-demo-product-workshop \
  --dart-define=APP_DISPLAY_NAME="Delhi Workshop" \
  --dart-define=PRIMARY_COLOR=6750A4
```

## Mode B factory defines

Dashboard **Generate build** → `POST .../app-config/builds` → webhook with:

- `API_BASE_URL`, `EVENT_SLUG`, `APP_DISPLAY_NAME`, `PRIMARY_COLOR`

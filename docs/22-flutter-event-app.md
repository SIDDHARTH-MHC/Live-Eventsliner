# 22. Event-specific apps without writing code (Flutter)

**Status:** Binding product + engineering design for Dreamcast-style **per-event mobile apps** on **iOS and Android**.

**Decision (D18):** One Flutter template (`apps/eventsliner_event_app`). Organizers **configure**, they do **not** get a new codebase. Generating an app = writing a config row + (optional) CI flavor build.

Related: [17-discovery-and-surfaces.md](17-discovery-and-surfaces.md), [10-experience-surfaces.md](10-experience-surfaces.md), [20-hardware-partners.md](20-hardware-partners.md), [16-design-system.md](16-design-system.md).

---

## 1. The problem Dreamcast sells

Organizers want an **event-branded** app attendees download from the App Store / Play Store (My Pass, schedule, later networking). They will **not** hire an agency to fork source for every conference. Eventsliner must make this a **dashboard action**.

---

## 2. Non-negotiable architecture

```
                    ONE Flutter template
                    apps/eventsliner_event_app
                              │
              ┌───────────────┼───────────────┐
              │                               │
     Mode A — Universal                 Mode B — White-label
     (default, truly zero code)         (enterprise / services SKU)
              │                               │
   One store listing under            Same template + CI injects
   Eventsliner Live                   name, icon, color, bundle id
              │                               │
   Runtime fetch                      Compile-time --dart-define
   GET /api/v1/public/events/         + asset swap + store upload
       :slug/app-config
```

| Rule | Meaning |
|------|---------|
| **No per-event git repo** | Never clone Flutter for each event |
| **Event is canonical** | App reads the same Event + tickets + sessions as web/PWA |
| **Config, not code** | Branding, tabs, package ids live in `event_app_configs` |
| **Web/PWA still exist** | Stage 1 `/e/:slug/app` remains; Flutter is Stage 3 downloadable shell |

---

## 3. Mode A — Universal Eventsliner Live Events app (default)

1. Attendee installs **one** Eventsliner Live app (iOS + Android).
2. Opens ticket deep link / pastes token for event slug.
3. App loads `app-config` + ticket + schedule — organizer color + title.
4. Organizer only toggles **Enable in app** in the dashboard.

**Pros:** Zero App Store review per event. Instant.  
**Cons:** Publisher is Eventsliner Live (not the organizer’s developer account).

Covers most Dreamcast “event app” value for mid-size events.

---

## 4. Mode B — White-label store app (enterprise)

Organizer fills dashboard form (name, color, icon, bundle ids) → **Generate build**.

System:

1. Saves `event_app_configs` (`mode=white_label`, `buildStatus=queued`).
2. Posts to `EVENT_APP_BUILD_WEBHOOK_URL` (Codemagic / GitHub Actions `event-app-flavor.yml`).
3. CI runs `flutter build ipa|appbundle` with `--dart-define=API_BASE_URL|EVENT_SLUG|APP_DISPLAY_NAME|PRIMARY_COLOR`.
4. Dashboard shows Ready + artifact / TestFlight link.

**Still no hand-written code** — engineers maintain one template; CI is the factory.

---

## 5. Data model — `event_app_configs`

1:1 with Event. Fields: `enabled`, `mode`, `displayName`, `primaryColor`, icon/splash media, `tabs`, iOS/Android ids, `buildStatus`, `lastBuildUrl`.

- Public: `GET /api/v1/public/events/:slug/app-config`
- Organizer: `GET|PUT /api/v1/orgs/:org/events/:id/app-config`
- Build: `POST …/app-config/builds`

---

## 6. Organizer UX (no engineers)

```
Event → Mobile app
  ├─ Enable mobile experience
  ├─ Mode: Universal (recommended) | White-label
  ├─ Tabs + colors
  └─ [Mode B] Generate iOS/Android build → status
```

Ticket email/WhatsApp: **Get the app** deep link.

---

## 7. One-sentence pitch

> **Eventsliner never writes an app per event — organizers fill a form; one Flutter factory paints their brand at runtime (everyone) or at build time (enterprise store listing).**

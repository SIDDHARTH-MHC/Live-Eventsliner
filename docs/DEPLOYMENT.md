# Production deployment

Last updated: 2026-08-29

## Live environments

| Environment | URL | Platform |
|-------------|-----|----------|
| Production (Render) | https://eventsliner-mh45.onrender.com | Render web + Postgres + Redis |
| Production (Vercel) | https://workspace-chi-three-91.vercel.app | Vercel (DB via Render Postgres/Redis) |

## Health checks

```bash
curl -s https://eventsliner-mh45.onrender.com/health | jq
curl -s https://workspace-chi-three-91.vercel.app/health | jq
```

Expected: `{ "status": "ok", "db": "connected" }`

## Required environment variables

### Core

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis for sessions, OTP, rate limits |
| `SESSION_SECRET` | 32+ char random string |
| `APP_URL` | Public URL (e.g. `https://eventsliner-mh45.onrender.com`) |
| `PORT` | Set by Render; bind `0.0.0.0:$PORT` |

### Email / SMS / WhatsApp

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (console provider if unset) |
| `EMAIL_FROM` | Verified sender address |
| `MSG91_AUTH_KEY` | MSG91 for OTP/SMS |
| `GUPSHUP_API_KEY` | WhatsApp BSP (console if unset) |
| `GUPSHUP_SOURCE_NUMBER` | WhatsApp source number |
| `WHATSAPP_TEMPLATE_REGISTRATION` | Meta-approved template ID |

### Payments

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Platform or test keys |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC secret |

Org-level Razorpay keys override platform keys via organizer settings.

### Video (Phase 15)

| Variable | Description |
|----------|-------------|
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Mux live streams |
| `DAILY_API_KEY` | Daily.co rooms |
| `MOCK_STREAM_URL` | Fallback embed when unset |

### Enterprise (Phase 17)

| Variable | Description |
|----------|-------------|
| `SSO_ENABLED` | `true` to enable WorkOS SSO |
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_CLIENT_ID` | WorkOS client ID |

### Observability

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Error tracking |
| `CRON_SECRET` | Bearer token for cron routes |

### Cron jobs (Render)

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/v1/cron/expire-holds` | Every 5 min | Release expired inventory holds |
| `/api/v1/cron/event-reminders` | Daily 06:00 IST | T-24h email reminders |
| `/api/v1/cron/privacy-deletion` | Daily | DPDP anonymization queue |

## Render Blueprint

See `render.yaml` for web service + Postgres + Redis provisioning.

## Disaster recovery

1. Render Postgres: enable PITR; quarterly restore drill to staging
2. Never share prod DB credentials with staging
3. Ephemeral filesystem: no local file persistence; use S3 for media

## Worker separation

BullMQ worker can run as a separate Render background worker when email/comms volume warrants it. Dev/staging runs comms inline.

## Uptime monitoring

Monitor `/health` on both Render and Vercel. Alert on:
- HTTP 5xx > 1% for 5 min
- `/health` db disconnected
- Razorpay webhook lag > 5 min (check payment table vs provider)

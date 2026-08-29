# Eventsliner.live

India-first event platform — one **Event** entity with discovery, event website, and event app as interfaces (discovery is Phase 4; this slice ships the website spine).

Canonical Git repository: https://github.com/SIDDHARTH-MHC/Live-Eventsliner.git

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn-style UI
- PostgreSQL + Prisma
- Redis (OTP cooldown, rate limits; in-memory fallback when unset)
- S3-compatible object storage (presigned uploads)
- Resend / console email · MSG91 / console SMS

Design system: [docs/16-design-system.md](docs/16-design-system.md) · [.cursor/rules/design-system.mdc](.cursor/rules/design-system.mdc)

## Quick start (local)

### Prerequisites

- Node 20+
- pnpm 10+
- PostgreSQL 16
- Redis 7 (optional — falls back to in-memory)

Or use Docker Compose for Postgres/Redis/MinIO:

```bash
docker compose up -d
```

### Setup

```bash
cp .env.example .env
pnpm install
pnpm db:migrate:deploy   # or pnpm db:migrate for dev
pnpm db:seed             # demo org + published event
pnpm dev                 # http://localhost:43123
```

### Demo after seed

| What | URL |
|------|-----|
| Public event page | http://localhost:43123/e/delhi-demo-product-workshop |
| Demo org dashboard | http://localhost:43123/orgs/delhi-demo (sign in first) |
| Health | http://localhost:43123/health |

Sign in via email magic link (check server console) or phone OTP (console in dev).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server on **port 43123**, binds `0.0.0.0` |
| `pnpm build` | Production build |
| `pnpm start` | Production server (`$PORT` or 43123) |
| `pnpm test` | Vitest (authz + tenant isolation) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:seed` | Seed demo data |

## Environment

See [.env.example](.env.example). Required for local dev:

- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — long random string
- `APP_URL` — e.g. `http://localhost:43123`

Optional: `REDIS_URL`, `RESEND_API_KEY`, `MSG91_*`, `S3_*`, `SENTRY_DSN`

## Staging deploy runbook

1. **Provision:** Render/Fly/AWS web service + managed Postgres + Redis + S3 bucket (India region preferred for PII).
2. **Env vars:** Copy `.env.example` → staging secrets. Set `NODE_ENV=production`, `APP_URL=https://staging.eventsliner.live`, strong `SESSION_SECRET`.
3. **Build command:** `pnpm install && pnpm db:migrate:deploy && pnpm build`
4. **Start command:** `pnpm start` (binds `0.0.0.0:$PORT`)
5. **Health check:** `GET /health` — expect `{ "status": "ok", "db": "connected" }`
6. **Seed staging once:** `pnpm db:seed` (synthetic data only — no customer PII)
7. **Verify:** Open `/e/delhi-demo-product-workshop` on a phone; confirm sticky CTA and JSON-LD in page source.
8. **Backups:** Enable managed Postgres PITR; document restore drill quarterly.

## CSRF

Documented in [docs/CSRF.md](docs/CSRF.md).

## Plan docs

Product/engineering plan lives in [docs/](docs/). Start here for the engineering slice: [docs/15-start-here.md](docs/15-start-here.md).

Implementation status: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

## What is not in this slice

Discovery (`/discover`), tickets, Razorpay, QR, check-in, WhatsApp, native apps — see [docs/15-start-here.md](docs/15-start-here.md).

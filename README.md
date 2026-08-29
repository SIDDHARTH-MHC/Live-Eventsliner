# Eventsliner.live

India-first event platform — one **Event** entity with Discovery, Event Website, and Event App as surfaces (visibility: PUBLIC / UNLISTED / PRIVATE).

Canonical Git repository: https://github.com/SIDDHARTH-MHC/Live-Eventsliner.git

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn-style UI
- PostgreSQL + Prisma · Redis (OTP, rate limits; in-memory fallback)
- S3-compatible media · Resend / MSG91 / Gupshup · Razorpay (mock when unset)
- Design system: [docs/16-design-system.md](docs/16-design-system.md) ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) + [Google Design](https://design.google/) / Material 3)
- Platform standards: [docs/21-platform-standards.md](docs/21-platform-standards.md) ([AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) + [Google API Design](https://cloud.google.com/apis/design))

## Live

| Surface | URL |
|---------|-----|
| **Render** | https://eventsliner-mh45.onrender.com |
| **Vercel** | https://workspace-chi-three-91.vercel.app |
| Health | `/health` |
| Discover | `/discover` |
| Demo event | `/e/delhi-demo-product-workshop` |

Roadmap status: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) · Verification: [docs/19-verification-report.md](docs/19-verification-report.md)

## Quick start (local)

```bash
cp .env.example .env
# Ensure DATABASE_URL=postgresql://eventsliner:eventsliner@localhost:5432/eventsliner
pnpm install
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev                 # http://localhost:43123
```

Optional: `docker compose up -d` for Postgres/Redis/MinIO.

### Demo after seed

| What | URL |
|------|-----|
| Public event | http://localhost:43123/e/delhi-demo-product-workshop |
| Discover | http://localhost:43123/discover |
| Consumer app | http://localhost:43123/app |
| Org dashboard | http://localhost:43123/orgs/delhi-demo (sign in first) |
| Org settings | http://localhost:43123/orgs/delhi-demo/settings |
| Health | http://localhost:43123/health |

Sign in via email magic link or phone OTP (console providers when keys unset). Check-in staff demo phone: `+919888877766`.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server **port 43123**, `0.0.0.0` |
| `pnpm build` / `pnpm start` | Production |
| `pnpm test` | Vitest (authz, tenant, payments, security) |
| `pnpm db:migrate:deploy` | Apply migrations |
| `pnpm db:seed` | Demo org + event (safe without Razorpay keys) |

## Environment

See [.env.example](.env.example). Required: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`.

Optional providers: `RAZORPAY_*`, `RESEND_API_KEY`, `MSG91_*`, `GUPSHUP_*`, `WORKOS_*`, `MUX_*` / `DAILY_API_KEY`, `S3_*`, `SENTRY_DSN`.

## Deploy

- Render Blueprint: [`render.yaml`](render.yaml) · runbook [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Vercel: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) (region `bom1`, shared Render Postgres/Redis)

**Build:** `pnpm install && pnpm db:migrate:deploy && pnpm build` · **Start:** `pnpm start` (`0.0.0.0:$PORT`)

## Plan docs

Start: [docs/15-start-here.md](docs/15-start-here.md) · Master roadmap: [docs/18-twenty-phase-master-roadmap.md](docs/18-twenty-phase-master-roadmap.md)

**Out of scope / never build:** facial recognition, Aadhaar/OVSE in-house, proprietary video SFU, cashless RFID, native apps as default, AI matchmaking v1.

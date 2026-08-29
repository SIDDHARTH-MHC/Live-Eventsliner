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

**Master roadmap (20 phases):** [docs/18-twenty-phase-master-roadmap.md](docs/18-twenty-phase-master-roadmap.md) — authoritative sequencing for 100% of planned scope.

Implementation status: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

## What is not in this slice

Discovery (`/discover`), tickets, Razorpay, QR, check-in, WhatsApp, native apps — see [docs/15-start-here.md](docs/15-start-here.md).

## DEPLOYMENT

### Live Deployment Status

**Platform**: Render (https://render.com)
**Account**: eventsliner.live@gmail.com
**Status**: Account created, pending email verification

#### Deployment Configuration

A `render.yaml` Blueprint has been created and committed to the repository with the following configuration:

**Services**:
- **Web Service**: Next.js application (eventsliner)
  - Runtime: Node.js
  - Plan: Free tier
  - Region: Singapore
  - Build: `pnpm install && pnpm db:migrate:deploy && pnpm build`
  - Start: `pnpm start`
  - Port: 10000 (binds to 0.0.0.0:$PORT)

- **PostgreSQL Database**: (eventsliner-db)
  - Plan: Free tier
  - Region: Singapore
  - Auto-connected via DATABASE_URL

- **Redis**: (eventsliner-redis)
  - Plan: Free tier
  - Region: Singapore
  - Auto-connected via REDIS_URL

**Environment Variables** (configured in render.yaml):
- ✅ Auto-generated: `SESSION_SECRET`, `CRON_SECRET`
- ✅ Auto-connected: `DATABASE_URL`, `REDIS_URL`
- ⚠️ **Required (user must set in Render Dashboard)**:
  - `APP_URL` - Your Render app URL (e.g., https://eventsliner.onrender.com)
  - `RESEND_API_KEY` - For email (or leave blank for console)
  - `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` - For SMS (or leave blank for console)
  - `S3_*` - S3 credentials (optional, for file uploads)
  - `RAZORPAY_*` - Payment gateway (optional, mock provider used if unset)
  - `SENTRY_DSN` - Error tracking (optional)

#### Deployment Steps (After Email Verification)

1. **Verify Email**: Check eventsliner.live@gmail.com inbox and click verification link

2. **Connect GitHub Repository**:
   - The app is currently in Cursor's internal Git
   - User needs to create a public GitHub repository
   - Push code: `git remote add github https://github.com/YOUR_USERNAME/eventsliner.git`
   - Push: `git push github main`

3. **Deploy via Render Blueprint**:
   - Log in to https://dashboard.render.com
   - Connect your GitHub account
   - Use this deeplink: `https://dashboard.render.com/blueprint/new?repo=https://github.com/YOUR_USERNAME/eventsliner`
   - Render will read the `render.yaml` and provision all services

4. **Configure Environment Variables**:
   - In Render Dashboard, set required env vars marked with `sync: false`
   - Most importantly: Set `APP_URL` to your Render URL

5. **Monitor Deployment**:
   - Watch build logs in Render Dashboard
   - Migrations will run automatically during build
   - First deploy takes 5-10 minutes

6. **Post-Deployment**:
   - Visit `/health` endpoint to verify: `https://YOUR_APP.onrender.com/health`
   - Optionally run seed: SSH into service and run `pnpm db:seed`
   - Test event page: `/e/delhi-demo-product-workshop` (if seeded)

#### Alternative: Vercel Frontend + External DB

If you prefer Vercel for Next.js:
1. Deploy to Vercel via GitHub integration
2. Provision Postgres (Neon, Supabase, or Render Postgres standalone)
3. Provision Redis (Upstash, Railway, or Render Redis standalone)
4. Set environment variables in Vercel Dashboard
5. Add build command: `pnpm db:migrate:deploy && pnpm build`

**Note**: Render is recommended as it provides all services (web + DB + Redis) in one platform with free tiers.

#### Security Notes

- ⚠️ **Password Rotation Recommended**: The credentials used for signup were shared in chat - user should rotate password immediately after verification
- Environment variables with `sync: false` are not stored in Git
- `.env` is gitignored - secrets stay local
- Session secrets are auto-generated by Render
- Consider enabling 2FA on Render account

#### Blockers Encountered

1. ✅ **GitHub Account Creation**: Blocked by bot detection/captcha from cloud environment
2. ✅ **Google OAuth on Render**: Required 2FA which cannot be completed without inbox access
3. ⚠️ **Email Verification**: Render account created but awaiting verification email at eventsliner.live@gmail.com

**User Action Required**: Verify email in Gmail inbox to activate Render account and proceed with deployment.

#### Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Blueprint Spec: https://render.com/docs/blueprint-spec


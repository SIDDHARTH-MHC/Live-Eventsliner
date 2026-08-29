# Deploy Eventsliner on Vercel

Prep-only runbook for importing [SIDDHARTH-MHC/Live-Eventsliner](https://github.com/SIDDHARTH-MHC/Live-Eventsliner) into Vercel. Do **not** commit deploy tokens or AI Gateway keys to git.

## Import project

1. Sign in at [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import **GitHub → SIDDHARTH-MHC/Live-Eventsliner** (canonical repo).
3. Framework preset: **Next.js** (also set in [`vercel.json`](../vercel.json)).
4. Confirm settings match `vercel.json`:
   - **Install command:** `pnpm install`
   - **Build command:** `pnpm db:migrate:deploy && pnpm build`
   - **Region:** `bom1` (Mumbai). Use `sin1` (Singapore) in `vercel.json` if `bom1` is unavailable on your plan.
5. Add the required environment variables below, then deploy.

`postinstall` runs `prisma generate` after install so the Prisma client is ready before the build.

## Required environment variables

Set these in **Project → Settings → Environment Variables** (Production, Preview, and Development as needed).

| Variable | Source | Notes |
|----------|--------|--------|
| `DATABASE_URL` | [Neon](https://neon.tech) Postgres | Create a project in `ap-south-1` or `ap-southeast-1` to stay close to `bom1`/`sin1`. Use the pooled connection string for serverless. |
| `REDIS_URL` | [Upstash Redis](https://upstash.com) | OTP cooldown and rate limits; app falls back to in-memory if unset, but set this in production. |
| `SESSION_SECRET` | Generate locally | Long random string (e.g. `openssl rand -base64 32`). Never reuse dev secrets. |
| `APP_URL` | Vercel project URL | e.g. `https://your-project.vercel.app` — update after the first deploy or when adding a custom domain. |
| `NODE_ENV` | `production` | Set for Production environment. |

Copy optional vars from [`.env.example`](../.env.example): `RESEND_API_KEY`, `MSG91_*`, `S3_*`, `RAZORPAY_*`, `SENTRY_DSN`, `CRON_SECRET`.

## Tokens: what to use (and what not to)

| Prefix / name | Purpose | Where to get it |
|---------------|---------|-----------------|
| `vck_` | **Vercel AI Gateway** API key — for AI/LLM routing, **not** deployment | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). **Do not commit**; add only as a project env var if you use AI features. |
| `VERCEL_TOKEN` | **CLI / API deploy token** | [Account → Tokens](https://vercel.com/account/tokens). Use for `vercel` CLI or automation; store in CI secrets or local shell env, never in git. |

This repository ignores `*vck_*` in [`.gitignore`](../.gitignore).

## CLI deploy (optional)

Only when `VERCEL_TOKEN` is set in your environment:

```bash
export VERCEL_TOKEN=...   # from https://vercel.com/account/tokens
pnpm install
vercel link    # once per machine
vercel --prod  # deploy to production
```

Without `VERCEL_TOKEN`, use the Vercel dashboard import flow above — no CLI deploy from this repo.

## Post-deploy checks

1. Open `GET /health` — expect `{ "status": "ok", "db": "connected" }`.
2. Run seed once if needed: `pnpm db:seed` (via Vercel CLI shell or locally against the Neon DB).
3. Sign in via email magic link or phone OTP; confirm `APP_URL` matches the live URL (auth redirects depend on it).

## Related

- Render deployment: [`render.yaml`](../render.yaml), README **DEPLOYMENT** section
- Local setup: [README](../README.md)

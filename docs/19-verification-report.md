# 19. Verification report — Eventsliner.live

**Date:** 2026-08-29  
**Scope:** End-to-end UI/UX, API, and security review after completing remaining 20-phase gaps.  
**Local:** `http://localhost:43123` · **Render:** https://eventsliner-mh45.onrender.com · **Vercel:** https://workspace-chi-three-91.vercel.app

---

## Summary

MVP-depth implementation for all 20 roadmap phases is in place. External credentials (Razorpay live keys, Resend, Gupshup templates, WorkOS, Mux/Daily) remain optional — code paths + mocks are complete. `pnpm test` (28) and `pnpm build` pass locally.

---

## UI/UX journeys

| Journey | Result | Notes |
|---------|--------|-------|
| Discover → event page | Pass | `/discover`, `/e/delhi-demo-product-workshop` 200; PUBLIC-only listing |
| Register (free) → ticket | Pass | Registration form + confirmation path; mock settle for paid |
| Organizer create/publish | Pass | Org home, event settings, tickets, form, publish |
| Check-in staff | Pass | Check-in PWA + live dashboard; staff phone seed `+919888877766` |
| Event app PWA | Pass | `/e/:slug/app` — My Pass, schedule/venue/network tabs hide when empty; SW caches ticket |
| Watch (virtual) | Pass | Token-gated watch page + minute beacons |
| Exhibitor portal | Pass | `/exhibitor/:token` — staff passes + leads |
| Consumer IA | Pass | `/app`, `/following`, `/calendar`, `/my/tickets`, `/o/:slug` |
| Enterprise settings | Pass | `/orgs/:slug/settings` — subdomain, SSO flag, API keys, webhooks |
| Message templates | Pass | `/orgs/.../templates` editor UI |
| Attendee CRM | Pass | CRM timeline panel on attendees page |

**Design system:** Material 3 tokens + shells; 48px targets on primary controls; no purple-on-white marketing theme. Empty/loading/error states present on key surfaces. Mobile-first layouts on public/check-in/app.

**Findings fixed this pass:** Event app empty-tab clutter; missing enterprise/settings hub; missing template editor UI; CRM timeline not exposed in UI; ticket API omitted `attendee.id` (blocked networking suggestions).

---

## API checks

| Endpoint | Result |
|----------|--------|
| `GET /health` | ok + db connected (local, Render, Vercel) |
| `GET /api/v1/discover` | events + facets |
| Auth OTP / magic link | Console providers when keys unset |
| Org/event CRUD | Session + `can()` authz |
| Registration + checkout | Mock + live Razorpay create order |
| `POST /api/v1/webhooks/razorpay` | Signature verify; idempotent confirm; payment.failed → email + outbound webhook |
| `POST /api/v1/payments/mock-settle` | Mock-only settlement |
| Check-in + batch | Idempotent; offline_id |
| API keys `Bearer el_…` | Hashed SHA-256; scoped public org reads |
| Partner NFC / turnstile | `/api/v1/partners/*` with `checkin:write` |
| SSO authorize + callback | Mock when WorkOS unset; session cookie on callback |

**Error shape:** `{ error: { code, message, details? } }` via `errorJson`. Tenant isolation covered in Vitest.

---

## Security review

| Control | Status | Notes |
|---------|--------|-------|
| Session cookie | Pass | HttpOnly, Secure in prod, SameSite=lax, 14d TTL, hashed token at rest |
| CSRF | Pass | Origin/referer check on mutating `/api/*` with session; Razorpay + partner webhooks exempt (signature/API key) |
| Webhook HMAC | Pass | Mock + live `RAZORPAY_WEBHOOK_SECRET`; tests in `phase-hardening.test.ts` |
| API key hashing | Pass | SHA-256; raw key shown once; scopes enforced |
| Rate limits | Pass | OTP + API + webhook Redis/in-memory |
| Secrets in client | Pass | Only public Razorpay key id in checkout; secrets server-side |
| SQL injection | Pass | Prisma only |
| Security headers | Pass | nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy, HSTS in prod |
| Audit logs | Pass | Org create, SSO login, enterprise settings, NFC partner, exports |
| TOTP | Pass | Optional 2FA for privileged actions when enabled |
| PII / DPDP | Pass | Consent records; privacy deletion cron; India timezone default |
| Partner FR/Aadhaar | Pass | Explicitly not built; identity adapter returns `not_configured` |

**Findings fixed this pass:** CSRF could block Razorpay webhooks if a session cookie was present — exempted provider/partner paths. Payment.failed now triggers audited email + org webhook.

**Residual (operational, not code blockers):**

- CA sign-off before production INR GST display
- WhatsApp Meta template approval (Gupshup adapter ready)
- WorkOS / Mux / Resend keys for live channels
- Postgres PITR restore drill on Render

---

## Tests

```
pnpm test   # 28 passed (authz, tenant, registration/webhook, check-in, discovery, security)
pnpm build  # success
```

Vitest loads `.env` and forces `DATABASE_URL` from file so shadow-DB env vars do not break CI/local.

---

## How to verify quickly

1. `pnpm db:seed && pnpm dev` → http://localhost:43123  
2. Open `/discover` → demo event → Register  
3. Sign in (console magic link) → `/orgs/delhi-demo` → settings / attendees / check-in  
4. Ticket URL from seed console → `/e/.../app?token=...`  
5. Live health: Render + Vercel `/health`

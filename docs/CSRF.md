# CSRF strategy

Eventsliner uses a **defense-in-depth** approach for cross-site request forgery protection on mutating API routes.

## Mechanisms

1. **SameSite=Lax session cookie** — cross-site POSTs from third-party origins do not include the session cookie in most cases.
2. **Origin / Referer check** — mutating handlers reject requests when `Origin` or `Referer` is present and does not match `APP_URL` (or allowed staging/prod hosts).
3. **Custom header for JSON APIs** — clients send `X-Requested-With: XMLHttpRequest` (or fetch from same-origin pages which always include Origin).

## Routes

| Method | CSRF |
|--------|------|
| GET / HEAD | Not required |
| POST / PATCH / PUT / DELETE under `/api/` | Origin check + session cookie |

## Server Actions

Prefer Route Handlers for auth and org mutations in Phase 0. If Server Actions are added later, use Next.js built-in CSRF for actions.

## Logout

`POST /api/v1/auth/logout` clears the HttpOnly session cookie. Safe with SameSite=Lax.

## Future

If we add cross-origin SPA clients, issue a synchronizer token stored in a non-HttpOnly cookie and require `X-CSRF-Token` header matching.

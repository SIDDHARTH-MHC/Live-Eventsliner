# 21. Platform standards (binding)

Eventsliner Live maps four external standards into concrete product rules. Agents and humans **MUST** follow these; slogans without implementation do not count.

| Hub | What we take from it | Binding Eventsliner doc / code |
|-----|----------------------|--------------------------------|
| [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) | Operational excellence, security, reliability, performance, cost, sustainability | This doc §1 · `.cursor/rules/well-architected.mdc` |
| [Google API Design Guide](https://cloud.google.com/apis/design) | Resource-oriented HTTP APIs, AIP-193 errors, AIP-158 pagination, versioning | This doc §2 · `.cursor/rules/api-design.mdc` · `src/lib/api/*` |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | Interaction, a11y, touch, writing, modality | [16-design-system.md](16-design-system.md) · `.cursor/rules/design-system.mdc` |
| [Google Design](https://design.google/) → Material 3 | Structure, tokens, type roles, states, layout | [16-design-system.md](16-design-system.md) · [m3.material.io](https://m3.material.io/) |

---

## 1. AWS Well-Architected (six pillars)

Eventsliner is a **modular monolith** (Next.js + Postgres + Redis). We apply Well-Architected as **design questions and defaults**, not as “must run on AWS.” Hosting may be Render/Vercel/AWS; the pillars still apply.

### 1.1 Operational excellence

| Practice | Eventsliner implementation |
|----------|----------------------------|
| Structured logs | JSON logs with `requestId` via `withApiContext` |
| Health checks | `GET /health` — DB connectivity |
| IaC / blueprint | `render.yaml`, `vercel.json` |
| Runbooks | `docs/DEPLOYMENT.md`, `docs/VERCEL_DEPLOY.md` |
| Small reversible changes | Feature work in phases; migrate-on-deploy |

**MUST:** Never ship without a health endpoint. Prefer stdout JSON logs over ad-hoc `console.log` in new API code.

### 1.2 Security

| Practice | Eventsliner implementation |
|----------|----------------------------|
| AuthN / AuthZ | Sessions + OTP; `can()` authz; API keys hashed + scoped |
| CSRF | Origin checks on mutating session APIs; docs/CSRF.md |
| Transport | HTTPS in prod; HSTS via middleware |
| Secrets | Env vars only; never commit tokens |
| Webhooks | HMAC verification (Razorpay); partner routes scoped |
| Least privilege | Org roles; staff check-in scopes |
| Audit | `auditLog` on sensitive org actions |
| Headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |

**MUST:** Permission denied before existence leaks (`PERMISSION_DENIED` / 403 before confirming a resource exists when the caller lacks access — Google AIP + Well-Architected).

### 1.3 Reliability

| Practice | Eventsliner implementation |
|----------|----------------------------|
| Multi-AZ / managed DB | Managed Postgres (Render/Neon) |
| Idempotent payments | Order + webhook reconciliation |
| Graceful degradation | Redis optional → in-memory; email/SMS console fallbacks |
| Migrations | Prisma migrate deploy on start/build |

### 1.4 Performance efficiency

| Practice | Eventsliner implementation |
|----------|----------------------------|
| Region | Prefer India / Singapore (ap-south / bom1 / singapore) for PII latency |
| Caching | Redis for OTP / rate limits; CDN for static |
| Right-sizing | Free/starter plans for prototype; vertical scale later |

### 1.5 Cost optimization

| Practice | Eventsliner implementation |
|----------|----------------------------|
| One app | Modular monolith — no premature microservices |
| Pay-for-use optional | Serverless on Vercel for burst; Render for always-on |
| Free-tier awareness | Document spin-down / DB expiry on free plans |

### 1.6 Sustainability

| Practice | Eventsliner implementation |
|----------|----------------------------|
| Efficient software | Avoid chatty APIs; paginate lists (AIP-158) |
| Region proximity | Serve users near India when possible |

---

## 2. Google API Design Guide

Canonical: [cloud.google.com/apis/design](https://cloud.google.com/apis/design).

### 2.1 Versioning & surface

- Public HTTP API under `/api/v1/...`
- Resource-oriented paths: `/api/v1/orgs/{org}/events/{event}/...`
- Collections return lists; create returns `201` + resource

### 2.2 Errors (AIP-193)

All `errorJson()` responses use HTTP/JSON shape:

```json
{
  "error": {
    "code": 404,
    "message": "Event not found",
    "status": "NOT_FOUND",
    "reason": "NOT_FOUND",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "NOT_FOUND",
        "domain": "eventsliner.live"
      }
    ]
  }
}
```

- `code` = HTTP status  
- `status` = `google.rpc.Code` name  
- `reason` = Eventsliner UPPER_SNAKE machine id (`ErrorInfo.reason`)  
- Validation: `BadRequest.fieldViolations` + convenience `error.fields`

Implementation: `src/lib/api/errors.ts`, `src/lib/api/response.ts`.

### 2.3 Pagination (AIP-158)

List methods accept `pageSize` + `pageToken` and return `nextPageToken`.

Implementation: `src/lib/api/pagination.ts` (wired on discover + audit logs; extend other lists over time).

### 2.4 Naming

- JSON field names: `lowerCamelCase`
- Resource IDs opaque strings
- Standard methods: Get / List / Create / Update / Delete semantics

---

## 3. Apple HIG + Google Design (UI)

Unchanged authority: [16-design-system.md](16-design-system.md).

- **Google Design** → Material 3 for tokens, type roles, states, layout  
- **Apple HIG** → touch targets, a11y, writing, modality, press states, safe areas  

Do not invent a third visual language. shadcn/ui is a kit only.

---

## 4. Compliance checklist (before merging API/UI)

- [ ] Errors via `errorJson` / `withApiContext` (no raw `NextResponse.json({ error: "…" })`)
- [ ] New list endpoints paginated (`pageSize` / `pageToken`)
- [ ] Authz before existence for private resources
- [ ] Security headers still applied (middleware)
- [ ] UI uses design tokens; 48px targets; focus-visible; empty/loading/error
- [ ] No secrets in client bundles or git
- [ ] `/health` still green after deploy

---

## Related

- Architecture: [07-architecture.md](07-architecture.md)  
- CSRF: [CSRF.md](CSRF.md)  
- Verification: [19-verification-report.md](19-verification-report.md)

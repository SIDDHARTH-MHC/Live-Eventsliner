# 21. Third-party integration strategy

**Rule:** if a capability is regulated, commoditized, or has a better specialist, integrate. Build the domain and orchestration.

India-first filters: UPI, GST, WhatsApp, phone OTP, Mumbai/Delhi latency, INR pricing, support hours that overlap IST.

---

## 21.1 Master table

| Capability | Build ourselves? | Integrate? | Initial provider options | Reason |
|------------|------------------|------------|--------------------------|--------|
| Event/org/attendee domain | **Yes** | | | This is the product |
| Registration engine | **Yes** | | | Workflow + state |
| Ticket inventory | **Yes** | | | Oversell is our bug |
| Checkout UX | **Yes** | Hosted widget | Razorpay Checkout | We own funnel; they own cards |
| Payment processing | No | **Yes** | **Razorpay** (Cashfree backup) | UPI, Route, webhooks, India default |
| Refunds / settlement | Orchestrate | **Yes** | Razorpay | Do not hold funds if we can avoid it |
| GST calculation | Light **yes** | CA/advisory | | Store breakup; not a tax product |
| Email transport | No | **Yes** | **Resend** or **SES** | Deliverability |
| Email templates / triggers | **Yes** | | | Communication engine |
| SMS OTP | No | **Yes** | **MSG91** (Twilio backup) | India DLT, price |
| WhatsApp transport | No | **Yes** | **Gupshup** or **Interakt** | BSP, templates, scale |
| WhatsApp orchestration | **Yes** | | | Triggers, consent |
| Push | Thin **yes** | Web Push / FCM later | | PWA first |
| QR generation | **Yes** | | | Standard library |
| QR scanning | **Yes** | Browser APIs | | |
| Badge printing hardware | No | **Yes** | Zebra, Brother, Evolis, QZ Tray | |
| RFID / NFC / turnstile | No | Later partner | HID, Impinj, venue vendors | |
| Facial recognition | **No** | Only if ever: certified vendor | | Legal + accuracy |
| Aadhaar / UIDAI | **No** | Certified OVSE vendor if a govt deal | IDfy / HyperVerge / in-house cert **later** | Not a startup weekend feature |
| Other KYC / PAN | No | IDfy, HyperVerge | Enterprise |
| Video rooms | No | **Yes** | **Daily** or **100ms** | India PoPs, APIs |
| Livestream | No | **Yes** | **Mux** or **Cloudflare Stream** | Or YouTube unlisted to start |
| Chat | Later own or 3P | Daily, Stream | Don't build inbox v1 |
| Maps | No | **Yes** | **Google Maps** or Mapbox | Venue embed |
| Geocoding | No | Same | | |
| Search (attendee) | SQL first | **Typesense** later | Self-host or Cloud | |
| Product analytics | Optional | **PostHog** (self-host or EU/US — check PII) | Prefer first-party for event-day metrics |
| Error tracking | No | **Sentry** | |
| Object storage | No | **S3 ap-south-1** or R2 | Ephemeral disks |
| CDN / WAF / captcha | No | **Cloudflare** + Turnstile | |
| Auth SSO | No | **WorkOS** | Phase 9 |
| Image optimize | No | Cloudflare Images / imgproxy | |
| eSign | No | Later | |
| CRM push | No | HubSpot, Zoho, Salesforce | Phase 9 webhooks |
| Calendar | Light **yes** | ICS file | Enough |
| Slack | No | Incoming webhook later | |
| Native wallets (Apple/Google) | Integrate | Passkit / native APIs | After ticket page exists |

---

## 21.2 Provider notes (India-first)

### Payments — Razorpay
- Best default. UPI is non-negotiable.
- Use **linked accounts / Route** so organizers get settlement, matching Dreamcast's "your earnings" story.
- International cards: Razorpay supports; Stripe as a second rail when we have USD events.

### Email — Resend vs SES
- Resend: faster DX, good for v1.
- SES: cheaper at scale, more knobs. Switch when the bill hurts.
- Register the sending domain immediately.

### WhatsApp — Gupshup vs Interakt vs WATI vs Twilio
- **Gupshup:** scale, India events, API-first.
- **Interakt / WATI:** more "CRM UI"; we need APIs, so prefer Gupshup if engineering-led.
- Twilio: global, pricier, fine as fallback.
- Apply for Meta Business + template approval early. This is a **critical path item that is not code**.

### SMS — MSG91
- DLT registration is required in India. Start this with legal entity documents as soon as the company can. Another non-code critical path.

### Video — Daily / 100ms / Mux
- 100ms and Agora have strong India media infra.
- Daily is the fastest to a WebRTC room.
- Mux is the right livestream/VOD abstraction.
- LiveKit self-host is tempting and wrong for v1.

### Identity verification
- IDfy / HyperVerge if a customer pays for KYC.
- Aadhaar offline verification only as UIDAI-certified entity. Treat as a **separate regulated product**.

### Printing
- Zebra + QZ Tray is the standard "we don't manufacture kiosks" stack.

---

## 21.3 Integration architecture

Every provider gets:

```
adapters/razorpay/{createOrder,refund,verifyWebhook}
adapters/email/{send}
adapters/sms/{sendOtp}
```

Domain code speaks `PaymentsProvider`. Swapping Cashfree should not touch registration states.

Inbound webhooks: raw body → verify → persist → enqueue handler. Never do heavy work in the HTTP request if it can fail.

---

## 21.4 What we will be asked and should refuse to custom-build

- "Can you just integrate our old Excel as the source of truth?" — Import CSV, then Eventsliner is source of truth.
- "Can you take cash at the gate and reconcile later?" — Walk-in + mark `method=cash` later; not a ledger product.
- "Can you build our 3D expo?" — No. Introduce a partner.
- "Can you do Aadhaar this month?" — No.

import { createHmac, createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
  MockRazorpayProvider,
  RazorpayProvider,
} from "@/lib/payments/razorpay";
import { generateMockWebhookSignature } from "@/lib/payments/webhook";
import { hasScope, type ApiKeyContext } from "@/lib/api/api-key-auth";
import { QzTrayBadgePartner, OptInIdentityPartner } from "@/lib/partners/hardware";
import { verifyTotp } from "@/lib/auth/totp";

describe("Razorpay webhook signature", () => {
  it("mock provider accepts HMAC of body with mock secret", () => {
    const provider = new MockRazorpayProvider();
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = generateMockWebhookSignature(body);
    expect(provider.verifyWebhookSignature(body, sig)).toBe(true);
  });

  it("mock provider rejects wrong signature", () => {
    const provider = new MockRazorpayProvider();
    expect(provider.verifyWebhookSignature("{}", "deadbeef")).toBe(false);
  });

  it("live provider verifies with RAZORPAY_WEBHOOK_SECRET", () => {
    const secret = "whsec_test_123";
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const provider = new RazorpayProvider({ keyId: "rzp_test", keySecret: "secret" });
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(provider.verifyWebhookSignature(body, sig)).toBe(true);
    expect(provider.verifyWebhookSignature(body, "bad")).toBe(false);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it("live payment signature uses key secret", () => {
    const provider = new RazorpayProvider({ keyId: "rzp_test", keySecret: "key_secret" });
    const orderId = "order_1";
    const paymentId = "pay_1";
    const sig = createHmac("sha256", "key_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(provider.verifyPaymentSignature(orderId, paymentId, sig)).toBe(true);
  });
});

describe("API key scopes", () => {
  it("hasScope matches exact and wildcard", () => {
    const ctx: ApiKeyContext = { orgId: "o1", scopes: ["events:read"], keyId: "k1" };
    expect(hasScope(ctx, "events:read")).toBe(true);
    expect(hasScope(ctx, "attendees:read")).toBe(false);
    expect(hasScope({ ...ctx, scopes: ["*"] }, "attendees:read")).toBe(true);
  });

  it("hashes keys with sha256 (contract)", () => {
    const raw = "el_test_key_abc";
    const hash = createHash("sha256").update(raw).digest("hex");
    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(raw);
  });
});

describe("partner hardware contracts", () => {
  it("builds QZ/Zebra badge payload", async () => {
    const partner = new QzTrayBadgePartner();
    const payload = await partner.buildPayload({
      attendeeId: "a1",
      publicId: "pub123456789",
      displayName: "Priya Sharma",
      ticketType: "General",
      eventTitle: "Delhi Workshop",
      format: "zpl",
    });
    expect(payload.zpl).toContain("^XA");
    expect(payload.zpl).toContain("pub123456789");
  });

  it("identity partner returns not_configured without keys", async () => {
    delete process.env.IDFY_API_KEY;
    delete process.env.HYPERVERGE_API_KEY;
    const partner = new OptInIdentityPartner();
    const result = await partner.verify({
      provider: "idfy",
      attendeeId: "a1",
      purpose: "kyc",
    });
    expect(result.status).toBe("not_configured");
  });
});

describe("TOTP verification", () => {
  it("rejects wrong code", () => {
    expect(verifyTotp("AAAAAAAAAAAAAAAAAAAA", "000000")).toBe(false);
  });
});

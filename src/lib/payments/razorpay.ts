import { createHmac } from "crypto";

export type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
};

export type CreateOrderParams = {
  amountCents: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<RazorpayOrder>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  refundPayment?(paymentId: string, amountCents: number): Promise<{ id: string }>;
}

export class MockRazorpayProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
    const id = `order_mock_${params.receipt}`;
    console.log(
      JSON.stringify({
        type: "razorpay_mock_order",
        id,
        amount: params.amountCents,
        receipt: params.receipt,
      }),
    );
    return {
      id,
      amount: params.amountCents,
      currency: params.currency,
      receipt: params.receipt,
      status: "created",
    };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expected = createHmac("sha256", "mock_webhook_secret").update(body).digest("hex");
    return signature === expected || signature === "mock_valid_signature";
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac("sha256", "mock_key_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return signature === expected || signature === "mock_valid_signature";
  }

  async refundPayment(paymentId: string, amountCents: number) {
    console.log(JSON.stringify({ type: "razorpay_mock_refund", paymentId, amountCents }));
    return { id: `rfnd_mock_${paymentId}` };
  }
}

export class RazorpayProvider implements PaymentProvider {
  constructor(private creds: RazorpayCredentials) {}

  async createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
    const auth = Buffer.from(`${this.creds.keyId}:${this.creds.keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`RAZORPAY_ORDER_FAILED:${err}`);
    }

    return res.json() as Promise<RazorpayOrder>;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return false;
    const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");
    return expected === signature;
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac("sha256", this.creds.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }

  async refundPayment(paymentId: string, amountCents: number) {
    const auth = Buffer.from(`${this.creds.keyId}:${this.creds.keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountCents }),
    });
    if (!res.ok) throw new Error("RAZORPAY_REFUND_FAILED");
    return res.json() as Promise<{ id: string }>;
  }
}

export function getOrgPaymentProvider(org: {
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
}): PaymentProvider {
  if (org.razorpayKeyId && org.razorpayKeySecret) {
    return new RazorpayProvider({
      keyId: org.razorpayKeyId,
      keySecret: org.razorpayKeySecret,
    });
  }

  const envKeyId = process.env.RAZORPAY_KEY_ID;
  const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (envKeyId && envKeySecret) {
    return new RazorpayProvider({ keyId: envKeyId, keySecret: envKeySecret });
  }

  return new MockRazorpayProvider();
}

export function getPublicKeyId(org: { razorpayKeyId: string | null }): string {
  if (org.razorpayKeyId) return org.razorpayKeyId;
  return process.env.RAZORPAY_KEY_ID ?? "rzp_test_mock";
}

export function isMockPaymentMode(org: {
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
}): boolean {
  return getOrgPaymentProvider(org) instanceof MockRazorpayProvider;
}

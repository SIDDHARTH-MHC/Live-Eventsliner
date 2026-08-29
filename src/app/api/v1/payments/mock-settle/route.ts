import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { generateMockWebhookSignature } from "@/lib/payments/webhook";
import { handleRazorpayWebhook } from "@/lib/payments/webhook";
import { isMockPaymentMode } from "@/lib/payments/razorpay";

/** Mock payment settlement — simulates Razorpay webhook when keys unset. */
export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const body = (await req.json()) as { orderId: string; paymentId?: string };
    if (!body.orderId) return errorJson(400, "BAD_REQUEST", "orderId required");

    const order = await db.order.findUnique({
      where: { id: body.orderId },
      include: { event: { include: { org: true } } },
    });
    if (!order) return errorJson(404, "NOT_FOUND", "Order not found");

    if (!isMockPaymentMode(order.event.org)) {
      return errorJson(400, "LIVE_MODE", "Use Razorpay checkout in live mode");
    }

    const paymentId = body.paymentId ?? `pay_mock_${order.id}`;
    const webhookPayload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: order.providerOrderId,
            amount: order.totalCents,
            status: "captured",
            method: "upi",
          },
        },
      },
    };

    const rawBody = JSON.stringify(webhookPayload);
    const signature = generateMockWebhookSignature(rawBody);
    const result = await handleRazorpayWebhook(rawBody, signature);

    return json({ ...result, paymentId });
  });
}

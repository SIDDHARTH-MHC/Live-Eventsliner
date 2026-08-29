import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { confirmRegistrationFromPayment } from "@/lib/registration/service";
import { getOrgPaymentProvider } from "@/lib/payments/razorpay";
import { log } from "@/lib/observability/logger";

type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        method?: string;
      };
    };
  };
};

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string,
): Promise<{ ok: boolean; message: string }> {
  const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;

  const paymentEntity = payload.payload?.payment?.entity;
  if (!paymentEntity) {
    return { ok: true, message: "ignored_no_payment" };
  }

  const order = await db.order.findFirst({
    where: { providerOrderId: paymentEntity.order_id },
    include: { event: { include: { org: true } } },
  });

  if (!order) {
    log("warn", "webhook_order_not_found", { providerOrderId: paymentEntity.order_id });
    return { ok: true, message: "order_not_found" };
  }

  const provider = getOrgPaymentProvider(order.event.org);
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return { ok: false, message: "invalid_signature" };
  }

  if (payload.event === "payment.captured" || payload.event === "payment.authorized") {
    if (paymentEntity.status !== "captured" && paymentEntity.status !== "authorized") {
      return { ok: true, message: "ignored_status" };
    }

    const result = await confirmRegistrationFromPayment(order.id, paymentEntity.id);

    if (!result.alreadyProcessed) {
      await db.payment.updateMany({
        where: { providerPaymentId: paymentEntity.id },
        data: {
          method: paymentEntity.method ?? undefined,
          rawLastPayload: JSON.parse(rawBody) as object,
        },
      });
    }

    return {
      ok: true,
      message: result.alreadyProcessed ? "already_processed" : "confirmed",
    };
  }

  if (payload.event === "payment.failed") {
    log("info", "payment_failed", { orderId: order.id, paymentId: paymentEntity.id });
    return { ok: true, message: "payment_failed_logged" };
  }

  return { ok: true, message: "ignored_event" };
}

export function generateMockWebhookSignature(body: string): string {
  return createHmac("sha256", "mock_webhook_secret").update(body).digest("hex");
}

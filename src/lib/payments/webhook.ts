import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { confirmRegistrationFromPayment } from "@/lib/registration/service";
import {
  getOrgPaymentProvider,
  MockRazorpayProvider,
  RazorpayProvider,
} from "@/lib/payments/razorpay";
import { log } from "@/lib/observability/logger";
import { sendTriggeredMessage } from "@/lib/comms/engine";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";

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

function getPlatformWebhookVerifier() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new RazorpayProvider({
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return new MockRazorpayProvider();
}

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string,
): Promise<{ ok: boolean; message: string }> {
  // When RAZORPAY_WEBHOOK_SECRET is set, reject bad signatures before any DB work.
  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    const platform = getPlatformWebhookVerifier();
    if (!platform.verifyWebhookSignature(rawBody, signature)) {
      return { ok: false, message: "invalid_signature" };
    }
  }

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
    const registration = await db.registration.findFirst({
      where: { orderId: order.id },
    });
    if (registration) {
      const appUrl = process.env.APP_URL ?? "http://localhost:43123";
      const slug = order.event.publicSlug ?? order.event.slug;
      const firstName = (order.buyerName ?? "there").split(" ")[0] ?? "there";
      try {
        await sendTriggeredMessage({
          trigger: "payment.failed",
          orgId: order.orgId,
          eventId: order.eventId,
          to: order.buyerEmail,
          phone: order.buyerPhone ?? undefined,
          vars: {
            firstName,
            eventTitle: order.event.title,
            checkoutUrl: `${appUrl}/e/${slug}/register/${registration.id}/checkout`,
          },
          channels: ["email"],
        });
      } catch (e) {
        log("warn", "payment_failed_comms_error", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      await dispatchWebhook(order.orgId, "payment.failed", {
        orderId: order.id,
        registrationId: registration.id,
        providerPaymentId: paymentEntity.id,
      });
    }
    return { ok: true, message: "payment_failed_logged" };
  }

  return { ok: true, message: "ignored_event" };
}

export function generateMockWebhookSignature(body: string): string {
  return createHmac("sha256", "mock_webhook_secret").update(body).digest("hex");
}

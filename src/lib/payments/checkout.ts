import { db } from "@/lib/db";
import { getOrgPaymentProvider, getPublicKeyId, isMockPaymentMode } from "@/lib/payments/razorpay";
import { HOLD_TTL_SECONDS } from "@/lib/registration/inventory";

export async function createCheckout(registrationId: string) {
  const registration = await db.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: {
      order: true,
      ticketType: true,
      event: { include: { org: true } },
    },
  });

  if (registration.status !== "pending_payment") {
    throw new Error("NOT_PENDING_PAYMENT");
  }

  if (!registration.order) {
    throw new Error("NO_ORDER");
  }

  if (registration.order.expiresAt && registration.order.expiresAt < new Date()) {
    throw new Error("ORDER_EXPIRED");
  }

  const provider = getOrgPaymentProvider(registration.event.org);
  const mock = isMockPaymentMode(registration.event.org);

  let providerOrderId = registration.order.providerOrderId;

  if (!providerOrderId) {
    const razorpayOrder = await provider.createOrder({
      amountCents: registration.order.totalCents,
      currency: registration.order.currency,
      receipt: registration.order.id,
      notes: {
        event_id: registration.eventId,
        registration_id: registration.id,
      },
    });

    await db.order.update({
      where: { id: registration.order.id },
      data: {
        providerOrderId: razorpayOrder.id,
        status: "pending",
        expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000),
      },
    });

    providerOrderId = razorpayOrder.id;
  }

  return {
    orderId: registration.order.id,
    providerOrderId,
    amountCents: registration.order.totalCents,
    currency: registration.order.currency,
    keyId: getPublicKeyId(registration.event.org),
    mock,
    registrationId: registration.id,
    eventTitle: registration.event.title,
    buyerName: registration.order.buyerName,
    buyerEmail: registration.order.buyerEmail,
    buyerPhone: registration.order.buyerPhone,
  };
}

export async function completeMockPayment(registrationId: string) {
  const registration = await db.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: { order: true, event: { include: { org: true } } },
  });

  if (!isMockPaymentMode(registration.event.org)) {
    throw new Error("NOT_MOCK_MODE");
  }

  if (!registration.order?.providerOrderId) {
    throw new Error("NO_PROVIDER_ORDER");
  }

  const paymentId = `pay_mock_${registration.order.id}`;
  const { confirmRegistrationFromPayment } = await import("@/lib/registration/service");
  return confirmRegistrationFromPayment(registration.order.id, paymentId);
}

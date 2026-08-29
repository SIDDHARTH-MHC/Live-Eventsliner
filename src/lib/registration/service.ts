import { db } from "@/lib/db";
import type { RegistrationMode, Prisma } from "@prisma/client";
import {
  mergeFormSchema,
  validateAnswers,
  type FormSchema,
} from "@/lib/registration/form-schema";
import { acquireHold, HOLD_TTL_SECONDS, releaseHoldsForOrder } from "@/lib/registration/inventory";
import { onSubmit, requiresPayment } from "@/lib/registration/state-machine";
import { materializeAttendee, revokeAttendee } from "@/lib/attendees/materialize";
import { getOrgPaymentProvider } from "@/lib/payments/razorpay";
import { track } from "@/lib/analytics/track";

export type CreateRegistrationInput = {
  eventSlug: string;
  ticketTypeId: string;
  answers: Record<string, unknown>;
  rsvpResponse?: "yes" | "no";
  sessionId?: string;
  utm?: Record<string, unknown>;
};

export async function createRegistration(input: CreateRegistrationInput) {
  const event = await db.event.findFirst({
    where: {
      publicSlug: input.eventSlug,
      status: "published",
      visibility: { in: ["public", "unlisted"] },
    },
    include: { org: true },
  });

  if (!event) throw new Error("EVENT_NOT_FOUND");

  const ticketType = await db.ticketType.findFirst({
    where: {
      id: input.ticketTypeId,
      eventId: event.id,
      isActive: true,
      visibility: "public",
    },
  });

  if (!ticketType) throw new Error("TICKET_NOT_FOUND");

  const now = new Date();
  if (ticketType.salesStartsAt && ticketType.salesStartsAt > now) {
    throw new Error("SALES_NOT_STARTED");
  }
  if (ticketType.salesEndsAt && ticketType.salesEndsAt < now) {
    throw new Error("SALES_ENDED");
  }

  const formSchema = mergeFormSchema(
    event.registrationFormSchema as FormSchema | null,
    ticketType.formSchema as FormSchema | null,
  );

  const validation = validateAnswers(formSchema, input.answers);
  if (!validation.ok) {
    throw new Error(`VALIDATION_ERROR:${JSON.stringify(validation.errors)}`);
  }

  const ctx = {
    mode: ticketType.mode as RegistrationMode,
    priceCents: ticketType.priceCents,
    rsvpResponse: input.rsvpResponse,
  };

  const nextStatus = onSubmit(ctx);
  const needsPayment = requiresPayment(ctx) && nextStatus === "pending_payment";

  await track("register_start", {
    orgId: event.orgId,
    eventId: event.id,
    properties: { ticketTypeId: ticketType.id },
  });

  if (needsPayment) {
    const { firstName, lastName, email, phone } = extractFromAnswers(input.answers);
    const hold = await acquireHold({
      ticketTypeId: ticketType.id,
      registrationId: undefined,
      sessionId: input.sessionId,
    });

    const order = await db.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          eventId: event.id,
          orgId: event.orgId,
          buyerEmail: email,
          buyerPhone: phone,
          buyerName: `${firstName} ${lastName}`.trim(),
          status: "pending",
          subtotalCents: ticketType.priceCents,
          totalCents: ticketType.priceCents,
          currency: ticketType.currency,
          gstinSeller: event.org.gstin,
          expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000),
        },
      });

      const registration = await tx.registration.create({
        data: {
          eventId: event.id,
          orgId: event.orgId,
          ticketTypeId: ticketType.id,
          orderId: createdOrder.id,
          status: "pending_payment",
          answers: input.answers as Prisma.InputJsonValue,
          utm: input.utm as Prisma.InputJsonValue,
        },
      });

      await tx.inventoryHold.update({
        where: { id: hold.holdId },
        data: { orderId: createdOrder.id, registrationId: registration.id },
      });

      for (const field of formSchema.fields) {
        if (field.type === "consent" && input.answers[field.id] === true) {
          await tx.consentRecord.create({
            data: {
              registrationId: registration.id,
              kind: field.id === "terms" ? "terms" : field.id,
              version: field.version ?? "1",
              accepted: true,
            },
          });
        }
      }

      return { order: createdOrder, registration };
    });

    return {
      registration: order.registration,
      order: order.order,
      requiresPayment: true,
      holdExpiresAt: hold.expiresAt,
    };
  }

  const registration = await db.$transaction(async (tx) => {
    const reg = await tx.registration.create({
      data: {
        eventId: event.id,
        orgId: event.orgId,
        ticketTypeId: ticketType.id,
        status: nextStatus,
        answers: input.answers as Prisma.InputJsonValue,
        utm: input.utm as Prisma.InputJsonValue,
        confirmedAt: nextStatus === "confirmed" ? new Date() : null,
      },
    });

    for (const field of formSchema.fields) {
      if (field.type === "consent" && input.answers[field.id] === true) {
        await tx.consentRecord.create({
          data: {
            registrationId: reg.id,
            kind: field.id === "terms" ? "terms" : field.id,
            version: field.version ?? "1",
            accepted: true,
          },
        });
      }
    }

    if (nextStatus === "confirmed") {
      await tx.ticketType.update({
        where: { id: ticketType.id },
        data: { soldCount: { increment: 1 } },
      });
    }

    return reg;
  });

  if (registration.status === "confirmed") {
    await materializeAttendee(registration.id);
  }

  return {
    registration,
    order: null,
    requiresPayment: false,
    holdExpiresAt: null,
  };
}

function extractFromAnswers(answers: Record<string, unknown>) {
  return {
    firstName: String(answers.first_name ?? "").trim(),
    lastName: String(answers.last_name ?? "").trim(),
    email: String(answers.email ?? "")
      .trim()
      .toLowerCase(),
    phone: answers.phone ? String(answers.phone).replace(/\s/g, "") : null,
  };
}

export async function confirmRegistrationFromPayment(orderId: string, paymentId: string) {
  const existing = await db.payment.findUnique({ where: { providerPaymentId: paymentId } });
  if (existing) {
    const reg = await db.registration.findFirst({ where: { orderId } });
    return { alreadyProcessed: true, registration: reg };
  }

  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      registrations: { include: { ticketType: true } },
      inventoryHolds: true,
    },
  });

  if (order.status === "paid") {
    const reg = order.registrations[0];
    return { alreadyProcessed: true, registration: reg };
  }

  const registration = order.registrations[0];
  if (!registration) throw new Error("NO_REGISTRATION");

  if (order.expiresAt && order.expiresAt < new Date()) {
    throw new Error("ORDER_EXPIRED");
  }

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        providerPaymentId: paymentId,
        status: "captured",
        amountCents: order.totalCents,
        method: "unknown",
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "paid", paidAt: new Date() },
    });

    await tx.registration.update({
      where: { id: registration.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });

    await tx.ticketType.update({
      where: { id: registration.ticketTypeId },
      data: { soldCount: { increment: 1 } },
    });

    for (const hold of order.inventoryHolds) {
      await tx.inventoryHold.delete({ where: { id: hold.id } }).catch(() => undefined);
    }
  });

  await materializeAttendee(registration.id);

  await track("payment_succeeded", {
    orgId: order.orgId,
    eventId: order.eventId,
    properties: { orderId, paymentId },
  });

  return { alreadyProcessed: false, registration };
}

export async function cancelRegistration(registrationId: string, actorId?: string) {
  const registration = await db.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: { order: true, ticketType: true, event: { include: { org: true } } },
  });

  if (registration.status === "cancelled" || registration.status === "expired") {
    return registration;
  }

  const wasConfirmed = registration.status === "confirmed";

  await db.$transaction(async (tx) => {
    await tx.registration.update({
      where: { id: registrationId },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    if (wasConfirmed) {
      await tx.ticketType.update({
        where: { id: registration.ticketTypeId },
        data: { soldCount: { decrement: 1 } },
      });
    }

    if (registration.order && registration.order.status === "pending") {
      await tx.order.update({
        where: { id: registration.order.id },
        data: { status: "expired" },
      });
    }
  });

  if (registration.order) {
    await releaseHoldsForOrder(registration.order.id);
  }

  if (wasConfirmed) {
    await revokeAttendee(registrationId, "cancelled_by_organizer");
  }

  if (wasConfirmed && registration.order?.status === "paid") {
    const provider = getOrgPaymentProvider(registration.event.org);
    const payment = await db.payment.findFirst({
      where: { orderId: registration.order.id, status: "captured" },
    });
    if (payment && provider.refundPayment) {
      const refund = await provider.refundPayment(
        payment.providerPaymentId,
        payment.amountCents,
      );
      await db.refund.create({
        data: {
          orderId: registration.order.id,
          paymentId: payment.id,
          amountCents: payment.amountCents,
          reason: "organizer_cancel",
          status: "processed",
          providerRefundId: refund.id,
          createdById: actorId,
        },
      });
      await db.order.update({
        where: { id: registration.order.id },
        data: { status: "refunded" },
      });
    }
  }

  return db.registration.findUniqueOrThrow({ where: { id: registrationId } });
}

export async function orgHasPaidTickets(eventId: string): Promise<boolean> {
  const count = await db.ticketType.count({
    where: {
      eventId,
      isActive: true,
      priceCents: { gt: 0 },
    },
  });
  return count > 0;
}

export async function orgHasRazorpayConnected(orgId: string): Promise<boolean> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (org.razorpayKeyId && org.razorpayKeySecret) return true;
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

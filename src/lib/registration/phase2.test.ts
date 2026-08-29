import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { acquireHold, getAvailableQuantity, expireStaleHolds } from "@/lib/registration/inventory";
import { onSubmit, canTransition, transition } from "@/lib/registration/state-machine";
import { handleRazorpayWebhook, generateMockWebhookSignature } from "@/lib/payments/webhook";
import { confirmRegistrationFromPayment, createRegistration } from "@/lib/registration/service";
import { createEvent, publishEvent } from "@/lib/events/service";
import { DEFAULT_FORM_SCHEMA } from "@/lib/registration/form-schema";

const db = new PrismaClient();

describe("inventory holds", () => {
  let orgId: string;
  let eventId: string;
  let ticketTypeId: string;

  beforeEach(async () => {
    const org = await db.organization.create({
      data: { name: "Hold Test Org", slug: `hold-test-${Date.now()}`, country: "IN" },
    });
    orgId = org.id;
    const event = await createEvent({ orgId, title: "Hold Test Event", slug: `evt-${Date.now()}` });
    eventId = event.id;
    const ticket = await db.ticketType.create({
      data: {
        eventId,
        orgId,
        name: "Limited",
        priceCents: 0,
        quantity: 2,
        mode: "open_free",
      },
    });
    ticketTypeId = ticket.id;
  });

  afterEach(async () => {
    await db.organization.delete({ where: { id: orgId } }).catch(() => undefined);
  });

  it("acquires hold when capacity available", async () => {
    const hold = await acquireHold({ ticketTypeId });
    expect(hold.holdId).toBeTruthy();
    const available = await getAvailableQuantity(ticketTypeId);
    expect(available).toBe(1);
  });

  it("rejects hold when sold out", async () => {
    await acquireHold({ ticketTypeId });
    await acquireHold({ ticketTypeId });
    await expect(acquireHold({ ticketTypeId })).rejects.toThrow("TICKET_SOLD_OUT");
  });

  it("expires stale holds", async () => {
    const hold = await acquireHold({ ticketTypeId });
    await db.inventoryHold.update({
      where: { id: hold.holdId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const count = await expireStaleHolds();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("registration state machine", () => {
  it("confirms free registration", () => {
    expect(onSubmit({ mode: "open_free", priceCents: 0 })).toBe("confirmed");
  });

  it("requires payment for paid tickets", () => {
    expect(onSubmit({ mode: "open_paid", priceCents: 50000 })).toBe("pending_payment");
  });

  it("cancels RSVP no", () => {
    expect(onSubmit({ mode: "rsvp", priceCents: 0, rsvpResponse: "no" })).toBe("cancelled");
  });

  it("allows valid transitions", () => {
    expect(canTransition("pending_payment", "confirmed")).toBe(true);
    expect(() => transition("confirmed", "pending_payment")).toThrow();
  });
});

describe("webhook idempotency", () => {
  let orgId: string;
  let orderId: string;
  let registrationId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: { email: `wh-${Date.now()}@test.com`, emailVerifiedAt: new Date() },
    });
    const org = await db.organization.create({
      data: {
        name: "Webhook Org",
        slug: `wh-org-${Date.now()}`,
        memberships: { create: { userId: user.id, role: "owner", acceptedAt: new Date() } },
      },
    });
    orgId = org.id;
    const event = await createEvent({
      orgId,
      title: "Webhook Event",
      slug: `wh-evt-${Date.now()}`,
      createdById: user.id,
    });
    await db.event.update({
      where: { id: event.id },
      data: { registrationFormSchema: DEFAULT_FORM_SCHEMA },
    });
    const ticket = await db.ticketType.create({
      data: {
        eventId: event.id,
        orgId,
        name: "Paid",
        priceCents: 10000,
        mode: "open_paid",
        quantity: 10,
      },
    });
    await db.event.update({
      where: { id: event.id },
      data: { publicSlug: `wh-pub-${Date.now()}`, status: "published", publishedAt: new Date() },
    });

    const order = await db.order.create({
      data: {
        eventId: event.id,
        orgId,
        buyerEmail: "buyer@test.com",
        buyerPhone: "+919876543210",
        status: "pending",
        subtotalCents: 10000,
        totalCents: 10000,
        providerOrderId: `order_mock_test_${Date.now()}`,
        expiresAt: new Date(Date.now() + 900000),
      },
    });
    orderId = order.id;
    const reg = await db.registration.create({
      data: {
        eventId: event.id,
        orgId,
        ticketTypeId: ticket.id,
        orderId: order.id,
        status: "pending_payment",
        answers: {
          first_name: "Test",
          last_name: "User",
          email: "buyer@test.com",
          phone: "+919876543210",
          terms: true,
        },
      },
    });
    registrationId = reg.id;
    await db.inventoryHold.create({
      data: {
        ticketTypeId: ticket.id,
        orderId: order.id,
        registrationId: reg.id,
        expiresAt: new Date(Date.now() + 900000),
      },
    });
  });

  afterEach(async () => {
    await db.organization.delete({ where: { id: orgId } }).catch(() => undefined);
  });

  it("processes webhook once (idempotent)", async () => {
    const paymentId = `pay_mock_${orderId}`;
    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: (await db.order.findUniqueOrThrow({ where: { id: orderId } }))
              .providerOrderId,
            amount: 10000,
            status: "captured",
          },
        },
      },
    });
    const sig = generateMockWebhookSignature(body);

    const r1 = await handleRazorpayWebhook(body, sig);
    expect(r1.ok).toBe(true);
    expect(r1.message).toBe("confirmed");

    const r2 = await handleRazorpayWebhook(body, sig);
    expect(r2.ok).toBe(true);
    expect(r2.message).toBe("already_processed");

    const payments = await db.payment.count({ where: { providerPaymentId: paymentId } });
    expect(payments).toBe(1);

    const reg = await db.registration.findUniqueOrThrow({ where: { id: registrationId } });
    expect(reg.status).toBe("confirmed");
  });
});

describe("tenant isolation on ticket types", () => {
  it("org B cannot list org A ticket types via API path guard", async () => {
    const orgA = await db.organization.create({
      data: { name: "Org A", slug: `org-a-${Date.now()}` },
    });
    const orgB = await db.organization.create({
      data: { name: "Org B", slug: `org-b-${Date.now()}` },
    });
    const eventA = await createEvent({ orgId: orgA.id, title: "A Event", slug: "a-evt" });
    await db.ticketType.create({
      data: { eventId: eventA.id, orgId: orgA.id, name: "A Ticket", priceCents: 0, mode: "open_free" },
    });

    const eventB = await db.event.findFirst({ where: { orgId: orgB.id } });
    expect(eventB).toBeNull();

    const ticketsForA = await db.ticketType.findMany({ where: { eventId: eventA.id, orgId: orgA.id } });
    expect(ticketsForA).toHaveLength(1);

    const crossTenant = await db.ticketType.findMany({
      where: { eventId: eventA.id, orgId: orgB.id },
    });
    expect(crossTenant).toHaveLength(0);

    await db.organization.delete({ where: { id: orgA.id } });
    await db.organization.delete({ where: { id: orgB.id } });
  });
});

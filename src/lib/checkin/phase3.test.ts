import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { processCheckIn } from "@/lib/checkin/service";
import { generatePublicId } from "@/lib/credentials/public-id";
import { createHash, randomBytes } from "crypto";

const db = new PrismaClient();

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

describe("Phase 3 check-in", () => {
  let orgId: string;
  let eventId: string;
  let attendeeId: string;
  let credentialId: string;
  let publicId: string;

  beforeAll(async () => {
    const org = await db.organization.create({
      data: {
        name: "Check-in Test Org",
        slug: `checkin-test-${Date.now()}`,
      },
    });
    orgId = org.id;

    const event = await db.event.create({
      data: {
        orgId,
        title: "Check-in Test Event",
        slug: "checkin-test",
        publicSlug: `checkin-test-${Date.now()}`,
        status: "published",
        visibility: "public",
      },
    });
    eventId = event.id;

    const ticketType = await db.ticketType.create({
      data: {
        eventId,
        orgId,
        name: "General",
        priceCents: 0,
      },
    });

    const registration = await db.registration.create({
      data: {
        eventId,
        orgId,
        ticketTypeId: ticketType.id,
        status: "confirmed",
        confirmedAt: new Date(),
        answers: {},
      },
    });

    const attendee = await db.attendee.create({
      data: {
        eventId,
        orgId,
        registrationId: registration.id,
        ticketTypeId: ticketType.id,
        firstName: "Rahul",
        lastName: "Sharma",
        email: "rahul@test.example",
        status: "registered",
      },
    });
    attendeeId = attendee.id;

    publicId = generatePublicId();
    const credential = await db.credential.create({
      data: {
        attendeeId,
        eventId,
        publicId,
        secretHash: hashSecret(randomBytes(32).toString("base64url")),
        status: "active",
      },
    });
    credentialId = credential.id;
  });

  afterAll(async () => {
    await db.checkIn.deleteMany({ where: { eventId } });
    await db.credential.deleteMany({ where: { eventId } });
    await db.attendee.deleteMany({ where: { eventId } });
    await db.registration.deleteMany({ where: { eventId } });
    await db.ticketType.deleteMany({ where: { eventId } });
    await db.event.deleteMany({ where: { id: eventId } });
    await db.organization.deleteMany({ where: { id: orgId } });
    await db.$disconnect();
  });

  it("checks in successfully on first scan", async () => {
    const result = await processCheckIn({
      eventId,
      publicId,
      stationId: "gate-1",
    });
    expect(result.result).toBe("ok");
    expect(result.attendee?.firstName).toBe("Rahul");
  });

  it("returns already on duplicate scan", async () => {
    const result = await processCheckIn({
      eventId,
      publicId,
      stationId: "gate-2",
    });
    expect(result.result).toBe("already");
  });

  it("returns same result for idempotent retry", async () => {
    const freshPublicId = generatePublicId();
    const reg2 = await db.registration.create({
      data: {
        eventId,
        orgId,
        ticketTypeId: (await db.ticketType.findFirst({ where: { eventId } }))!.id,
        status: "confirmed",
        confirmedAt: new Date(),
        answers: {},
      },
    });
    const att2 = await db.attendee.create({
      data: {
        eventId,
        orgId,
        registrationId: reg2.id,
        ticketTypeId: (await db.ticketType.findFirst({ where: { eventId } }))!.id,
        firstName: "Idem",
        lastName: "Potent",
        email: "idem@test.example",
        status: "registered",
      },
    });
    await db.credential.create({
      data: {
        attendeeId: att2.id,
        eventId,
        publicId: freshPublicId,
        secretHash: hashSecret("z"),
        status: "active",
      },
    });

    const key = `idem-${Date.now()}`;
    const r1 = await processCheckIn({ eventId, publicId: freshPublicId, idempotencyKey: key });
    const r2 = await processCheckIn({ eventId, publicId: freshPublicId, idempotencyKey: key });
    expect(r1.result).toBe("ok");
    expect(r2.result).toBe("ok");
  });

  it("rejects revoked credential", async () => {
    const revokedId = generatePublicId();
    const reg = await db.registration.create({
      data: {
        eventId,
        orgId,
        ticketTypeId: (await db.ticketType.findFirst({ where: { eventId } }))!.id,
        status: "confirmed",
        confirmedAt: new Date(),
        answers: {},
      },
    });
    const att = await db.attendee.create({
      data: {
        eventId,
        orgId,
        registrationId: reg.id,
        ticketTypeId: (await db.ticketType.findFirst({ where: { eventId } }))!.id,
        firstName: "Revoked",
        lastName: "User",
        email: "revoked@test.example",
        status: "registered",
      },
    });
    await db.credential.create({
      data: {
        attendeeId: att.id,
        eventId,
        publicId: revokedId,
        secretHash: hashSecret("y"),
        status: "revoked",
        revokedAt: new Date(),
      },
    });

    const result = await processCheckIn({ eventId, publicId: revokedId });
    expect(result.result).toBe("revoked");
  });
});

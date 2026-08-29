import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { extractSystemFields } from "@/lib/registration/form-schema";
import { getEmailProvider } from "@/lib/email/provider";
import { track } from "@/lib/analytics/track";
import { nanoid } from "nanoid";
import type { Prisma } from "@prisma/client";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export async function materializeAttendee(registrationId: string) {
  const registration = await db.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: {
      ticketType: true,
      event: { include: { org: true } },
      attendee: true,
    },
  });

  if (registration.attendee) {
    return registration.attendee;
  }

  const answers = registration.answers as Record<string, unknown>;
  const system = extractSystemFields(answers);

  const attendee = await db.$transaction(async (tx) => {
    const created = await tx.attendee.create({
      data: {
        eventId: registration.eventId,
        orgId: registration.orgId,
        registrationId: registration.id,
        ticketTypeId: registration.ticketTypeId,
        firstName: system.firstName,
        lastName: system.lastName,
        email: system.email,
        phone: system.phone,
        company: system.company,
        category: registration.ticketType.name,
        answers: answers as Prisma.InputJsonValue,
      },
    });

    const publicId = nanoid(16);
    const secret = randomBytes(32).toString("base64url");
    await tx.credential.create({
      data: {
        attendeeId: created.id,
        eventId: registration.eventId,
        publicId,
        secretHash: hashSecret(secret),
        kind: "qr",
        status: "active",
      },
    });

    return created;
  });

  await track("register_complete", {
    orgId: registration.orgId,
    eventId: registration.eventId,
    properties: { registrationId },
  });

  await sendConfirmationEmail(registration, attendee);

  return attendee;
}

async function sendConfirmationEmail(
  registration: {
    event: { title: string; publicSlug: string | null; startsAt: Date | null; timezone: string };
    ticketType: { name: string };
  },
  attendee: { firstName: string; lastName: string; email: string },
) {
  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  const eventUrl = registration.event.publicSlug
    ? `${appUrl}/e/${registration.event.publicSlug}`
    : appUrl;

  const dateLabel = registration.event.startsAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: registration.event.timezone,
      }).format(registration.event.startsAt)
    : "Date TBA";

  const email = getEmailProvider();
  await email.send({
    to: attendee.email,
    subject: `You're registered — ${registration.event.title}`,
    html: `
      <p>Hi ${attendee.firstName},</p>
      <p>You're confirmed for <strong>${registration.event.title}</strong>.</p>
      <p><strong>Ticket:</strong> ${registration.ticketType.name}</p>
      <p><strong>When:</strong> ${dateLabel}</p>
      <p><a href="${eventUrl}">View event page</a></p>
      <p>Your QR ticket will be available in Phase 3. Save this email for now.</p>
    `,
    text: `Hi ${attendee.firstName}, you're registered for ${registration.event.title}. Ticket: ${registration.ticketType.name}. When: ${dateLabel}.`,
  });
}

export async function revokeAttendee(registrationId: string, reason?: string) {
  const registration = await db.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: { attendee: { include: { credential: true } } },
  });

  if (!registration.attendee) return;

  await db.$transaction(async (tx) => {
    await tx.attendee.update({
      where: { id: registration.attendee!.id },
      data: { status: "cancelled" },
    });

    if (registration.attendee!.credential) {
      await tx.credential.update({
        where: { id: registration.attendee!.credential!.id },
        data: {
          status: "revoked",
          revokedAt: new Date(),
          revokeReason: reason ?? "registration_cancelled",
        },
      });
    }
  });
}

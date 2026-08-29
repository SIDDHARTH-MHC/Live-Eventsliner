import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { extractSystemFields } from "@/lib/registration/form-schema";
import { sendTriggeredMessage } from "@/lib/comms/engine";
import { track } from "@/lib/analytics/track";
import { generatePublicId } from "@/lib/credentials/public-id";
import { ensureTicketToken, ticketUrl } from "@/lib/credentials/ticket-token";
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
      consents: true,
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

    const publicId = generatePublicId();
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

  await ensureTicketToken(attendee.id);

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
    id: string;
    orgId: string;
    eventId: string;
    event: { title: string; publicSlug: string | null; startsAt: Date | null; timezone: string };
    ticketType: { name: string };
    consents?: { kind: string; accepted: boolean }[];
  },
  attendee: { id: string; firstName: string; lastName: string; email: string; phone: string | null },
) {
  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  const token = await ensureTicketToken(attendee.id);
  const passUrl = ticketUrl(token);

  const dateLabel = registration.event.startsAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: registration.event.timezone,
      }).format(registration.event.startsAt)
    : "Date TBA";

  const whatsappConsented = registration.consents?.some(
    (c) => c.kind === "whatsapp" && c.accepted,
  );

  await sendTriggeredMessage({
    trigger: "registration.confirmed",
    orgId: registration.orgId,
    eventId: registration.eventId,
    to: attendee.email,
    phone: attendee.phone ?? undefined,
    whatsappConsented,
    channels: whatsappConsented ? ["email", "whatsapp"] : ["email"],
    vars: {
      firstName: attendee.firstName,
      eventTitle: registration.event.title,
      ticketUrl: `${appUrl}${passUrl}`,
      eventDate: dateLabel,
    },
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

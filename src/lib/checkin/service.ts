import { db } from "@/lib/db";
import { track } from "@/lib/analytics/track";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { parseQrPayload } from "@/lib/credentials/public-id";
import type { CheckInResult } from "@prisma/client";

export type CheckInInput = {
  eventId: string;
  publicId?: string;
  rawPayload?: string;
  attendeeId?: string;
  stationId?: string;
  staffUserId?: string;
  idempotencyKey?: string;
  offlineId?: string;
  isManual?: boolean;
};

export type CheckInResponse = {
  result: CheckInResult;
  attendee?: {
    id: string;
    firstName: string;
    lastName: string;
    ticketType: string;
    status: string;
  };
  checkedInAt?: string;
  message: string;
};

async function findCredential(eventId: string, publicId: string) {
  return db.credential.findFirst({
    where: { publicId, eventId },
    include: {
      attendee: { include: { ticketType: true } },
    },
  });
}

export async function processCheckIn(input: CheckInInput): Promise<CheckInResponse> {
  const {
    eventId,
    stationId,
    staffUserId,
    idempotencyKey,
    offlineId,
    isManual = false,
  } = input;

  if (idempotencyKey) {
    const prior = await db.checkIn.findUnique({ where: { idempotencyKey } });
    if (prior) {
      const attendee = await db.attendee.findUnique({
        where: { id: prior.attendeeId },
        include: { ticketType: true },
      });
      return buildResponse(prior.result, attendee, prior.scannedAt);
    }
  }

  if (offlineId) {
    const prior = await db.checkIn.findUnique({ where: { offlineId } });
    if (prior) {
      const attendee = await db.attendee.findUnique({
        where: { id: prior.attendeeId },
        include: { ticketType: true },
      });
      return buildResponse(prior.result, attendee, prior.scannedAt);
    }
  }

  let publicId = input.publicId;
  if (!publicId && input.rawPayload) {
    publicId = parseQrPayload(input.rawPayload) ?? undefined;
  }

  let credential = publicId ? await findCredential(eventId, publicId) : null;

  if (!credential && input.attendeeId) {
    const attendee = await db.attendee.findFirst({
      where: { id: input.attendeeId, eventId },
      include: { credential: true, ticketType: true },
    });
    if (attendee?.credential) {
      credential = {
        ...attendee.credential,
        attendee,
      };
    }
  }

  if (!credential) {
    await track("checkin_invalid", { eventId, properties: { reason: "not_found" } });
    return { result: "invalid", message: "Invalid or unknown ticket" };
  }

  if (credential.eventId !== eventId) {
    return { result: "wrong_event", message: "Ticket is for a different event" };
  }

  if (credential.status === "revoked") {
    await track("checkin_revoked", {
      eventId,
      properties: { credentialId: credential.id },
    });
    return {
      result: "revoked",
      message: "Ticket has been revoked",
      attendee: formatAttendee(credential.attendee),
    };
  }

  if (credential.status !== "active") {
    return { result: "invalid", message: "Ticket is not active" };
  }

  if (credential.attendee.status === "cancelled") {
    return { result: "denied", message: "Registration cancelled" };
  }

  const attendeeRecord = credential.attendee as typeof credential.attendee & {
    attendanceMode?: string;
  };

  if (attendeeRecord.attendanceMode === "virtual" && !isManual) {
    return {
      result: "denied",
      message: "Virtual ticket — no gate check-in required",
      attendee: formatAttendee(credential.attendee),
    };
  }

  const existingOk = await db.checkIn.findFirst({
    where: {
      credentialId: credential.id,
      location: "gate",
      result: "ok",
    },
    orderBy: { scannedAt: "asc" },
  });

  if (existingOk) {
    await track("checkin_already", {
      eventId,
      properties: { attendeeId: credential.attendeeId },
    });
    return buildResponse("already", credential.attendee, existingOk.scannedAt);
  }

  const now = new Date();
  let checkIn;
  try {
    checkIn = await db.$transaction(async (tx) => {
      const created = await tx.checkIn.create({
        data: {
          eventId,
          attendeeId: credential!.attendeeId,
          credentialId: credential!.id,
          location: "gate",
          stationId,
          staffUserId,
          result: "ok",
          idempotencyKey,
          offlineId,
          isManual,
          scannedAt: now,
          syncedAt: offlineId ? now : null,
        },
      });

      await tx.attendee.update({
        where: { id: credential!.attendeeId },
        data: { status: "checked_in" },
      });

      return created;
    });
  } catch (error) {
    if (idempotencyKey && isUniqueViolation(error)) {
      const prior = await db.checkIn.findUnique({ where: { idempotencyKey } });
      if (prior) {
        return buildResponse(prior.result, credential.attendee, prior.scannedAt);
      }
    }
    throw error;
  }

  await track("checkin_ok", {
    eventId,
    userId: staffUserId,
    properties: {
      attendeeId: credential.attendeeId,
      isManual,
      stationId,
    },
  });

  const event = await db.event.findUnique({ where: { id: eventId }, select: { orgId: true } });
  if (event) {
    await dispatchWebhook(event.orgId, "checkin.recorded", {
      eventId,
      attendeeId: credential.attendeeId,
      scannedAt: checkIn.scannedAt.toISOString(),
    });
  }

  return buildResponse("ok", credential.attendee, checkIn.scannedAt);
}

function formatAttendee(attendee: {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  ticketType: { name: string };
}) {
  return {
    id: attendee.id,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    ticketType: attendee.ticketType.name,
    status: attendee.status,
  };
}

function buildResponse(
  result: CheckInResult,
  attendee: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    ticketType: { name: string };
  } | null,
  checkedInAt?: Date,
): CheckInResponse {
  const messages: Record<CheckInResult, string> = {
    ok: "Checked in successfully",
    already: "Already checked in",
    invalid: "Invalid ticket",
    revoked: "Ticket revoked",
    wrong_event: "Wrong event",
    denied: "Check-in denied",
  };

  return {
    result,
    message: messages[result],
    attendee: attendee ? formatAttendee(attendee) : undefined,
    checkedInAt: checkedInAt?.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function getLiveSummary(eventId: string) {
  const [registered, checkedIn, recentCheckIns] = await Promise.all([
    db.attendee.count({
      where: { eventId, status: { in: ["registered", "checked_in"] } },
    }),
    db.attendee.count({ where: { eventId, status: "checked_in" } }),
    db.checkIn.findMany({
      where: { eventId, result: "ok" },
      orderBy: { scannedAt: "desc" },
      take: 10,
      include: {
        attendee: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    registered,
    checkedIn,
    checkInRate: registered > 0 ? Math.round((checkedIn / registered) * 100) : 0,
    recent: recentCheckIns.map((c) => ({
      name: `${c.attendee.firstName} ${c.attendee.lastName}`,
      at: c.scannedAt.toISOString(),
    })),
  };
}

export async function searchAttendeesForCheckIn(eventId: string, query: string) {
  const q = query.trim();
  if (q.length < 2) return [];

  return db.attendee.findMany({
    where: {
      eventId,
      status: { in: ["registered", "checked_in"] },
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    take: 5,
    include: {
      ticketType: { select: { name: true } },
      credential: { select: { status: true, publicId: true } },
    },
    orderBy: { lastName: "asc" },
  });
}

export async function isEventStaff(userId: string, eventId: string): Promise<boolean> {
  const staff = await db.eventStaff.findFirst({
    where: { eventId, userId, acceptedAt: { not: null } },
  });
  if (staff) return true;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return false;

  const membership = await db.membership.findUnique({
    where: { orgId_userId: { orgId: event.orgId, userId } },
  });
  return membership?.role === "owner" || membership?.role === "admin";
}

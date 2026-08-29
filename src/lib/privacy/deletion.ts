import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { log } from "@/lib/observability/logger";

/** DPDP-compliant user data anonymization / deletion job. */

export async function anonymizeUser(userId: string, actorId?: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, reason: "not_found" };

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymized.local`,
        phone: null,
        name: "Deleted User",
        status: "deleted",
      },
    });

    await tx.attendee.updateMany({
      where: { userId },
      data: {
        firstName: "Deleted",
        lastName: "User",
        email: `deleted-${userId}@anonymized.local`,
        phone: null,
        company: null,
        jobTitle: null,
      },
    });

    await tx.session.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.follow.deleteMany({ where: { userId } });
    await tx.savedEvent.deleteMany({ where: { userId } });
    await tx.totpSecret.deleteMany({ where: { userId } });
  });

  await audit({
    actorId: actorId ?? userId,
    action: "user.anonymized",
    targetType: "user",
    targetId: userId,
  });

  log("info", "user_anonymized", { userId });
  return { ok: true };
}

export async function runDeletionQueue(limit = 50) {
  const users = await db.user.findMany({
    where: { status: "disabled" },
    take: limit,
    select: { id: true },
  });

  let processed = 0;
  for (const u of users) {
    await anonymizeUser(u.id);
    processed++;
  }
  return { processed };
}

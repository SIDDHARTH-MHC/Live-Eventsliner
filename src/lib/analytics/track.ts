import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function track(
  name: string,
  properties?: {
    orgId?: string;
    eventId?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: unknown;
  },
) {
  const { orgId, eventId, userId, sessionId, ...rest } = properties ?? {};
  await db.analyticsEvent.create({
    data: {
      name,
      orgId: orgId ?? null,
      eventId: eventId ?? null,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      properties: (Object.keys(rest).length ? rest : undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}

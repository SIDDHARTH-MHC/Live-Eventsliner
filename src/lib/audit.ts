import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function audit(params: {
  actorId?: string | null;
  orgId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      orgId: params.orgId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

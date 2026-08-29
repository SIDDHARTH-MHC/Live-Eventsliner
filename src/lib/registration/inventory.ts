import { db } from "@/lib/db";
import { redisGet, redisSet, redisDel } from "@/lib/redis";

export const HOLD_TTL_MINUTES = 15;
export const HOLD_TTL_SECONDS = HOLD_TTL_MINUTES * 60;

function holdCountKey(ticketTypeId: string): string {
  return `hold:count:${ticketTypeId}`;
}

function holdRecordKey(holdId: string): string {
  return `hold:record:${holdId}`;
}

export async function getActiveHoldCount(ticketTypeId: string): Promise<number> {
  const redisCount = await redisGet(holdCountKey(ticketTypeId));
  if (redisCount !== null) {
    return parseInt(redisCount, 10) || 0;
  }

  const now = new Date();
  const count = await db.inventoryHold.aggregate({
    where: {
      ticketTypeId,
      expiresAt: { gt: now },
    },
    _sum: { qty: true },
  });
  return count._sum.qty ?? 0;
}

export async function getAvailableQuantity(ticketTypeId: string): Promise<number | null> {
  const ticketType = await db.ticketType.findUniqueOrThrow({
    where: { id: ticketTypeId },
  });

  if (ticketType.quantity === null) return null;

  const holds = await getActiveHoldCount(ticketTypeId);
  const available = ticketType.quantity - ticketType.soldCount - holds;
  return Math.max(0, available);
}

export type AcquireHoldInput = {
  ticketTypeId: string;
  qty?: number;
  orderId?: string;
  registrationId?: string;
  sessionId?: string;
};

export async function acquireHold(input: AcquireHoldInput): Promise<{ holdId: string; expiresAt: Date }> {
  const qty = input.qty ?? 1;
  const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

  return db.$transaction(async (tx) => {
    const ticketType = await tx.ticketType.findUniqueOrThrow({
      where: { id: input.ticketTypeId },
    });

    if (ticketType.quantity !== null) {
      const activeHolds = await tx.inventoryHold.aggregate({
        where: {
          ticketTypeId: input.ticketTypeId,
          expiresAt: { gt: new Date() },
        },
        _sum: { qty: true },
      });
      const held = activeHolds._sum.qty ?? 0;
      const available = ticketType.quantity - ticketType.soldCount - held;
      if (available < qty) {
        throw new Error("TICKET_SOLD_OUT");
      }
    }

    const hold = await tx.inventoryHold.create({
      data: {
        ticketTypeId: input.ticketTypeId,
        qty,
        expiresAt,
        orderId: input.orderId,
        registrationId: input.registrationId,
        sessionId: input.sessionId,
      },
    });

    await redisSet(holdRecordKey(hold.id), JSON.stringify({ ticketTypeId: input.ticketTypeId, qty }), HOLD_TTL_SECONDS);
    const current = await getActiveHoldCount(input.ticketTypeId);
    await redisSet(holdCountKey(input.ticketTypeId), String(current + qty), HOLD_TTL_SECONDS);

    return { holdId: hold.id, expiresAt };
  });
}

export async function releaseHold(holdId: string): Promise<void> {
  const hold = await db.inventoryHold.findUnique({ where: { id: holdId } });
  if (!hold || hold.expiresAt < new Date()) return;

  await db.inventoryHold.delete({ where: { id: holdId } }).catch(() => undefined);
  await redisDel(holdRecordKey(holdId));

  const current = await getActiveHoldCount(hold.ticketTypeId);
  await redisSet(
    holdCountKey(hold.ticketTypeId),
    String(Math.max(0, current - hold.qty)),
    HOLD_TTL_SECONDS,
  );
}

export async function releaseHoldsForOrder(orderId: string): Promise<void> {
  const holds = await db.inventoryHold.findMany({ where: { orderId } });
  for (const hold of holds) {
    await releaseHold(hold.id);
  }
}

export async function expireStaleHolds(): Promise<number> {
  const now = new Date();
  const expired = await db.inventoryHold.findMany({
    where: { expiresAt: { lte: now } },
    include: { order: { include: { registrations: true } } },
  });

  let count = 0;
  for (const hold of expired) {
    await db.$transaction(async (tx) => {
      await tx.inventoryHold.delete({ where: { id: hold.id } });

      if (hold.order) {
        await tx.order.update({
          where: { id: hold.order.id },
          data: { status: "expired" },
        });
        for (const reg of hold.order.registrations) {
          if (reg.status === "pending_payment" || reg.status === "started") {
            await tx.registration.update({
              where: { id: reg.id },
              data: { status: "expired" },
            });
          }
        }
      } else if (hold.registrationId) {
        const reg = await tx.registration.findUnique({ where: { id: hold.registrationId } });
        if (reg && (reg.status === "started" || reg.status === "pending_payment")) {
          await tx.registration.update({
            where: { id: reg.id },
            data: { status: "expired" },
          });
        }
      }
    });

    await redisDel(holdRecordKey(hold.id));
    count++;
  }

  return count;
}

export async function convertHoldToSold(ticketTypeId: string, qty: number): Promise<void> {
  await db.ticketType.update({
    where: { id: ticketTypeId },
    data: { soldCount: { increment: qty } },
  });
}

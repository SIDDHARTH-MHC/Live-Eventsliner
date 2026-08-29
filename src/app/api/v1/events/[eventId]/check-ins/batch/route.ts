import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { processCheckIn } from "@/lib/checkin/service";
import { z } from "zod";

type RouteParams = { params: Promise<{ eventId: string }> };

const batchSchema = z.object({
  checkIns: z.array(
    z.object({
      rawPayload: z.string().optional(),
      publicId: z.string().optional(),
      offlineId: z.string(),
      stationId: z.string().optional(),
      scannedAt: z.string().optional(),
    }),
  ),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { eventId } = await params;
    const user = await getSessionUser();
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "checkin:scan", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Check-in access required");

    const body = batchSchema.parse(await req.json());
    const results = [];

    for (const item of body.checkIns) {
      const result = await processCheckIn({
        eventId,
        rawPayload: item.rawPayload,
        publicId: item.publicId,
        offlineId: item.offlineId,
        stationId: item.stationId,
        staffUserId: user?.id,
      });
      results.push({ offlineId: item.offlineId, ...result });
    }

    return json({ results });
  });
}

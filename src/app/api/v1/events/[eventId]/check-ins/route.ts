import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { processCheckIn } from "@/lib/checkin/service";

type RouteParams = { params: Promise<{ eventId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { eventId } = await params;
    const user = await getSessionUser();
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "checkin:scan", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Check-in access required");

    const body = await req.json();
    const idempotencyKey =
      req.headers.get("idempotency-key") ?? body.idempotencyKey ?? undefined;

    const result = await processCheckIn({
      eventId,
      publicId: body.publicId,
      rawPayload: body.rawPayload ?? body.query,
      attendeeId: body.attendeeId,
      stationId: body.stationId,
      staffUserId: user?.id,
      idempotencyKey,
      offlineId: body.offlineId,
      isManual: body.isManual ?? false,
    });

    const status =
      result.result === "ok" ? 200 : result.result === "already" ? 200 : 422;

    return json(result, { status });
  });
}

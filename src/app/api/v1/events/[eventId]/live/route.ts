import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { getLiveSummary } from "@/lib/checkin/service";

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { eventId } = await params;
    const user = await getSessionUser();
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const canScan = await can(user, "checkin:scan", { type: "event", event });
    const canManage = await can(user, "attendee:read", { type: "event", event });
    if (!canScan && !canManage) {
      return errorJson(403, "FORBIDDEN", "Access denied");
    }

    const summary = await getLiveSummary(eventId);
    return json(summary);
  });
}

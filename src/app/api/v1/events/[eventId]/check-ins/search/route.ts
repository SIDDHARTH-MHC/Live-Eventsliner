import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { searchAttendeesForCheckIn } from "@/lib/checkin/service";

type RouteParams = { params: Promise<{ eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { eventId } = await params;
    const user = await getSessionUser();
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "checkin:scan", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Check-in access required");

    const q = new URL(req.url).searchParams.get("q") ?? "";
    const results = await searchAttendeesForCheckIn(eventId, q);

    return json({
      results: results.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        email: a.email,
        phone: a.phone,
        ticketType: a.ticketType.name,
        status: a.status,
        credentialStatus: a.credential?.status,
      })),
    });
  });
}

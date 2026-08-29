import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { getEventAnalyticsSummary, getAttendeeCrmTimeline } from "@/lib/comms/engine";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:read", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const attendeeId = new URL(req.url).searchParams.get("attendeeId");
    if (attendeeId) {
      const timeline = await getAttendeeCrmTimeline(attendeeId);
      if (!timeline) return errorJson(404, "NOT_FOUND", "Attendee not found");
      return json({ timeline });
    }

    const summary = await getEventAnalyticsSummary(eventId);
    return json({ analytics: summary });
  });
}

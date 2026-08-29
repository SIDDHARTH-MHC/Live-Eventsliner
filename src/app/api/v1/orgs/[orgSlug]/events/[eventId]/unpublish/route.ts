import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { unpublishEvent } from "@/lib/events/service";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.orgId !== org.id) {
      return errorJson(404, "NOT_FOUND", "Event not found");
    }

    const allowed = await can(user, "event:publish", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const updated = await unpublishEvent(eventId, user.id);
    return json({ event: updated });
  });
}

import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { publishEvent, unpublishEvent } from "@/lib/events/service";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

async function loadEvent(orgSlug: string, eventId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.orgId !== org.id) return null;
  return { org, event };
}

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:publish", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    try {
      const event = await publishEvent(eventId, user.id);
      return json({ event });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      return errorJson(400, "PUBLISH_ERROR", message);
    }
  });
}

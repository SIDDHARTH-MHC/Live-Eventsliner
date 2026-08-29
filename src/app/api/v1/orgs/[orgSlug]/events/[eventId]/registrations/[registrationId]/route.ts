import { getSessionUser } from "@/lib/auth/session";
import { cancelRegistration } from "@/lib/registration/service";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";

type RouteParams = {
  params: Promise<{ orgSlug: string; eventId: string; registrationId: string }>;
};

async function loadRegistration(orgSlug: string, eventId: string, registrationId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.orgId !== org.id) return null;
  const registration = await db.registration.findUnique({ where: { id: registrationId } });
  if (!registration || registration.eventId !== eventId) return null;
  return { org, event, registration };
}

export async function DELETE(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId, registrationId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadRegistration(orgSlug, eventId, registrationId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Registration not found");

    const allowed = await can(user, "attendee:manage", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const registration = await cancelRegistration(registrationId, user.id);
    return json({ registration: { id: registration.id, status: registration.status } });
  });
}

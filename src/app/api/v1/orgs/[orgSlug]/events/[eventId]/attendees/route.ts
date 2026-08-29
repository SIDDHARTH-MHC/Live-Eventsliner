import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { withApiContext, json, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

async function loadEvent(orgSlug: string, eventId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.orgId !== org.id) return null;
  return { org, event };
}

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "attendee:read", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status");

    const attendees = await db.attendee.findMany({
      where: {
        eventId,
        ...(status ? { status: status as "registered" | "checked_in" | "cancelled" } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        ticketType: { select: { name: true } },
        registration: { select: { status: true, confirmedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return json({ attendees });
  });
}

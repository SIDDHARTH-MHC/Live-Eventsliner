import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  type: z
    .enum([
      "meetup",
      "conference",
      "workshop",
      "exhibition",
      "festival",
      "corporate",
      "sports",
      "webinar",
      "hybrid",
    ])
    .optional(),
  visibility: z.enum(["public", "unlisted", "private"]).optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  venueName: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
});

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { site: true },
    });
    if (!event || event.orgId !== org.id) {
      return errorJson(404, "NOT_FOUND", "Event not found");
    }

    const allowed = await can(user, "event:read", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    return json({ event });
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Invalid event data");
    }

    const updated = await db.event.update({
      where: { id: eventId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        timezone: parsed.data.timezone,
        startsAt:
          parsed.data.startsAt === null
            ? null
            : parsed.data.startsAt
              ? new Date(parsed.data.startsAt)
              : undefined,
        endsAt:
          parsed.data.endsAt === null
            ? null
            : parsed.data.endsAt
              ? new Date(parsed.data.endsAt)
              : undefined,
        venueName: parsed.data.venueName,
        venueAddress: parsed.data.venueAddress,
        city: parsed.data.city,
        capacity: parsed.data.capacity,
        visibility: parsed.data.visibility,
      },
    });

    return json({ event: updated });
  });
}

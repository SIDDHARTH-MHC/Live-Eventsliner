import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { createEvent } from "@/lib/events/service";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2).max(200),
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
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  city: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const allowed = await can(user, "org:read", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const events = await db.event.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
    });
    return json({ events });
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const allowed = await can(user, "event:create", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Invalid event data");
    }

    const event = await createEvent({
      orgId: org.id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      description: parsed.data.description,
      timezone: parsed.data.timezone,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
      venueName: parsed.data.venueName,
      venueAddress: parsed.data.venueAddress,
      city: parsed.data.city,
      capacity: parsed.data.capacity,
      createdById: user.id,
    });

    return json({ event }, { status: 201 });
  });
}

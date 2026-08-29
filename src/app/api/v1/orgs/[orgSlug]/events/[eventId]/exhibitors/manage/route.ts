import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:read", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const exhibitors = await db.exhibitor.findMany({
      where: { eventId },
      include: { _count: { select: { leads: true, staff: true } } },
      orderBy: { name: "asc" },
    });

    return json({
      exhibitors: exhibitors.map((e) => ({
        id: e.id,
        name: e.name,
        boothNumber: e.boothNumber,
        passQuota: e.passQuota,
        passesUsed: e.passesUsed,
        leadCount: e._count.leads,
        staffCount: e._count.staff,
        portalUrl: e.accessToken ? `/exhibitor/${e.accessToken}` : null,
      })),
    });
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  boothNumber: z.string().optional(),
  contactEmail: z.string().email().optional(),
  passQuota: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:update", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = createSchema.parse(await req.json());
    const accessToken = randomBytes(24).toString("base64url");

    const exhibitor = await db.exhibitor.create({
      data: {
        eventId,
        orgId: org.id,
        name: body.name,
        description: body.description,
        boothNumber: body.boothNumber,
        contactEmail: body.contactEmail,
        passQuota: body.passQuota ?? 5,
        accessToken,
      },
    });

    return json(
      {
        exhibitor: {
          ...exhibitor,
          portalUrl: `/exhibitor/${accessToken}`,
        },
      },
      { status: 201 },
    );
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:read", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const [sponsorTiers, sponsors, exhibitors] = await Promise.all([
      db.sponsorTier.findMany({ where: { eventId }, include: { sponsors: true }, orderBy: { sortOrder: "asc" } }),
      db.sponsor.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
      db.exhibitor.findMany({ where: { eventId }, orderBy: { name: "asc" } }),
    ]);

    return json({ sponsorTiers, sponsors, exhibitors });
  });
}

const exhibitorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  boothNumber: z.string().optional(),
  passQuota: z.number().int().optional(),
  contactEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = exhibitorSchema.parse(await req.json());
    const exhibitor = await db.exhibitor.create({
      data: {
        eventId,
        orgId: org.id,
        name: body.name,
        description: body.description,
        boothNumber: body.boothNumber,
        passQuota: body.passQuota ?? 5,
        contactEmail: body.contactEmail,
      },
    });

    return json({ exhibitor }, { status: 201 });
  });
}

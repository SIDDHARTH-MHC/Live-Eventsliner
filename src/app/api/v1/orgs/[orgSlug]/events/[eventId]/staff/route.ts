import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ orgSlug: string; eventId: string }>;
};

const inviteSchema = z.object({
  phone: z.string().min(10),
  name: z.string().optional(),
  role: z.enum(["checkin", "registration", "manager"]).default("checkin"),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "checkin:manage", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Manage access required");

    const staff = await db.eventStaff.findMany({
      where: { eventId },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { invitedAt: "desc" },
    });

    return json({
      staff: staff.map((s) => ({
        id: s.id,
        phone: s.phone,
        name: s.name ?? s.user?.name,
        role: s.role,
        acceptedAt: s.acceptedAt?.toISOString() ?? null,
        invitedAt: s.invitedAt.toISOString(),
      })),
    });
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "checkin:manage", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Manage access required");

    const body = inviteSchema.parse(await req.json());
    const phone = body.phone.replace(/\s/g, "");

    const existingUser = await db.user.findUnique({ where: { phone } });

    const staff = await db.eventStaff.upsert({
      where: { eventId_phone: { eventId, phone } },
      create: {
        eventId,
        orgId: org.id,
        phone,
        name: body.name,
        role: body.role,
        userId: existingUser?.id,
        acceptedAt: existingUser?.phoneVerifiedAt ? new Date() : null,
      },
      update: {
        name: body.name,
        role: body.role,
        userId: existingUser?.id,
      },
    });

    return json({ staff }, { status: 201 });
  });
}

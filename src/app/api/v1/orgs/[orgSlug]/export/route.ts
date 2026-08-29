import { NextRequest } from "next/server";
import { withApiContext, errorJson } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:update", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Owner access required");

    const events = await db.event.findMany({
      where: { orgId: org.id },
      include: {
        attendees: true,
        registrations: { select: { id: true, status: true, createdAt: true } },
      },
    });

    await audit({
      orgId: org.id,
      actorId: user.id,
      action: "org.data_export",
      targetType: "organization",
      targetId: org.id,
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      organization: { name: org.name, slug: org.slug },
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        attendeeCount: e.attendees.length,
        registrationCount: e.registrations.length,
      })),
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="eventsliner-export-${org.slug}.json"`,
      },
    });
  });
}

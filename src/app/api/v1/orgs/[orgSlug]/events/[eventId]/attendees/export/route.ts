import { NextRequest } from "next/server";
import { withApiContext, errorJson } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

type RouteParams = {
  params: Promise<{ orgSlug: string; eventId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "attendee:export", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Export access required");

    const attendees = await db.attendee.findMany({
      where: { eventId },
      include: {
        ticketType: { select: { name: true } },
        credential: { select: { status: true, publicId: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    await audit({
      orgId: org.id,
      actorId: user.id,
      action: "attendees.export",
      targetType: "event",
      targetId: eventId,
    });

    const headers = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "company",
      "ticket_type",
      "status",
      "credential_status",
      "registered_at",
    ];

    const rows = attendees.map((a) =>
      [
        a.firstName,
        a.lastName,
        a.email,
        a.phone ?? "",
        a.company ?? "",
        a.ticketType.name,
        a.status,
        a.credential?.status ?? "",
        a.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendees-${event.slug}.csv"`,
      },
    });
  });
}

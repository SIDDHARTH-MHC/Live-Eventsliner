import { NextRequest } from "next/server";
import { withApiContext, errorJson } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:read", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const logs = await db.auditLog.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { name: true, email: true } } },
    });

    return new Response(
      JSON.stringify({
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId,
          actor: l.actor?.name ?? l.actor?.email ?? "System",
          createdAt: l.createdAt.toISOString(),
          metadata: l.metadata,
        })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  });
}

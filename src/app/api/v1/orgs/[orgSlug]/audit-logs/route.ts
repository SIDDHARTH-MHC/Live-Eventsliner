import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { encodePageToken, parsePageParams } from "@/lib/api/pagination";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:read", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const url = new URL(req.url);
    const page = parsePageParams(url.searchParams, { defaultPageSize: 50, maxPageSize: 100 });

    const logs = await db.auditLog.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      skip: page.offset,
      take: page.pageSize + 1,
      include: { actor: { select: { name: true, email: true } } },
    });

    const hasMore = logs.length > page.pageSize;
    const pageLogs = hasMore ? logs.slice(0, page.pageSize) : logs;
    const nextPageToken = hasMore
      ? encodePageToken(page.offset + pageLogs.length)
      : null;

    return json({
      logs: pageLogs.map((l) => ({
        id: l.id,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        actor: l.actor?.name ?? l.actor?.email ?? "System",
        createdAt: l.createdAt.toISOString(),
        metadata: l.metadata,
      })),
      nextPageToken,
    });
  });
}

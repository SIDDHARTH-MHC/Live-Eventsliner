import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { authenticateApiKey, hasScope } from "@/lib/api/api-key-auth";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const apiKey = await authenticateApiKey(request);

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    if (!apiKey || apiKey.orgId !== org.id || !hasScope(apiKey, "events:read")) {
      return errorJson(401, "UNAUTHORIZED", "Valid API key with events:read scope required");
    }

    const events = await db.event.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        title: true,
        slug: true,
        publicSlug: true,
        status: true,
        visibility: true,
        startsAt: true,
        endsAt: true,
        city: true,
        type: true,
      },
      orderBy: { startsAt: "desc" },
    });

    return json({ events });
  });
}

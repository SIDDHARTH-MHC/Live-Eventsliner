import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { authenticateApiKey, hasScope } from "@/lib/api/api-key-auth";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const apiKey = await authenticateApiKey(request);

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    if (!apiKey || apiKey.orgId !== org.id || !hasScope(apiKey, "orders:read")) {
      return errorJson(401, "UNAUTHORIZED", "Valid API key with orders:read scope required");
    }

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const orders = await db.order.findMany({
      where: { eventId },
      select: {
        id: true,
        status: true,
        buyerEmail: true,
        buyerName: true,
        totalCents: true,
        currency: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return json({ orders });
  });
}

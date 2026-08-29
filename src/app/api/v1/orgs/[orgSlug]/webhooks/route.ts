import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

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

    const webhooks = await db.webhookEndpoint.findMany({
      where: { orgId: org.id },
      select: { id: true, url: true, events: true, active: true, createdAt: true },
    });

    return json({ webhooks });
  });
}

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(["registration.confirmed", "checkin.recorded"]),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:update", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Owner access required");

    const body = createSchema.parse(await req.json());
    const secret = randomBytes(32).toString("base64url");

    const webhook = await db.webhookEndpoint.create({
      data: {
        orgId: org.id,
        url: body.url,
        secret,
        events: body.events,
      },
    });

    return json({ webhook: { id: webhook.id, url: webhook.url, events: webhook.events, secret } }, { status: 201 });
  });
}

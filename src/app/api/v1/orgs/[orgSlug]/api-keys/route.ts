import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = { params: Promise<{ orgSlug: string }> };

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:update", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Owner access required");

    const keys = await db.apiKey.findMany({
      where: { orgId: org.id, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true, lastUsedAt: true },
    });

    return json({ keys });
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(["events:read"]),
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
    const rawKey = `el_${randomBytes(24).toString("base64url")}`;
    const keyPrefix = rawKey.slice(0, 10);

    const apiKey = await db.apiKey.create({
      data: {
        orgId: org.id,
        name: body.name,
        keyHash: hashKey(rawKey),
        keyPrefix,
        scopes: body.scopes,
      },
    });

    return json({ key: { id: apiKey.id, name: apiKey.name, key: rawKey, keyPrefix, scopes: apiKey.scopes } }, { status: 201 });
  });
}

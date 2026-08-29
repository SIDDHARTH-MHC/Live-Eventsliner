import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

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

    return json({
      settings: {
        customSubdomain: org.customSubdomain,
        ssoEnabled: org.ssoEnabled,
        ssoProvider: org.ssoProvider,
        workosConfigured: !!(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID),
        ssoEnvEnabled: process.env.SSO_ENABLED === "true",
      },
    });
  });
}

const updateSchema = z.object({
  customSubdomain: z
    .string()
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, "Invalid subdomain")
    .nullable()
    .optional(),
  ssoEnabled: z.boolean().optional(),
  ssoProvider: z.enum(["workos", "mock"]).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "org:update", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Owner access required");

    const body = updateSchema.parse(await req.json());

    if (body.customSubdomain) {
      const taken = await db.organization.findFirst({
        where: {
          customSubdomain: body.customSubdomain,
          id: { not: org.id },
        },
      });
      if (taken) {
        return errorJson(409, "SUBDOMAIN_TAKEN", "That subdomain is already in use");
      }
    }

    const updated = await db.organization.update({
      where: { id: org.id },
      data: {
        ...(body.customSubdomain !== undefined
          ? { customSubdomain: body.customSubdomain }
          : {}),
        ...(body.ssoEnabled !== undefined ? { ssoEnabled: body.ssoEnabled } : {}),
        ...(body.ssoProvider !== undefined ? { ssoProvider: body.ssoProvider } : {}),
      },
    });

    await audit({
      orgId: org.id,
      actorId: user.id,
      action: "org.enterprise_settings_updated",
      targetType: "organization",
      targetId: org.id,
      metadata: {
        customSubdomain: updated.customSubdomain,
        ssoEnabled: updated.ssoEnabled,
      },
    });

    return json({
      settings: {
        customSubdomain: updated.customSubdomain,
        ssoEnabled: updated.ssoEnabled,
        ssoProvider: updated.ssoProvider,
      },
    });
  });
}

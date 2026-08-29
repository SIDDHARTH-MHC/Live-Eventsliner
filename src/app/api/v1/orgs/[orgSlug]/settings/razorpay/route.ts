import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const allowed = await can(user, "org:payments", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    return json({
      razorpay: {
        connected: !!(org.razorpayKeyId && org.razorpayKeySecret),
        keyId: org.razorpayKeyId ? `${org.razorpayKeyId.slice(0, 8)}…` : null,
        mockMode: !(org.razorpayKeyId && org.razorpayKeySecret) && !process.env.RAZORPAY_KEY_ID,
      },
    });
  });
}

const updateSchema = z.object({
  razorpayKeyId: z.string().min(1).nullable().optional(),
  razorpayKeySecret: z.string().min(1).nullable().optional(),
});

export async function PUT(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const allowed = await can(user, "org:payments", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    let body: z.infer<typeof updateSchema>;
    try {
      body = updateSchema.parse(await request.json());
    } catch {
      return errorJson(400, "VALIDATION", "Invalid Razorpay settings");
    }

    const updated = await db.organization.update({
      where: { id: org.id },
      data: {
        razorpayKeyId: body.razorpayKeyId,
        razorpayKeySecret: body.razorpayKeySecret,
      },
    });

    return json({
      razorpay: {
        connected: !!(updated.razorpayKeyId && updated.razorpayKeySecret),
        keyId: updated.razorpayKeyId ? `${updated.razorpayKeyId.slice(0, 8)}…` : null,
      },
    });
  });
}

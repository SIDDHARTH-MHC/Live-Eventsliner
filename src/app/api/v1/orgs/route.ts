import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { track } from "@/lib/analytics/track";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64).optional(),
});

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) {
      return errorJson(403, "CSRF", "Invalid origin");
    }

    const user = await getSessionUser();
    if (!user) {
      return errorJson(401, "UNAUTHORIZED", "Sign in required");
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Organization name required");
    }

    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const existing = await db.organization.findUnique({ where: { slug } });
    if (existing) {
      return errorJson(409, "SLUG_TAKEN", "This URL slug is already taken");
    }

    const org = await db.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        country: "IN",
        timezone: "Asia/Kolkata",
        memberships: {
          create: {
            userId: user.id,
            role: "owner",
            acceptedAt: new Date(),
          },
        },
      },
    });

    await audit({
      actorId: user.id,
      orgId: org.id,
      action: "org.created",
      targetType: "organization",
      targetId: org.id,
      metadata: { name: org.name, slug: org.slug },
    });

    await track("product.org_created", {
      orgId: org.id,
      userId: user.id,
      slug: org.slug,
    });

    return json({ org }, { status: 201 });
  });
}

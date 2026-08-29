import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { createPresignedUpload } from "@/lib/storage/media";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

const schema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const allowed = await can(user, "media:upload", { type: "organization", org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Invalid upload metadata");
    }

    try {
      const result = await createPresignedUpload({
        orgId: org.id,
        filename: parsed.data.filename,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        uploadedById: user.id,
      });
      return json(result, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return errorJson(400, "UPLOAD_ERROR", message);
    }
  });
}

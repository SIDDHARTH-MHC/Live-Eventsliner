import { z } from "zod";
import { sendMagicLink } from "@/lib/auth/credentials";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) {
      return errorJson(403, "CSRF", "Invalid origin");
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Valid email required");
    }
    await sendMagicLink(parsed.data.email);
    return json({ ok: true });
  });
}

import { z } from "zod";
import { cookies } from "next/headers";
import { verifyOtp } from "@/lib/auth/credentials";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import { db } from "@/lib/db";

const schema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) {
      return errorJson(403, "CSRF", "Invalid origin");
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Phone and 6-digit code required");
    }

    const userId = await verifyOtp(parsed.data.phone.trim(), parsed.data.code);
    if (!userId) {
      return errorJson(401, "INVALID_OTP", "Invalid or expired code");
    }

    const token = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    const phone = parsed.data.phone.trim();
    await db.eventStaff.updateMany({
      where: { phone, acceptedAt: null },
      data: { userId, acceptedAt: new Date() },
    });

    return json({ ok: true });
  });
}

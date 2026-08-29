import { z } from "zod";
import { generateOtpCode, storeOtp } from "@/lib/auth/credentials";
import { getSmsProvider } from "@/lib/sms/provider";
import { checkOtpRateLimit, checkOtpCooldown } from "@/lib/auth/rate-limit";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

const schema = z.object({ phone: z.string().min(8).max(20) });

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) {
      return errorJson(403, "CSRF", "Invalid origin");
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION_ERROR", "Valid phone required");
    }

    const phone = parsed.data.phone.trim();
    const rate = await checkOtpRateLimit(phone);
    if (!rate.allowed) {
      return errorJson(429, "RATE_LIMIT", "Too many OTP requests. Try again in 10 minutes.", {
        remaining: rate.remaining,
      });
    }

    const cooldownOk = await checkOtpCooldown(phone);
    if (!cooldownOk) {
      return errorJson(429, "COOLDOWN", "Wait a minute before requesting another code.");
    }

    const code = generateOtpCode();
    await storeOtp(phone, code);
    await getSmsProvider().sendOtp({ phone, code });

    return json({ ok: true });
  });
}

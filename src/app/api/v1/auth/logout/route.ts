import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) {
      return errorJson(403, "CSRF", "Invalid origin");
    }
    await destroySession();
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return json({ ok: true });
  });
}

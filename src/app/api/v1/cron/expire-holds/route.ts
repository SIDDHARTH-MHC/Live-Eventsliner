import { expireStaleHolds } from "@/lib/registration/inventory";
import { withApiContext, json, errorJson } from "@/lib/api/response";

export async function POST(request: Request) {
  return withApiContext(request, async () => {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    if (secret && auth !== `Bearer ${secret}`) {
      return errorJson(401, "UNAUTHORIZED", "Invalid cron secret");
    }

    const expired = await expireStaleHolds();
    return json({ expired });
  });
}

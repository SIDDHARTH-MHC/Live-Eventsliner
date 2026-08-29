import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { runDeletionQueue } from "@/lib/privacy/deletion";

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return errorJson(401, "UNAUTHORIZED", "Invalid cron secret");
    }

    const result = await runDeletionQueue();
    return json(result);
  });
}

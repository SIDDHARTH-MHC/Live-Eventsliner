import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getTurnstilePartner } from "@/lib/partners/hardware";
import { authenticateApiKey, hasScope } from "@/lib/api/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  eventId: z.string().min(1),
  publicId: z.string().min(1),
  stationId: z.string().optional(),
  offlineId: z.string().optional(),
});

/** Turnstile / gate hardware partners — same admit contract as QR check-in. */
export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey || !hasScope(apiKey, "checkin:write")) {
      return errorJson(401, "UNAUTHORIZED", "API key with checkin:write required");
    }

    const body = schema.parse(await req.json());
    const event = await db.event.findFirst({
      where: { id: body.eventId, orgId: apiKey.orgId },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const partner = getTurnstilePartner();
    const result = await partner.admit(body);
    return json({ partner: partner.name, ...result });
  });
}

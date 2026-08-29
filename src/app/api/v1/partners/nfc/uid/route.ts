import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getNfcPartner } from "@/lib/partners/hardware";
import { authenticateApiKey, hasScope } from "@/lib/api/api-key-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/audit";

const schema = z.object({
  attendeeId: z.string().min(1),
  nfcUid: z.string().min(4).max(64),
});

/** Venue NFC partners POST encoded UID after writing wristband/tag. */
export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const apiKey = await authenticateApiKey(req);
    if (!apiKey || !hasScope(apiKey, "checkin:write")) {
      return errorJson(401, "UNAUTHORIZED", "API key with checkin:write required");
    }

    const body = schema.parse(await req.json());
    const attendee = await db.attendee.findFirst({
      where: { id: body.attendeeId, orgId: apiKey.orgId },
    });
    if (!attendee) return errorJson(404, "NOT_FOUND", "Attendee not found");

    const partner = getNfcPartner();
    await partner.recordUid(body.attendeeId, body.nfcUid);

    await audit({
      orgId: apiKey.orgId,
      action: "partner.nfc_uid_recorded",
      targetType: "attendee",
      targetId: attendee.id,
      metadata: { partner: partner.name },
    });

    return json({ ok: true, attendeeId: attendee.id });
  });
}

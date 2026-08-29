import { NextRequest } from "next/server";
import { withApiContext, json } from "@/lib/api/response";
import { track } from "@/lib/analytics/track";
import { z } from "zod";

const beaconSchema = z.object({
  name: z.string(),
  eventId: z.string().optional(),
  orgId: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const body = beaconSchema.parse(await req.json());
    await track(body.name, {
      eventId: body.eventId,
      orgId: body.orgId,
      ...body.properties,
    });
    return json({ ok: true });
  });
}

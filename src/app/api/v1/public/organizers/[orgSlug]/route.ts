import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getOrganizerProfile } from "@/lib/discovery/service";

type RouteParams = { params: Promise<{ orgSlug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug } = await params;
    const profile = await getOrganizerProfile(orgSlug);
    if (!profile) return errorJson(404, "NOT_FOUND", "Organizer not found");
    return json(profile);
  });
}

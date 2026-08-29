import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const streams = await db.stream.findMany({ where: { eventId: event.id } });
    return json({ streams });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return errorJson(401, "UNAUTHORIZED", "Token required");

    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const ticketToken = await db.ticketToken.findUnique({
      where: { token },
      include: { attendee: true },
    });
    if (!ticketToken || ticketToken.attendee.eventId !== event.id) {
      return errorJson(403, "FORBIDDEN", "Invalid ticket");
    }

    const mode = ticketToken.attendee.attendanceMode;
    if (mode !== "virtual" && mode !== "hybrid") {
      return errorJson(403, "FORBIDDEN", "In-person ticket cannot access stream");
    }

    const stream = await db.stream.findFirst({ where: { eventId: event.id } });
    if (!stream) return errorJson(404, "NOT_FOUND", "No stream configured");

    const embedUrl =
      stream.embedUrl ||
      process.env.MOCK_STREAM_URL ||
      "https://www.youtube.com/embed/dQw4w9WgXcQ";

    return json({ stream: { title: stream.title, embedUrl } });
  });
}

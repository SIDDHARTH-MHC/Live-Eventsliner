import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getMatchSuggestions } from "@/lib/networking/match";
import { z } from "zod";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const attendeeId = new URL(req.url).searchParams.get("attendeeId");
    if (!attendeeId) return errorJson(400, "BAD_REQUEST", "attendeeId required");

    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const suggestions = await getMatchSuggestions(event.id, attendeeId);
    return json({ suggestions });
  });
}

const meetingSchema = z.object({
  fromAttendeeId: z.string(),
  toAttendeeId: z.string(),
  startsAt: z.string().datetime().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const body = meetingSchema.parse(await req.json());
    const meeting = await db.meeting.create({
      data: {
        eventId: event.id,
        fromAttendeeId: body.fromAttendeeId,
        toAttendeeId: body.toAttendeeId,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        location: body.location,
        notes: body.notes,
      },
    });

    return json({ meeting }, { status: 201 });
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const body = z
      .object({
        meetingId: z.string(),
        status: z.enum(["accepted", "declined", "done", "cancelled"]),
      })
      .parse(await req.json());

    const meeting = await db.meeting.update({
      where: { id: body.meetingId },
      data: { status: body.status },
    });

    return json({ meeting });
  });
}

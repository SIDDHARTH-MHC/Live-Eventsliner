import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const sessions = await db.eventSession.findMany({
      where: { eventId: event.id },
      orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        room: true,
      },
    });

    return json({ sessions });
  });
}

const surveySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  attendeeId: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: { in: ["published", "completed"] } },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const body = surveySchema.parse(await req.json());
    const response = await db.surveyResponse.create({
      data: {
        eventId: event.id,
        attendeeId: body.attendeeId,
        answers: body.answers,
      },
    });

    return json({ id: response.id }, { status: 201 });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const profiles = await db.networkingProfile.findMany({
      where: { eventId: event.id, visible: true },
      take: 50,
    });

    return json({
      profiles: profiles.map((p) => ({
        id: p.id,
        headline: p.headline,
        interests: p.interests,
      })),
    });
  });
}

const profileSchema = z.object({
  attendeeId: z.string(),
  headline: z.string().optional(),
  interests: z.array(z.string()).optional(),
  visible: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const body = profileSchema.parse(await req.json());
    const connectCode = randomBytes(8).toString("base64url");

    const profile = await db.networkingProfile.upsert({
      where: { attendeeId: body.attendeeId },
      create: {
        eventId: event.id,
        attendeeId: body.attendeeId,
        headline: body.headline,
        interests: body.interests ?? [],
        visible: body.visible ?? true,
        connectCode,
      },
      update: {
        headline: body.headline,
        interests: body.interests,
        visible: body.visible,
      },
    });

    return json({ profile: { id: profile.id, connectCode: profile.connectCode } });
  });
}

const connectSchema = z.object({
  fromAttendeeId: z.string(),
  connectCode: z.string(),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const body = connectSchema.parse(await req.json());
    const target = await db.networkingProfile.findUnique({
      where: { connectCode: body.connectCode },
    });
    if (!target || target.eventId !== event.id) {
      return errorJson(404, "NOT_FOUND", "Connect code not found");
    }

    const request_ = await db.connectionRequest.upsert({
      where: {
        eventId_fromAttendeeId_toAttendeeId: {
          eventId: event.id,
          fromAttendeeId: body.fromAttendeeId,
          toAttendeeId: target.attendeeId,
        },
      },
      create: {
        eventId: event.id,
        fromAttendeeId: body.fromAttendeeId,
        toAttendeeId: target.attendeeId,
      },
      update: {},
    });

    return json({ connection: request_ });
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
      .object({ connectionId: z.string(), status: z.enum(["accepted", "declined"]) })
      .parse(await req.json());

    const updated = await db.connectionRequest.update({
      where: { id: body.connectionId },
      data: { status: body.status },
    });

    return json({ connection: updated });
  });
}

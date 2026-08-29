import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const [tracks, sessions, speakers] = await Promise.all([
      db.eventTrack.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
      db.eventSession.findMany({
        where: { eventId },
        include: { speakers: { include: { speaker: true } }, track: true },
        orderBy: [{ startsAt: "asc" }, { sortOrder: "asc" }],
      }),
      db.speaker.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
    ]);

    return json({ tracks, sessions, speakers });
  });
}

const sessionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  trackId: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  room: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = sessionSchema.parse(await req.json());
    const session = await db.eventSession.create({
      data: {
        eventId,
        title: body.title,
        description: body.description,
        trackId: body.trackId,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        room: body.room,
      },
    });

    return json({ session }, { status: 201 });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:read", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const speakers = await db.speaker.findMany({
      where: { eventId },
      include: { sessions: { include: { session: { select: { id: true, title: true } } } } },
      orderBy: { sortOrder: "asc" },
    });

    return json({ speakers });
  });
}

const speakerSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  sessionIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:update", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = speakerSchema.parse(await req.json());
    const count = await db.speaker.count({ where: { eventId } });

    const speaker = await db.speaker.create({
      data: {
        eventId,
        name: body.name,
        title: body.title,
        company: body.company,
        bio: body.bio,
        photoUrl: body.photoUrl || null,
        sortOrder: count,
      },
    });

    if (body.sessionIds?.length) {
      await db.sessionSpeaker.createMany({
        data: body.sessionIds.map((sessionId) => ({ sessionId, speakerId: speaker.id })),
        skipDuplicates: true,
      });
    }

    return json({ speaker }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({ where: { id: eventId, orgId: org.id } });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:update", { type: "event", event, org });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const speakerId = new URL(req.url).searchParams.get("speakerId");
    if (!speakerId) return errorJson(400, "BAD_REQUEST", "speakerId required");

    await db.speaker.delete({ where: { id: speakerId } });
    return json({ ok: true });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json, validateOrigin } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(request: NextRequest) {
  return withApiContext(request, async () => {
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const saved = await db.savedEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const eventIds = saved.map((s) => s.eventId);
    const events = eventIds.length
      ? await db.event.findMany({
          where: { id: { in: eventIds }, status: "published" },
          include: { org: { select: { name: true, slug: true } } },
        })
      : [];

    const eventMap = Object.fromEntries(events.map((e) => [e.id, e]));

    return json({
      saved: saved
        .map((s) => {
          const e = eventMap[s.eventId];
          if (!e) return null;
          return {
            eventId: e.id,
            title: e.title,
            slug: e.publicSlug,
            startsAt: e.startsAt?.toISOString() ?? null,
            city: e.city,
            organizer: e.org,
            url: e.publicSlug ? `/e/${e.publicSlug}` : null,
            savedAt: s.createdAt.toISOString(),
          };
        })
        .filter(Boolean),
    });
  });
}

const saveSchema = z.object({ eventSlug: z.string() });

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    if (!validateOrigin(req)) return errorJson(403, "CSRF", "Invalid origin");

    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const body = saveSchema.parse(await req.json());
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: body.eventSlug }, { slug: body.eventSlug }], status: "published" },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    await db.savedEvent.upsert({
      where: { userId_eventId: { userId: user.id, eventId: event.id } },
      create: { userId: user.id, eventId: event.id },
      update: {},
    });

    return json({ saved: true, eventId: event.id }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest) {
  return withApiContext(request, async (req) => {
    if (!validateOrigin(req)) return errorJson(403, "CSRF", "Invalid origin");

    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const eventSlug = new URL(req.url).searchParams.get("eventSlug");
    if (!eventSlug) return errorJson(400, "BAD_REQUEST", "eventSlug required");

    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: eventSlug }, { slug: eventSlug }] },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    await db.savedEvent.deleteMany({ where: { userId: user.id, eventId: event.id } });
    return json({ ok: true });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json, validateOrigin } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(request: NextRequest) {
  return withApiContext(request, async () => {
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const follows = await db.follow.findMany({
      where: { userId: user.id },
      include: {
        org: { select: { id: true, name: true, slug: true, city: true, bio: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const orgIds = follows.map((f) => f.orgId);
    const events = orgIds.length
      ? await db.event.findMany({
          where: {
            orgId: { in: orgIds },
            status: "published",
            visibility: "public",
            startsAt: { gte: new Date() },
          },
          include: {
            org: { select: { name: true, slug: true } },
            ticketTypes: {
              where: { isActive: true },
              orderBy: { priceCents: "asc" },
              take: 1,
              select: { priceCents: true },
            },
          },
          orderBy: { startsAt: "asc" },
          take: 50,
        })
      : [];

    return json({
      follows: follows.map((f) => ({
        orgId: f.orgId,
        org: f.org,
        followedAt: f.createdAt.toISOString(),
      })),
      feed: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.publicSlug,
        startsAt: e.startsAt?.toISOString() ?? null,
        city: e.city,
        organizer: e.org,
        priceFromCents: e.ticketTypes[0]?.priceCents ?? 0,
        url: e.publicSlug ? `/e/${e.publicSlug}` : null,
      })),
    });
  });
}

const followSchema = z.object({ orgSlug: z.string() });

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    if (!validateOrigin(req)) return errorJson(403, "CSRF", "Invalid origin");

    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const body = followSchema.parse(await req.json());
    const org = await db.organization.findUnique({ where: { slug: body.orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organizer not found");

    const follow = await db.follow.upsert({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
      create: { userId: user.id, orgId: org.id },
      update: {},
    });

    return json({ follow: { orgId: follow.orgId, orgSlug: org.slug } }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest) {
  return withApiContext(request, async (req) => {
    if (!validateOrigin(req)) return errorJson(403, "CSRF", "Invalid origin");

    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const orgSlug = new URL(req.url).searchParams.get("orgSlug");
    if (!orgSlug) return errorJson(400, "BAD_REQUEST", "orgSlug required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organizer not found");

    await db.follow.deleteMany({ where: { userId: user.id, orgId: org.id } });
    return json({ ok: true });
  });
}

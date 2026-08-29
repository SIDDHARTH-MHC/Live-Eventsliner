import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type DiscoverFilters = {
  q?: string;
  city?: string;
  category?: string;
  free?: boolean;
  paid?: boolean;
  from?: Date;
  to?: Date;
  type?: string;
  limit?: number;
  offset?: number;
};

function discoverableWhere(filters: DiscoverFilters): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    status: "published",
    visibility: "public",
  };

  if (filters.city) {
    where.city = { equals: filters.city, mode: "insensitive" };
  }

  if (filters.category) {
    where.category = { equals: filters.category, mode: "insensitive" };
  }

  if (filters.type) {
    where.type = filters.type as Prisma.EnumEventTypeFilter["equals"];
  }

  if (filters.from || filters.to) {
    where.startsAt = {};
    if (filters.from) where.startsAt.gte = filters.from;
    if (filters.to) where.startsAt.lte = filters.to;
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { venueName: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  return where;
}

export async function discoverEvents(filters: DiscoverFilters) {
  const where = discoverableWhere(filters);
  const limit = Math.min(filters.limit ?? 24, 50);
  const offset = filters.offset ?? 0;

  let events = await db.event.findMany({
    where,
    include: {
      org: { select: { name: true, slug: true, primaryColor: true } },
      ticketTypes: {
        where: { isActive: true, visibility: "public" },
        select: { priceCents: true, mode: true },
        orderBy: { priceCents: "asc" },
        take: 1,
      },
    },
    orderBy: { startsAt: "asc" },
    take: limit + 50,
    skip: offset,
  });

  if (filters.free) {
    events = events.filter(
      (e) => e.ticketTypes.length === 0 || e.ticketTypes.every((t) => t.priceCents === 0),
    );
  }
  if (filters.paid) {
    events = events.filter((e) => e.ticketTypes.some((t) => t.priceCents > 0));
  }

  events = events.slice(0, limit);

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.publicSlug,
    type: e.type,
    startsAt: e.startsAt?.toISOString() ?? null,
    endsAt: e.endsAt?.toISOString() ?? null,
    city: e.city,
    category: e.category,
    tags: e.tags,
    venueName: e.venueName,
    coverMediaId: e.coverMediaId,
    priceFromCents: e.ticketTypes[0]?.priceCents ?? 0,
    isFree: e.ticketTypes.length === 0 || e.ticketTypes.every((t) => t.priceCents === 0),
    organizer: {
      name: e.org.name,
      slug: e.org.slug,
    },
    url: e.publicSlug ? `/e/${e.publicSlug}` : null,
  }));
}

export async function getDiscoverFacets() {
  const events = await db.event.findMany({
    where: { status: "published", visibility: "public" },
    select: { city: true, category: true, type: true },
  });

  const cities = [...new Set(events.map((e) => e.city).filter(Boolean))] as string[];
  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))] as string[];

  return {
    cities: cities.sort(),
    categories: categories.sort(),
    types: [...new Set(events.map((e) => e.type))],
  };
}

export async function getOrganizerProfile(orgSlug: string) {
  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      country: true,
      timezone: true,
    },
  });

  if (!org) return null;

  const upcomingEvents = await db.event.findMany({
    where: {
      orgId: org.id,
      status: "published",
      visibility: "public",
      startsAt: { gte: new Date() },
    },
    include: {
      ticketTypes: {
        where: { isActive: true },
        select: { priceCents: true },
        orderBy: { priceCents: "asc" },
        take: 1,
      },
    },
    orderBy: { startsAt: "asc" },
    take: 20,
  });

  return {
    org,
    events: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.publicSlug,
      startsAt: e.startsAt?.toISOString() ?? null,
      city: e.city,
      category: e.category,
      priceFromCents: e.ticketTypes[0]?.priceCents ?? 0,
      url: e.publicSlug ? `/e/${e.publicSlug}` : null,
    })),
  };
}

export function thisWeekendRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + (day === 6 ? 0 : daysUntilSaturday === 7 ? 0 : daysUntilSaturday));
  saturday.setHours(0, 0, 0, 0);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);
  return { from: saturday, to: sunday };
}

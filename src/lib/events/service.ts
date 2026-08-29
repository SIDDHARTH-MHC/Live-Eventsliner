import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { buildDefaultEventSiteSections, buildDefaultTheme } from "@/lib/events/site-template";
import { audit } from "@/lib/audit";
import { track } from "@/lib/analytics/track";
import type {
  AttendanceMode,
  EventType,
  EventVisibility,
  Prisma,
} from "@prisma/client";

export type CreateEventInput = {
  orgId: string;
  title: string;
  slug?: string;
  type?: EventType;
  visibility?: EventVisibility;
  description?: string;
  timezone?: string;
  startsAt?: Date;
  endsAt?: Date;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  capacity?: number;
  currency?: string;
  modules?: Prisma.InputJsonValue;
  attendanceModes?: AttendanceMode[];
  createdById?: string;
};

export async function createEvent(input: CreateEventInput) {
  const slug = input.slug ?? slugify(input.title);
  const org = await db.organization.findUniqueOrThrow({ where: { id: input.orgId } });

  const event = await db.event.create({
    data: {
      orgId: input.orgId,
      title: input.title,
      slug,
      publicSlug: `${org.slug}-${slug}`,
      type: input.type ?? "workshop",
      status: "draft",
      visibility: input.visibility ?? "public",
      description: input.description,
      timezone: input.timezone ?? org.timezone,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      venueName: input.venueName,
      venueAddress: input.venueAddress,
      city: input.city,
      capacity: input.capacity,
      currency: input.currency ?? "INR",
      modules: input.modules ?? {},
      attendanceModes: input.attendanceModes ?? ["in_person"],
      createdById: input.createdById,
    },
  });

  await db.eventSite.create({
    data: {
      eventId: event.id,
      templateId: "conference",
      theme: buildDefaultTheme(org),
      sections: buildDefaultEventSiteSections(event) as Prisma.InputJsonValue,
    },
  });

  return event;
}

export async function publishEvent(eventId: string, actorId: string) {
  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { site: true, org: true },
  });

  if (!event.title?.trim()) throw new Error("TITLE_REQUIRED");
  if (!event.startsAt) throw new Error("STARTS_AT_REQUIRED");
  if (!event.timezone) throw new Error("TIMEZONE_REQUIRED");

  const updated = await db.event.update({
    where: { id: eventId },
    data: {
      status: "published",
      publishedAt: new Date(),
      publicSlug: event.publicSlug ?? `${event.org.slug}-${event.slug}`,
    },
  });

  if (event.site) {
    await db.eventSite.update({
      where: { id: event.site.id },
      data: { publishedVersion: event.site.publishedVersion + 1 },
    });
  }

  await audit({
    actorId,
    orgId: event.orgId,
    action: "event.published",
    targetType: "event",
    targetId: event.id,
  });

  await track("event.published", {
    orgId: event.orgId,
    eventId: event.id,
    userId: actorId,
    visibility: updated.visibility,
  });

  return updated;
}

export async function unpublishEvent(eventId: string, actorId: string) {
  const event = await db.event.update({
    where: { id: eventId },
    data: { status: "draft", publishedAt: null },
  });

  await audit({
    actorId,
    orgId: event.orgId,
    action: "event.unpublished",
    targetType: "event",
    targetId: event.id,
  });

  return event;
}

export async function getPublicEventBySlug(slug: string) {
  return db.event.findFirst({
    where: {
      publicSlug: slug,
      status: "published",
      visibility: { in: ["public", "unlisted"] },
    },
    include: { site: true, org: true },
  });
}

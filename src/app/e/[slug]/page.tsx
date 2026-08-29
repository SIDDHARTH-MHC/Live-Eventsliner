import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPublicEventBySlug } from "@/lib/events/service";
import { PublicShell } from "@/components/shells/public-shell";
import {
  EventSiteRenderer,
  StickyRegisterCta,
} from "@/components/events/event-site-renderer";
import { track } from "@/lib/analytics/track";
import type { EventSiteSection } from "@/lib/events/site-template";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function PublicEventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event || !event.site) notFound();

  const h = await headers();
  await track("page_view", {
    eventId: event.id,
    orgId: event.orgId,
    path: `/e/${slug}`,
    userAgent: h.get("user-agent") ?? undefined,
  });

  const sections = (event.site.sections as EventSiteSection[]).map((s) =>
    s.type === "tickets"
      ? { ...s, data: { ...s.data, registerSlug: slug } }
      : s,
  );
  const theme = event.site.theme as { primaryColor?: string };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startsAt?.toISOString(),
    endDate: event.endsAt?.toISOString(),
    eventAttendanceMode:
      event.attendanceModes.includes("virtual")
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: event.venueName
      ? {
          "@type": "Place",
          name: event.venueName,
          address: {
            "@type": "PostalAddress",
            addressLocality: event.city ?? undefined,
            addressCountry: "IN",
          },
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: event.org.name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicShell
        eventTitle={event.title}
        organizerName={event.org.name}
        primaryColor={theme.primaryColor}
        stickyCta={<StickyRegisterCta slug={slug} />}
      >
        <EventSiteRenderer sections={sections} />
      </PublicShell>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.title} · ${event.org.name}`,
    description: event.description ?? `Join ${event.title} on Eventsliner Live`,
  };
}

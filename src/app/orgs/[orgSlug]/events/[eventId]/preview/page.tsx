import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { PublicShell } from "@/components/shells/public-shell";
import {
  EventSiteRenderer,
  StickyRegisterCta,
} from "@/components/events/event-site-renderer";
import type { EventSiteSection } from "@/lib/events/site-template";

type Props = { params: Promise<{ orgSlug: string; eventId: string }> };

export default async function EventPreviewPage({ params }: Props) {
  const { orgSlug, eventId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { site: true, org: true },
  });
  if (!event || event.org.slug !== orgSlug) notFound();

  const allowed = await can(user, "event:read", { type: "event", event });
  if (!allowed) notFound();

  const sections = (event.site?.sections as EventSiteSection[]) ?? [];
  const theme = (event.site?.theme as { primaryColor?: string }) ?? {};

  return (
    <PublicShell
      eventTitle={event.title}
      organizerName={event.org.name}
      primaryColor={theme.primaryColor}
      stickyCta={
        event.publicSlug ? (
          <StickyRegisterCta slug={event.publicSlug} />
        ) : (
          <StickyRegisterCta slug={`preview-${event.id}`} />
        )
      }
    >
      <EventSiteRenderer sections={sections} preview />
    </PublicShell>
  );
}

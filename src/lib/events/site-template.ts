import type { Organization } from "@prisma/client";

export type EventSiteSection = {
  type: "hero" | "about" | "tickets" | "venue" | "faq";
  visible: boolean;
  data: Record<string, unknown>;
};

export function buildDefaultEventSiteSections(event: {
  title: string;
  description?: string | null;
  startsAt?: Date | null;
  timezone: string;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
}): EventSiteSection[] {
  const dateLabel = event.startsAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: event.timezone,
      }).format(event.startsAt)
    : "Date to be announced";

  const venueLabel = [event.venueName, event.city].filter(Boolean).join(", ") || "Venue TBA";

  return [
    {
      type: "hero",
      visible: true,
      data: {
        title: event.title,
        subtitle: dateLabel,
        ctaLabel: "Register",
      },
    },
    {
      type: "about",
      visible: true,
      data: {
        heading: "About this event",
        body: event.description ?? "Details coming soon.",
      },
    },
    {
      type: "tickets",
      visible: true,
      data: {
        heading: "Tickets",
        message: "Registration opens soon.",
      },
    },
    {
      type: "venue",
      visible: true,
      data: {
        heading: "Venue",
        name: event.venueName ?? "To be announced",
        address: event.venueAddress ?? "",
        city: event.city ?? "",
        summary: venueLabel,
      },
    },
    {
      type: "faq",
      visible: true,
      data: {
        heading: "FAQ",
        items: [
          {
            question: "What should I bring?",
            answer: "Your ticket confirmation and a valid ID.",
          },
        ],
      },
    },
  ];
}

export function buildDefaultTheme(org?: Pick<Organization, "primaryColor" | "logoMediaId">) {
  return {
    logoMediaId: org?.logoMediaId ?? null,
    primaryColor: org?.primaryColor ?? "#6750a4",
  };
}

import type { EventSiteSection } from "@/lib/events/site-template";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EventSiteRendererProps = {
  sections: EventSiteSection[];
  preview?: boolean;
};

export function EventSiteRenderer({ sections, preview }: EventSiteRendererProps) {
  return (
    <div className="space-y-8">
      {preview ? (
        <p className="rounded-[var(--radius-md)] bg-primary-container px-4 py-3 text-body-sm text-on-primary-container">
          Organizer preview — this page is not public until you publish.
        </p>
      ) : null}
      {sections
        .filter((s) => s.visible)
        .map((section) => (
          <section key={section.type} aria-labelledby={`section-${section.type}`}>
            {section.type === "hero" ? (
              <div className="space-y-4 py-4">
                <h2 id={`section-hero`} className="text-display-sm">
                  {String(section.data.title ?? "")}
                </h2>
                <p className="text-body-lg text-muted-foreground">
                  {String(section.data.subtitle ?? "")}
                </p>
              </div>
            ) : null}
            {section.type === "about" ? (
              <div className="space-y-3">
                <h2 id={`section-about`} className="text-headline">
                  {String(section.data.heading ?? "About")}
                </h2>
                <p className="text-body-lg whitespace-pre-wrap">
                  {String(section.data.body ?? "")}
                </p>
              </div>
            ) : null}
            {section.type === "tickets" ? (
              <div className="space-y-3">
                <h2 id={`section-tickets`} className="text-headline">
                  {String(section.data.heading ?? "Tickets")}
                </h2>
                <p className="text-body">
                  {String(
                    section.data.registerSlug &&
                      /opens soon/i.test(String(section.data.message ?? ""))
                      ? "Choose a ticket and register online."
                      : (section.data.message ?? ""),
                  )}
                </p>
                {section.data.registerSlug ? (
                  <Button asChild className="min-h-12">
                    <Link href={`/e/${String(section.data.registerSlug)}/register`}>
                      Register now
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
            {section.type === "venue" ? (
              <div className="space-y-3">
                <h2 id={`section-venue`} className="text-headline">
                  {String(section.data.heading ?? "Venue")}
                </h2>
                <p className="text-title-md">{String(section.data.name ?? "")}</p>
                {section.data.address ? (
                  <p className="text-body text-muted-foreground">
                    {String(section.data.address)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {section.type === "faq" ? (
              <div className="space-y-4">
                <h2 id={`section-faq`} className="text-headline">
                  {String(section.data.heading ?? "FAQ")}
                </h2>
                <ul className="space-y-4">
                  {(section.data.items as Array<{ question: string; answer: string }>)?.map(
                    (item, i) => (
                      <li key={i} className="rounded-[var(--radius-md)] border border-border p-4">
                        <p className="text-title-md">{item.question}</p>
                        <p className="mt-2 text-body text-muted-foreground">{item.answer}</p>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
          </section>
        ))}
    </div>
  );
}

export function StickyRegisterCta({ slug }: { slug: string }) {
  return (
    <Button asChild className="w-full min-h-12" size="lg">
      <Link href={`/e/${slug}/register`}>Register</Link>
    </Button>
  );
}

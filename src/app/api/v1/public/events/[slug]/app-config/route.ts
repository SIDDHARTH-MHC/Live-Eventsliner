import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

/**
 * Public app shell config for Flutter Mode A/B.
 * @see docs/22-flutter-event-app.md
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: {
        OR: [{ publicSlug: slug }, { slug }],
        status: "published",
      },
      include: {
        org: { select: { name: true, primaryColor: true, logoMediaId: true } },
        appConfig: true,
        site: { select: { theme: true } },
      },
    });

    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const theme =
      event.site?.theme && typeof event.site.theme === "object"
        ? (event.site.theme as Record<string, unknown>)
        : {};

    const cfg = event.appConfig;
    const primaryColor =
      cfg?.primaryColor ??
      (typeof theme.primaryColor === "string" ? theme.primaryColor : null) ??
      event.org.primaryColor ??
      "6750A4";

    return json({
      event: {
        id: event.id,
        title: event.title,
        slug: event.publicSlug ?? event.slug,
        publicSlug: event.publicSlug,
        venueName: event.venueName,
        city: event.city,
        startsAt: event.startsAt?.toISOString() ?? null,
        description: event.description,
      },
      app: {
        enabled: cfg?.enabled ?? true,
        mode: cfg?.mode ?? "universal",
        displayName: cfg?.displayName ?? event.title,
        primaryColor,
        tabs: cfg?.tabs ?? ["home", "pass", "schedule", "more"],
        iconMediaId: cfg?.iconMediaId ?? event.org.logoMediaId,
        buildStatus: cfg?.buildStatus ?? "draft",
      },
      organizer: {
        name: event.org.name,
      },
    });
  });
}

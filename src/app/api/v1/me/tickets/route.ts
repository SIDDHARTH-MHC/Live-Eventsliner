import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  return withApiContext(request, async () => {
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const email = user.email;
    if (!email) return json({ tickets: [] });

    const attendees = await db.attendee.findMany({
      where: {
        email: { equals: email, mode: "insensitive" },
        status: { not: "cancelled" },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            publicSlug: true,
            startsAt: true,
            city: true,
            venueName: true,
            status: true,
          },
        },
        ticketType: { select: { name: true } },
        ticketToken: { select: { token: true } },
        credential: { select: { status: true } },
      },
      orderBy: { event: { startsAt: "asc" } },
    });

    return json({
      tickets: attendees
        .filter((a) => a.event.status === "published" || a.event.status === "completed")
        .map((a) => ({
          attendeeId: a.id,
          event: {
            title: a.event.title,
            slug: a.event.publicSlug,
            startsAt: a.event.startsAt?.toISOString() ?? null,
            city: a.event.city,
            venueName: a.event.venueName,
          },
          ticketType: a.ticketType.name,
          ticketUrl: a.ticketToken ? `/tickets/${a.ticketToken.token}` : null,
          appUrl: a.event.publicSlug
            ? `/e/${a.event.publicSlug}/app${a.ticketToken ? `?token=${a.ticketToken.token}` : ""}`
            : null,
          credentialStatus: a.credential?.status ?? null,
        })),
    });
  });
}

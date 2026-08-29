import { db } from "@/lib/db";
import { withApiContext, json, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { id } = await params;
    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        ticketType: { select: { name: true, priceCents: true } },
        event: { select: { title: true, publicSlug: true } },
        attendee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!registration) return errorJson(404, "NOT_FOUND", "Registration not found");

    return json({
      registration: {
        id: registration.id,
        status: registration.status,
        confirmedAt: registration.confirmedAt,
        ticketType: registration.ticketType,
        event: registration.event,
        attendee: registration.attendee,
      },
    });
  });
}

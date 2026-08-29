import { db } from "@/lib/db";
import { getPublicEventBySlug } from "@/lib/events/service";
import { withApiContext, json, errorJson } from "@/lib/api/response";
import { mergeFormSchema, type FormSchema } from "@/lib/registration/form-schema";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await getPublicEventBySlug(slug);
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const ticketTypes = await db.ticketType.findMany({
      where: {
        eventId: event.id,
        isActive: true,
        visibility: "public",
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        currency: true,
        quantity: true,
        soldCount: true,
        salesStartsAt: true,
        salesEndsAt: true,
        mode: true,
      },
    });

    const now = new Date();
    const ticketsWithAvailability = await Promise.all(
      ticketTypes.map(async (t) => {
        const { getAvailableQuantity } = await import("@/lib/registration/inventory");
        const available = await getAvailableQuantity(t.id);
        const salesOpen =
          (!t.salesStartsAt || t.salesStartsAt <= now) &&
          (!t.salesEndsAt || t.salesEndsAt >= now);
        return {
          ...t,
          available,
          soldOut: available !== null && available <= 0,
          salesOpen,
        };
      }),
    );

    const formSchema = mergeFormSchema(
      event.registrationFormSchema as FormSchema | null,
      null,
    );

    return json({
      event: {
        id: event.id,
        title: event.title,
        publicSlug: event.publicSlug,
        currency: event.currency,
        startsAt: event.startsAt,
        timezone: event.timezone,
      },
      ticketTypes: ticketsWithAvailability,
      formSchema,
    });
  });
}

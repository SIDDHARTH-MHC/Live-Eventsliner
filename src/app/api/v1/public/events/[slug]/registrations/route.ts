import { z } from "zod";
import { createRegistration } from "@/lib/registration/service";
import { withApiContext, json, errorJson } from "@/lib/api/response";

type RouteParams = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  ticketTypeId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  rsvpResponse: z.enum(["yes", "no"]).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return errorJson(400, "VALIDATION", "Invalid request body");
    }

    try {
      const result = await createRegistration({
        eventSlug: slug,
        ticketTypeId: body.ticketTypeId,
        answers: body.answers,
        rsvpResponse: body.rsvpResponse,
        sessionId: body.sessionId,
      });

      return json(
        {
          registration: {
            id: result.registration.id,
            status: result.registration.status,
            requiresPayment: result.requiresPayment,
          },
          order: result.order
            ? { id: result.order.id, totalCents: result.order.totalCents }
            : null,
          holdExpiresAt: result.holdExpiresAt,
        },
        { status: 201 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message === "EVENT_NOT_FOUND") return errorJson(404, "NOT_FOUND", "Event not found");
      if (message === "TICKET_NOT_FOUND") return errorJson(404, "NOT_FOUND", "Ticket not found");
      if (message === "TICKET_SOLD_OUT") return errorJson(400, "SOLD_OUT", "This ticket is sold out");
      if (message.startsWith("VALIDATION_ERROR:")) {
        const errors = JSON.parse(message.replace("VALIDATION_ERROR:", ""));
        return errorJson(400, "VALIDATION", "Please fix form errors", { fields: errors });
      }
      if (message === "SALES_NOT_STARTED") return errorJson(400, "SALES_CLOSED", "Sales have not started");
      if (message === "SALES_ENDED") return errorJson(400, "SALES_CLOSED", "Sales have ended");
      return errorJson(400, "REGISTRATION_ERROR", message);
    }
  });
}

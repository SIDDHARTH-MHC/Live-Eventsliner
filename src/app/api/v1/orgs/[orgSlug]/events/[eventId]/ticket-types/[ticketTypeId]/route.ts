import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import type { RegistrationMode } from "@prisma/client";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string; ticketTypeId: string }> };

async function loadTicketType(orgSlug: string, eventId: string, ticketTypeId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.orgId !== org.id) return null;
  const ticketType = await db.ticketType.findUnique({ where: { id: ticketTypeId } });
  if (!ticketType || ticketType.eventId !== eventId) return null;
  return { org, event, ticketType };
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().positive().nullable().optional(),
  salesStartsAt: z.string().datetime().nullable().optional(),
  salesEndsAt: z.string().datetime().nullable().optional(),
  visibility: z.enum(["public", "hidden"]).optional(),
  mode: z.enum(["open_free", "open_paid", "rsvp"]).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId, ticketTypeId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadTicketType(orgSlug, eventId, ticketTypeId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Ticket type not found");

    const allowed = await can(user, "ticket:manage", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    let body: z.infer<typeof updateSchema>;
    try {
      body = updateSchema.parse(await request.json());
    } catch {
      return errorJson(400, "VALIDATION", "Invalid ticket type data");
    }

    const priceCents = body.priceCents ?? loaded.ticketType.priceCents;
    let mode: RegistrationMode | undefined = body.mode as RegistrationMode | undefined;
    if (body.priceCents !== undefined || body.mode !== undefined) {
      mode = priceCents > 0 ? "open_paid" : body.mode === "rsvp" ? "rsvp" : "open_free";
    }

    const ticketType = await db.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        name: body.name,
        description: body.description,
        priceCents: body.priceCents,
        quantity: body.quantity,
        salesStartsAt:
          body.salesStartsAt !== undefined
            ? body.salesStartsAt
              ? new Date(body.salesStartsAt)
              : null
            : undefined,
        salesEndsAt:
          body.salesEndsAt !== undefined
            ? body.salesEndsAt
              ? new Date(body.salesEndsAt)
              : null
            : undefined,
        visibility: body.visibility,
        mode,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
    });

    return json({ ticketType });
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId, ticketTypeId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadTicketType(orgSlug, eventId, ticketTypeId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Ticket type not found");

    const allowed = await can(user, "ticket:manage", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    if (loaded.ticketType.soldCount > 0) {
      await db.ticketType.update({
        where: { id: ticketTypeId },
        data: { isActive: false },
      });
      return json({ archived: true });
    }

    await db.ticketType.delete({ where: { id: ticketTypeId } });
    return json({ deleted: true });
  });
}

import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import type { RegistrationMode } from "@prisma/client";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

async function loadEvent(orgSlug: string, eventId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.orgId !== org.id) return null;
  return { org, event };
}

export async function GET(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "ticket:manage", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const ticketTypes = await db.ticketType.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });

    return json({ ticketTypes });
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().default("INR"),
  quantity: z.number().int().positive().nullable().optional(),
  salesStartsAt: z.string().datetime().nullable().optional(),
  salesEndsAt: z.string().datetime().nullable().optional(),
  visibility: z.enum(["public", "hidden"]).default("public"),
  mode: z.enum(["open_free", "open_paid", "rsvp"]).default("open_free"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "ticket:manage", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    let body: z.infer<typeof createSchema>;
    try {
      body = createSchema.parse(await request.json());
    } catch {
      return errorJson(400, "VALIDATION", "Invalid ticket type data");
    }

    const mode: RegistrationMode =
      body.priceCents > 0 ? "open_paid" : body.mode === "rsvp" ? "rsvp" : "open_free";

    const ticketType = await db.ticketType.create({
      data: {
        eventId,
        orgId: loaded.event.orgId,
        name: body.name,
        description: body.description,
        priceCents: body.priceCents,
        currency: body.currency,
        quantity: body.quantity ?? null,
        salesStartsAt: body.salesStartsAt ? new Date(body.salesStartsAt) : null,
        salesEndsAt: body.salesEndsAt ? new Date(body.salesEndsAt) : null,
        visibility: body.visibility,
        mode,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
    });

    return json({ ticketType }, { status: 201 });
  });
}

import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = {
  params: Promise<{ orgSlug: string; eventId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const templates = await db.messageTemplate.findMany({
      where: { eventId },
      orderBy: { trigger: "asc" },
    });

    return json({ templates });
  });
}

const updateSchema = z.object({
  trigger: z.string(),
  subject: z.string().optional(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    const event = await db.event.findFirst({ where: { id: eventId, orgId: org?.id } });
    if (!org || !event) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", { type: "event", event });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = updateSchema.parse(await req.json());

    const template = await db.messageTemplate.upsert({
      where: {
        eventId_trigger_channel: {
          eventId,
          trigger: body.trigger,
          channel: "email",
        },
      },
      create: {
        orgId: org.id,
        eventId,
        trigger: body.trigger,
        channel: "email",
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        active: body.active ?? true,
      },
      update: {
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        active: body.active,
      },
    });

    return json({ template });
  });
}

import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { withApiContext, json, validateOrigin, errorJson } from "@/lib/api/response";
import { formSchemaValidator, DEFAULT_FORM_SCHEMA, type FormSchema } from "@/lib/registration/form-schema";

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

    const allowed = await can(user, "event:update", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const schema =
      (loaded.event.registrationFormSchema as FormSchema | null) ?? DEFAULT_FORM_SCHEMA;

    return json({ formSchema: schema });
  });
}

export async function PUT(request: Request, { params }: RouteParams) {
  return withApiContext(request, async () => {
    if (!validateOrigin(request)) return errorJson(403, "CSRF", "Invalid origin");

    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:update", {
      type: "event",
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = await request.json();
    const parsed = formSchemaValidator.safeParse(body.formSchema ?? body);
    if (!parsed.success) {
      return errorJson(400, "VALIDATION", "Invalid form schema");
    }

    const systemIds = ["first_name", "last_name", "email", "phone", "terms"];
    const hasAllSystem = systemIds.every((id) =>
      parsed.data.fields.some((f) => f.id === id && f.system),
    );
    if (!hasAllSystem) {
      return errorJson(400, "VALIDATION", "System fields (name, email, phone, terms) are required");
    }

    const event = await db.event.update({
      where: { id: eventId },
      data: { registrationFormSchema: parsed.data },
    });

    return json({ formSchema: event.registrationFormSchema });
  });
}

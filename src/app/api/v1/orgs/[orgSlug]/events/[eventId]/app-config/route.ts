import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(["universal", "white_label"]).optional(),
  displayName: z.string().min(1).max(80).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  tabs: z.array(z.string()).min(1).max(8).optional(),
  iosBundleId: z.string().max(120).nullable().optional(),
  androidPackage: z.string().max(120).nullable().optional(),
  storeListingNotes: z.string().max(2000).nullable().optional(),
  iconMediaId: z.string().nullable().optional(),
  splashMediaId: z.string().nullable().optional(),
});

async function loadEvent(orgSlug: string, eventId: string) {
  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return null;
  const event = await db.event.findFirst({
    where: { id: eventId, orgId: org.id },
    include: { appConfig: true },
  });
  if (!event) return null;
  return { org, event };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:read", {
      type: "event",
      org: loaded.org,
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    return json({
      config: loaded.event.appConfig ?? {
        enabled: false,
        mode: "universal",
        displayName: loaded.event.title,
        primaryColor: loaded.org.primaryColor,
        tabs: ["home", "pass", "schedule", "more"],
        buildStatus: "draft",
      },
    });
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const loaded = await loadEvent(orgSlug, eventId);
    if (!loaded) return errorJson(404, "NOT_FOUND", "Not found");

    const allowed = await can(user, "event:update", {
      type: "event",
      org: loaded.org,
      event: loaded.event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    const body = updateSchema.parse(await req.json());

    const config = await db.eventAppConfig.upsert({
      where: { eventId: loaded.event.id },
      create: {
        eventId: loaded.event.id,
        enabled: body.enabled ?? true,
        mode: body.mode ?? "universal",
        displayName: body.displayName ?? loaded.event.title,
        primaryColor: body.primaryColor ?? loaded.org.primaryColor,
        tabs: body.tabs ?? ["home", "pass", "schedule", "more"],
        iosBundleId: body.iosBundleId ?? undefined,
        androidPackage: body.androidPackage ?? undefined,
        storeListingNotes: body.storeListingNotes ?? undefined,
        iconMediaId: body.iconMediaId ?? undefined,
        splashMediaId: body.splashMediaId ?? undefined,
      },
      update: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.mode !== undefined ? { mode: body.mode } : {}),
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor } : {}),
        ...(body.tabs !== undefined ? { tabs: body.tabs } : {}),
        ...(body.iosBundleId !== undefined ? { iosBundleId: body.iosBundleId } : {}),
        ...(body.androidPackage !== undefined ? { androidPackage: body.androidPackage } : {}),
        ...(body.storeListingNotes !== undefined
          ? { storeListingNotes: body.storeListingNotes }
          : {}),
        ...(body.iconMediaId !== undefined ? { iconMediaId: body.iconMediaId } : {}),
        ...(body.splashMediaId !== undefined ? { splashMediaId: body.splashMediaId } : {}),
      },
    });

    await audit({
      orgId: loaded.org.id,
      actorId: user.id,
      action: "event_app_config.updated",
      targetType: "event",
      targetId: loaded.event.id,
      metadata: { mode: config.mode, enabled: config.enabled },
    });

    return json({ config });
  });
}

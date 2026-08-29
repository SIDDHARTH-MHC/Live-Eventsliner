import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/authz/can";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

type RouteParams = { params: Promise<{ orgSlug: string; eventId: string }> };

/**
 * Enqueue a Mode B white-label Flutter build (no per-event code).
 * Actual CI is wired via EVENT_APP_BUILD_WEBHOOK_URL when set.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { orgSlug, eventId } = await params;
    const user = await getSessionUser();
    if (!user) return errorJson(401, "UNAUTHORIZED", "Sign in required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Not found");

    const event = await db.event.findFirst({
      where: { id: eventId, orgId: org.id },
      include: { appConfig: true },
    });
    if (!event) return errorJson(404, "NOT_FOUND", "Event not found");

    const allowed = await can(user, "event:update", {
      type: "event",
      org,
      event,
    });
    if (!allowed) return errorJson(403, "FORBIDDEN", "Access denied");

    let config = event.appConfig;
    if (!config) {
      config = await db.eventAppConfig.create({
        data: {
          eventId: event.id,
          enabled: true,
          mode: "white_label",
          displayName: event.title,
          primaryColor: org.primaryColor,
        },
      });
    }

    if (config.mode !== "white_label") {
      return errorJson(
        400,
        "INVALID_STATE",
        "Switch mode to white_label before requesting a store build",
      );
    }

    config = await db.eventAppConfig.update({
      where: { id: config.id },
      data: { buildStatus: "queued", lastBuildAt: new Date() },
    });

    const payload = {
      eventId: event.id,
      eventSlug: event.publicSlug ?? event.slug,
      displayName: config.displayName ?? event.title,
      primaryColor: config.primaryColor ?? "6750A4",
      apiBaseUrl: process.env.APP_URL ?? "https://eventsliner-mh45.onrender.com",
      iosBundleId: config.iosBundleId,
      androidPackage: config.androidPackage,
      tabs: config.tabs,
    };

    const webhook = process.env.EVENT_APP_BUILD_WEBHOOK_URL;
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.EVENT_APP_BUILD_WEBHOOK_SECRET
              ? { Authorization: `Bearer ${process.env.EVENT_APP_BUILD_WEBHOOK_SECRET}` }
              : {}),
          },
          body: JSON.stringify({ event_type: "event_app.build", payload }),
        });
        if (!res.ok) {
          await db.eventAppConfig.update({
            where: { id: config.id },
            data: { buildStatus: "failed" },
          });
          return errorJson(502, "BUILD_WEBHOOK_FAILED", "Build factory rejected the job");
        }
        config = await db.eventAppConfig.update({
          where: { id: config.id },
          data: { buildStatus: "building" },
        });
      } catch {
        await db.eventAppConfig.update({
          where: { id: config.id },
          data: { buildStatus: "failed" },
        });
        return errorJson(502, "BUILD_WEBHOOK_FAILED", "Could not reach build factory");
      }
    }

    await audit({
      orgId: org.id,
      actorId: user.id,
      action: "event_app_config.build_queued",
      targetType: "event",
      targetId: event.id,
      metadata: { buildStatus: config.buildStatus },
    });

    return json(
      {
        config,
        factory: webhook ? "webhook" : "queued_local",
        message: webhook
          ? "White-label build sent to CI factory"
          : "Build queued. Set EVENT_APP_BUILD_WEBHOOK_URL to connect Codemagic/GitHub Actions.",
        flutterDefines: {
          API_BASE_URL: payload.apiBaseUrl,
          EVENT_SLUG: payload.eventSlug,
          APP_DISPLAY_NAME: payload.displayName,
          PRIMARY_COLOR: payload.primaryColor,
        },
      },
      { status: 202 },
    );
  });
}

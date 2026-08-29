import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { getSsoProvider } from "@/lib/sso/workos";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const orgSlug = new URL(req.url).searchParams.get("org");
    if (!orgSlug) return errorJson(400, "BAD_REQUEST", "org query param required");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org?.ssoEnabled) {
      return errorJson(400, "SSO_DISABLED", "SSO not enabled for this organization");
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:43123";
    const state = randomBytes(16).toString("base64url");
    const redirectUri = `${appUrl}/api/v1/auth/sso/callback?org=${orgSlug}`;

    const provider = getSsoProvider();
    const url = provider.getAuthorizationUrl(redirectUri, state);

    const cookieStore = await cookies();
    cookieStore.set("sso_state", state, { httpOnly: true, maxAge: 600, sameSite: "lax" });

    return json({ url });
  });
}

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const orgSlug = url.searchParams.get("org");
    const state = url.searchParams.get("state");

    if (!code || !orgSlug) return errorJson(400, "BAD_REQUEST", "Missing code or org");

    const cookieStore = await cookies();
    const savedState = cookieStore.get("sso_state")?.value;
    if (state && savedState && state !== savedState) {
      return errorJson(403, "INVALID_STATE", "SSO state mismatch");
    }

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");

    const provider = getSsoProvider();
    const profile = await provider.exchangeCode(code);

    let user = await db.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: profile.email,
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
          emailVerifiedAt: new Date(),
        },
      });
    }

    await db.membership.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      create: { orgId: org.id, userId: user.id, role: "member", acceptedAt: new Date() },
      update: {},
    });

    const token = await createSession(user.id, {
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    cookieStore.set("el_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return json({ ok: true, redirect: `/orgs/${orgSlug}` });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { withApiContext, errorJson } from "@/lib/api/response";
import { getSsoProvider } from "@/lib/sso/workos";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { audit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const orgSlug = url.searchParams.get("org");
    const state = url.searchParams.get("state");

    if (!code || !orgSlug) {
      return errorJson(400, "BAD_REQUEST", "Missing code or org");
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get("sso_state")?.value;
    if (state && savedState && state !== savedState) {
      return errorJson(403, "INVALID_STATE", "SSO state mismatch");
    }
    cookieStore.delete("sso_state");

    const org = await db.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return errorJson(404, "NOT_FOUND", "Organization not found");
    if (!org.ssoEnabled) {
      return errorJson(400, "SSO_DISABLED", "SSO not enabled for this organization");
    }

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

    await audit({
      orgId: org.id,
      actorId: user.id,
      action: "sso.login",
      targetType: "organization",
      targetId: org.id,
      metadata: { provider: org.ssoProvider ?? "workos", workosId: profile.workosId },
    });

    const token = await createSession(user.id, {
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:43123";
    const response = NextResponse.redirect(`${appUrl}/orgs/${orgSlug}`);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
};

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}

function getAllowedHosts(): string[] {
  const hosts: string[] = [];
  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  try {
    hosts.push(new URL(appUrl).host);
  } catch {
    /* ignore */
  }
  if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(",")) {
      try {
        hosts.push(new URL(o.trim()).host);
      } catch {
        /* ignore */
      }
    }
  }
  return hosts;
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const host = request.headers.get("host") ?? "";

  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);
  applySecurityHeaders(response);

  // Custom subdomain hint for server-side routing (Phase 17 stub)
  const appHost = process.env.APP_URL ? new URL(process.env.APP_URL).host : "";
  if (appHost && host !== appHost && !host.includes("localhost") && !host.includes("vercel.app")) {
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "www") {
      response.headers.set("X-Custom-Subdomain", subdomain);
    }
  }

  // CSRF: validate origin on mutating API requests with session cookie
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const allowedHosts = getAllowedHosts();
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const hasSession = request.cookies.has("el_session");

    if (hasSession && allowedHosts.length > 0 && (origin || referer)) {
      let hostOk = false;
      if (origin) {
        try {
          hostOk = allowedHosts.includes(new URL(origin).host);
        } catch {
          hostOk = false;
        }
      } else if (referer) {
        try {
          hostOk = allowedHosts.includes(new URL(referer).host);
        } catch {
          hostOk = false;
        }
      }
      if (!hostOk) {
        return NextResponse.json(
          { error: { code: "CSRF", message: "Origin not allowed" } },
          { status: 403 },
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

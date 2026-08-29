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

  // Custom subdomain hint — only for branded apex hosts, never IPs / localhost / platforms
  const hostNoPort = host.split(":")[0] ?? "";
  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostNoPort) || hostNoPort === "::1";
  const isLocalOrPlatform =
    isIpHost ||
    hostNoPort === "localhost" ||
    hostNoPort.endsWith(".localhost") ||
    hostNoPort.endsWith(".vercel.app") ||
    hostNoPort.endsWith(".onrender.com");
  const apex = "eventsliner.live";
  if (!isLocalOrPlatform && hostNoPort.endsWith(`.${apex}`) && hostNoPort !== apex) {
    const subdomain = hostNoPort.slice(0, -(apex.length + 1));
    if (subdomain && subdomain !== "www" && !subdomain.includes(".")) {
      response.headers.set("X-Custom-Subdomain", subdomain);
    }
  }

  // Provider webhooks authenticate via signature — skip CSRF origin check
  const path = request.nextUrl.pathname;
  const isProviderWebhook =
    path === "/api/v1/webhooks/razorpay" || path.startsWith("/api/v1/partners/");

  // CSRF: validate origin on mutating API requests with session cookie
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    path.startsWith("/api/") &&
    !isProviderWebhook
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

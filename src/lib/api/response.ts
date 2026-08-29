import { NextResponse } from "next/server";
import { createRequestId, log, runWithRequestContext } from "@/lib/observability/logger";
import { buildApiError } from "@/lib/api/errors";

export function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Request-Id", getRequestId());
  return NextResponse.json(data, { ...init, headers });
}

function getRequestId(): string {
  return createRequestId();
}

/**
 * AIP-193 HTTP/JSON error body.
 * Clients should read `error.status` (rpc Code), `error.reason` (ErrorInfo),
 * and `error.message`. Form UIs may use `error.fields` or BadRequest details.
 */
export function errorJson(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  const body = buildApiError(status, code, message, details);
  return json(body, { status });
}

export function validateOrigin(request: Request): boolean {
  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  let allowedHost: string;
  try {
    allowedHost = new URL(appUrl).host;
  } catch {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) return true;

  if (origin) {
    try {
      return new URL(origin).host === allowedHost;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      return new URL(referer).host === allowedHost;
    } catch {
      return false;
    }
  }

  return false;
}

export async function withApiContext(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const url = new URL(request.url);

  return runWithRequestContext(
    {
      requestId,
      path: url.pathname,
      method: request.method,
    },
    async () => {
      log("info", "request_start", { path: url.pathname, method: request.method });
      try {
        const response = await handler(request);
        response.headers.set("X-Request-Id", requestId);
        log("info", "request_end", { status: response.status });
        return response;
      } catch (error) {
        log("error", "request_error", {
          error: error instanceof Error ? error.message : String(error),
        });
        return errorJson(500, "INTERNAL_ERROR", "Something went wrong");
      }
    },
  );
}

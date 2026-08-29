import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

export type RequestContext = {
  requestId: string;
  path?: string;
  method?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  return storage.getStore() ?? { requestId: randomUUID() };
}

export function createRequestId(): string {
  return randomUUID();
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const ctx = getRequestContext();
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    requestId: ctx.requestId,
    path: ctx.path,
    method: ctx.method,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function captureSentryException(error: unknown, meta?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    log("error", "sentry_capture", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...meta,
    });
  }
}

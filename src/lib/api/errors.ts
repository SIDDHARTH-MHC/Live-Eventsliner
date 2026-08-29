/**
 * Google AIP-193 style API errors for HTTP/JSON.
 * @see https://cloud.google.com/apis/design/errors
 */

export type RpcStatus =
  | "OK"
  | "CANCELLED"
  | "UNKNOWN"
  | "INVALID_ARGUMENT"
  | "DEADLINE_EXCEEDED"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "UNAUTHENTICATED"
  | "RESOURCE_EXHAUSTED"
  | "FAILED_PRECONDITION"
  | "ABORTED"
  | "OUT_OF_RANGE"
  | "UNIMPLEMENTED"
  | "INTERNAL"
  | "UNAVAILABLE"
  | "DATA_LOSS";

const HTTP_TO_STATUS: Record<number, RpcStatus> = {
  400: "INVALID_ARGUMENT",
  401: "UNAUTHENTICATED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  409: "ALREADY_EXISTS",
  410: "FAILED_PRECONDITION",
  412: "FAILED_PRECONDITION",
  422: "INVALID_ARGUMENT",
  429: "RESOURCE_EXHAUSTED",
  500: "INTERNAL",
  501: "UNIMPLEMENTED",
  503: "UNAVAILABLE",
};

/** Prefer mapping from our reason when HTTP alone is ambiguous. */
const REASON_TO_STATUS: Partial<Record<string, RpcStatus>> = {
  UNAUTHORIZED: "UNAUTHENTICATED",
  FORBIDDEN: "PERMISSION_DENIED",
  CSRF: "PERMISSION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "INVALID_ARGUMENT",
  BAD_REQUEST: "INVALID_ARGUMENT",
  INVALID: "INVALID_ARGUMENT",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  SUBDOMAIN_TAKEN: "ALREADY_EXISTS",
  CONFLICT: "ABORTED",
  RATE_LIMITED: "RESOURCE_EXHAUSTED",
  REVOKED: "FAILED_PRECONDITION",
  INVALID_STATE: "FAILED_PRECONDITION",
  QUOTA_EXCEEDED: "RESOURCE_EXHAUSTED",
  INTERNAL_ERROR: "INTERNAL",
};

export type ErrorDetail =
  | {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo";
      reason: string;
      domain: string;
      metadata?: Record<string, string>;
    }
  | {
      "@type": "type.googleapis.com/google.rpc.BadRequest";
      fieldViolations: Array<{ field: string; description: string }>;
    }
  | {
      "@type": "type.googleapis.com/google.rpc.LocalizedMessage";
      locale: string;
      message: string;
    }
  | {
      "@type": "type.googleapis.com/google.rpc.Help";
      links: Array<{ description: string; url: string }>;
    };

export type ApiErrorBody = {
  error: {
    /** HTTP status code (AIP-193 JSON). */
    code: number;
    /** Developer-facing message. */
    message: string;
    /** google.rpc.Code name. */
    status: RpcStatus;
    details: ErrorDetail[];
    /**
     * Eventsliner machine reason (ErrorInfo.reason). Kept at top level so
     * existing clients can keep reading `error.reason` / legacy `error.code` string.
     */
    reason: string;
    /** @deprecated Prefer ErrorInfo; string alias of `reason` for older clients. */
    codeLegacy?: string;
    /** Convenience map for form UIs (also in BadRequest details). */
    fields?: Record<string, string>;
  };
};

function normalizeReason(reason: string): string {
  const cleaned = reason
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "UNKNOWN";
}

function metadataFromDetails(
  details?: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!details) return undefined;
  const meta: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (key === "fields") continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      meta[key] = String(value);
    }
  }
  return Object.keys(meta).length ? meta : undefined;
}

export function buildApiError(
  httpStatus: number,
  reason: string,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorBody {
  const reasonNorm = normalizeReason(reason);
  const status =
    REASON_TO_STATUS[reasonNorm] ?? HTTP_TO_STATUS[httpStatus] ?? "UNKNOWN";

  const errorDetails: ErrorDetail[] = [
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      reason: reasonNorm,
      domain: "eventsliner.live",
      metadata: metadataFromDetails(details),
    },
  ];

  const fields = details?.fields as Record<string, string> | undefined;
  if (fields && typeof fields === "object") {
    errorDetails.push({
      "@type": "type.googleapis.com/google.rpc.BadRequest",
      fieldViolations: Object.entries(fields).map(([field, description]) => ({
        field,
        description: String(description),
      })),
    });
  }

  errorDetails.push({
    "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
    locale: "en-IN",
    message,
  });

  return {
    error: {
      code: httpStatus,
      message,
      status,
      details: errorDetails,
      reason: reasonNorm,
      // Keep string code for brownfield: older clients used error.code as reason
      codeLegacy: reasonNorm,
      ...(fields ? { fields } : {}),
    },
  };
}

/** Resolve form field errors from either AIP BadRequest or Eventsliner `fields`. */
export function fieldErrorsFromApiError(body: {
  error?: {
    fields?: Record<string, string>;
    details?: unknown;
  };
}): Record<string, string> | undefined {
  if (body.error?.fields) return body.error.fields;
  const details = body.error?.details;
  if (!Array.isArray(details)) return undefined;
  const bad = details.find(
    (d) =>
      d &&
      typeof d === "object" &&
      (d as { "@type"?: string })["@type"] ===
        "type.googleapis.com/google.rpc.BadRequest",
  ) as { fieldViolations?: Array<{ field: string; description: string }> } | undefined;
  if (!bad?.fieldViolations?.length) return undefined;
  return Object.fromEntries(
    bad.fieldViolations.map((v) => [v.field, v.description]),
  );
}

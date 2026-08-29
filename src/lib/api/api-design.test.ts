import { describe, expect, it } from "vitest";
import { buildApiError, fieldErrorsFromApiError } from "@/lib/api/errors";
import {
  encodePageToken,
  paginateSlice,
  parsePageParams,
} from "@/lib/api/pagination";

describe("AIP-193 error body", () => {
  it("maps HTTP + reason to google.rpc.Status JSON", () => {
    const body = buildApiError(404, "NOT_FOUND", "Event not found");
    expect(body.error.code).toBe(404);
    expect(body.error.status).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Event not found");
    expect(body.error.reason).toBe("NOT_FOUND");
    const info = body.error.details.find(
      (d) => d["@type"] === "type.googleapis.com/google.rpc.ErrorInfo",
    );
    expect(info).toMatchObject({
      reason: "NOT_FOUND",
      domain: "eventsliner.live",
    });
  });

  it("maps UNAUTHORIZED reason to UNAUTHENTICATED status", () => {
    const body = buildApiError(401, "UNAUTHORIZED", "Sign in required");
    expect(body.error.status).toBe("UNAUTHENTICATED");
    expect(body.error.reason).toBe("UNAUTHORIZED");
  });

  it("includes BadRequest field violations and convenience fields", () => {
    const body = buildApiError(400, "VALIDATION_ERROR", "Invalid form", {
      fields: { email: "Required", phone: "Invalid" },
    });
    expect(body.error.fields).toEqual({ email: "Required", phone: "Invalid" });
    expect(fieldErrorsFromApiError(body)).toEqual({
      email: "Required",
      phone: "Invalid",
    });
  });
});

describe("AIP-158 pagination", () => {
  it("parses pageSize and pageToken", () => {
    const token = encodePageToken(50);
    const params = parsePageParams(
      new URLSearchParams({ pageSize: "10", pageToken: token }),
    );
    expect(params.pageSize).toBe(10);
    expect(params.offset).toBe(50);
  });

  it("clamps pageSize to max", () => {
    const params = parsePageParams(new URLSearchParams({ pageSize: "999" }), {
      maxPageSize: 100,
    });
    expect(params.pageSize).toBe(100);
  });

  it("slices and emits nextPageToken", () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const page = paginateSlice(items, { pageSize: 10, pageToken: null, offset: 0 });
    expect(page.items).toHaveLength(10);
    expect(page.nextPageToken).toBeTruthy();
    expect(page.totalSize).toBe(30);

    const next = parsePageParams(
      new URLSearchParams({ pageToken: page.nextPageToken! }),
    );
    const page2 = paginateSlice(items, { ...next, pageSize: 10 });
    expect(page2.items[0]).toBe(10);
  });
});

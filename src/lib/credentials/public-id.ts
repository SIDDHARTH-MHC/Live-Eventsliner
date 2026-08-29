import { randomBytes } from "crypto";

/** 128-bit random public_id — no PII, suitable for QR payload. */
export function generatePublicId(): string {
  return randomBytes(16).toString("base64url");
}

export function buildQrPayload(publicId: string): string {
  return `EL:${publicId}`;
}

export function parseQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("EL:")) {
    return trimmed.slice(3);
  }
  if (/^[A-Za-z0-9_-]{16,24}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

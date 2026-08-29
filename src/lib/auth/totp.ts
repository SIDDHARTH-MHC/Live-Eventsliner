import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";

/** TOTP stub for privileged actions (export, refund). Uses time-based 6-digit codes. */

function generateSecret(): string {
  return randomBytes(20).toString("base64url");
}

function hotp(secret: string, counter: number): string {
  const hmac = createHmac("sha1", Buffer.from(secret, "base64url"));
  hmac.update(Buffer.from(counter.toString()));
  const hash = hmac.digest();
  const offset = hash[hash.length - 1]! & 0x0f;
  const code =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string): boolean {
  const window = Math.floor(Date.now() / 30_000);
  for (let i = -1; i <= 1; i++) {
    if (hotp(secret, window + i) === code) return true;
  }
  return false;
}

export async function requireTotpForUser(userId: string, code?: string): Promise<boolean> {
  const totp = await db.totpSecret.findUnique({ where: { userId } });
  if (!totp?.enabled) return true;
  if (!code) return false;
  return verifyTotp(totp.secret, code);
}

export async function setupTotp(userId: string) {
  const secret = generateSecret();
  await db.totpSecret.upsert({
    where: { userId },
    create: { userId, secret, enabled: false },
    update: { secret, enabled: false },
  });
  return secret;
}

export async function enableTotp(userId: string, code: string) {
  const totp = await db.totpSecret.findUnique({ where: { userId } });
  if (!totp || !verifyTotp(totp.secret, code)) return false;
  await db.totpSecret.update({ where: { userId }, data: { enabled: true } });
  return true;
}

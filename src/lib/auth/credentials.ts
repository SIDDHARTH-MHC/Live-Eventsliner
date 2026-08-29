import { createHash, randomInt } from "crypto";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email/provider";
import { generateToken, hashToken } from "@/lib/auth/session";

const MAGIC_LINK_TTL_MINUTES = 15;

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

export async function sendMagicLink(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  let user = await db.user.findUnique({ where: { email: normalized } });

  if (!user) {
    user = await db.user.create({
      data: { email: normalized },
    });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await db.magicLinkToken.create({
    data: {
      userId: user.id,
      email: normalized,
      tokenHash,
      expiresAt,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  const link = `${appUrl}/auth/verify?token=${token}`;

  await getEmailProvider().send({
    to: normalized,
    subject: "Sign in to Eventsliner",
    html: `<p>Tap to sign in (expires in ${MAGIC_LINK_TTL_MINUTES} minutes):</p><p><a href="${link}">${link}</a></p>`,
    text: `Sign in to Eventsliner: ${link}`,
  });
}

export async function verifyMagicLink(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const record = await db.magicLinkToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await db.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  let userId = record.userId;
  if (!userId) {
    const user = await db.user.create({ data: { email: record.email } });
    userId = user.id;
  }

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  return userId;
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const normalized = phone.trim();
  let user = await db.user.findUnique({ where: { phone: normalized } });
  if (!user) {
    user = await db.user.create({ data: { phone: normalized } });
  }

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.otpCode.create({
    data: {
      userId: user.id,
      phone: normalized,
      codeHash: hashOtp(code),
      expiresAt,
    },
  });
}

export async function verifyOtp(phone: string, code: string): Promise<string | null> {
  const normalized = phone.trim();
  const record = await db.otpCode.findFirst({
    where: {
      phone: normalized,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.codeHash !== hashOtp(code)) {
    return null;
  }

  await db.otpCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  const user = await db.user.update({
    where: { id: record.userId! },
    data: { phoneVerifiedAt: new Date() },
  });

  return user.id;
}

import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export function generateTicketToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function ensureTicketToken(attendeeId: string): Promise<string> {
  const existing = await db.ticketToken.findUnique({ where: { attendeeId } });
  if (existing) return existing.token;

  const token = generateTicketToken();
  await db.ticketToken.create({
    data: { attendeeId, token },
  });
  return token;
}

export function ticketUrl(token: string): string {
  const appUrl = process.env.APP_URL ?? "http://localhost:43123";
  return `${appUrl}/tickets/${token}`;
}

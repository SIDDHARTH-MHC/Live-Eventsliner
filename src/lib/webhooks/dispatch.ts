import { createHmac } from "crypto";
import { db } from "@/lib/db";

export async function dispatchWebhook(
  orgId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { orgId, active: true, events: { has: eventType } },
  });

  for (const endpoint of endpoints) {
    const body = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");

    try {
      await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Eventsliner-Signature": signature,
        },
        body,
      });
    } catch {
      // Log in production; swallow in MVP
    }
  }
}

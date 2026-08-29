import { createHash } from "crypto";
import { db } from "@/lib/db";

export type ApiKeyContext = {
  orgId: string;
  scopes: string[];
  keyId: string;
};

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyContext | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const rawKey = auth.slice(7).trim();
  if (!rawKey.startsWith("el_")) return null;

  const apiKey = await db.apiKey.findFirst({
    where: { keyHash: hashKey(rawKey), revokedAt: null },
  });
  if (!apiKey) return null;

  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { orgId: apiKey.orgId, scopes: apiKey.scopes, keyId: apiKey.id };
}

export function hasScope(ctx: ApiKeyContext, scope: string): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes("*");
}

import Redis from "ioredis";
import { log } from "@/lib/observability/logger";

let redis: Redis | null = null;
let memoryStore = new Map<string, { value: string; expiresAt: number }>();

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on("error", (err) => log("error", "redis_error", { error: err.message }));
    return redis;
  } catch {
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const client = getRedis();
  if (client) {
    await client.connect().catch(() => undefined);
    return client.get(key);
  }
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.connect().catch(() => undefined);
    if (ttlSeconds) {
      await client.set(key, value, "EX", ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return;
  }
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Number.MAX_SAFE_INTEGER,
  });
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number> {
  const client = getRedis();
  if (client) {
    await client.connect().catch(() => undefined);
    const count = await client.incr(key);
    if (ttlSeconds && count === 1) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  }
  const current = await redisGet(key);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await redisSet(key, String(next), ttlSeconds);
  return next;
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedis();
  if (client) {
    await client.connect().catch(() => undefined);
    await client.del(key);
    return;
  }
  memoryStore.delete(key);
}

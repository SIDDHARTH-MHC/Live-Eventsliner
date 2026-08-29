import { redisIncr } from "@/lib/redis";

const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW_SECONDS = 10 * 60;

export async function checkOtpRateLimit(phone: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const key = `otp:rate:${phone}`;
  const count = await redisIncr(key, OTP_RATE_WINDOW_SECONDS);
  return {
    allowed: count <= OTP_RATE_LIMIT,
    remaining: Math.max(0, OTP_RATE_LIMIT - count),
  };
}

export async function checkOtpCooldown(phone: string): Promise<boolean> {
  const key = `otp:cooldown:${phone}`;
  const count = await redisIncr(key, 60);
  return count <= 1;
}

export async function checkRegistrationRateLimit(ip: string): Promise<boolean> {
  const key = `register:rate:${ip}`;
  const count = await redisIncr(key, 60 * 60);
  return count <= 20;
}

export async function checkApiRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const count = await redisIncr(`api:rate:${key}`, windowSec);
  return count <= limit;
}

export async function checkWebhookRateLimit(ip: string): Promise<boolean> {
  return checkApiRateLimit(`webhook:${ip}`, 100, 60);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiContext, json } from "@/lib/api/response";

export async function GET(request: Request) {
  return withApiContext(request, async () => {
    try {
      await db.$queryRaw`SELECT 1`;
      return json({
        status: "ok",
        timestamp: new Date().toISOString(),
        db: "connected",
      });
    } catch {
      return json(
        { status: "degraded", timestamp: new Date().toISOString(), db: "disconnected" },
        { status: 503 },
      );
    }
  });
}

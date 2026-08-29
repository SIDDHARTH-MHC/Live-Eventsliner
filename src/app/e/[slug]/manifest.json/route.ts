import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { slug } = await params;
    const event = await db.event.findFirst({
      where: { OR: [{ publicSlug: slug }, { slug }] },
    });
    if (!event || event.status !== "published") {
      return errorJson(404, "NOT_FOUND", "Event not found");
    }

    return json({
      name: event.title,
      short_name: event.title.slice(0, 12),
      start_url: `/e/${slug}/app`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#6750a4",
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
    });
  });
}

export async function POST() {
  return new Response(null, { status: 405 });
}

import { NextRequest } from "next/server";
import { withApiContext, json } from "@/lib/api/response";
import { discoverEvents, getDiscoverFacets, thisWeekendRange } from "@/lib/discovery/service";

export async function GET(request: NextRequest) {
  return withApiContext(request, async (req) => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const city = url.searchParams.get("city") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;
    const free = url.searchParams.get("free") === "true";
    const paid = url.searchParams.get("paid") === "true";
    const rail = url.searchParams.get("rail");
    const limit = parseInt(url.searchParams.get("limit") ?? "24", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    let from: Date | undefined;
    let to: Date | undefined;

    if (rail === "this_weekend") {
      const range = thisWeekendRange();
      from = range.from;
      to = range.to;
    }

    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    if (fromParam) from = new Date(fromParam);
    if (toParam) to = new Date(toParam);

    const [events, facets] = await Promise.all([
      discoverEvents({ q, city, category, type, free, paid, from, to, limit, offset }),
      getDiscoverFacets(),
    ]);

    return json({ events, facets, total: events.length });
  });
}

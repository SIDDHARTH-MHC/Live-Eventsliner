import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/** Custom subdomain landing — resolves org's next public event. */
export async function resolveCustomSubdomainRedirect(): Promise<string | null> {
  const h = await headers();
  const subdomain = h.get("x-custom-subdomain");
  if (!subdomain) return null;

  const org = await db.organization.findFirst({
    where: { customSubdomain: subdomain },
    include: {
      events: {
        where: { status: "published", visibility: "public" },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
  });

  if (org?.events[0]?.publicSlug) {
    return `/e/${org.events[0].publicSlug}`;
  }
  return `/o/${org?.slug ?? subdomain}`;
}

export async function customSubdomainRedirect() {
  const path = await resolveCustomSubdomainRedirect();
  if (path) redirect(path);
}

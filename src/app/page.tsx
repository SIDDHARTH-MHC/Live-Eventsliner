import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { customSubdomainRedirect } from "@/lib/domains/custom-subdomain";
import { EventslinerLiveWordmark } from "@/components/brand/eventsliner-live-wordmark";

export default async function HomePage() {
  await customSubdomainRedirect();

  const user = await getSessionUser();
  if (user) {
    const membership = await db.membership.findFirst({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) {
      redirect(`/orgs/${membership.org.slug}`);
    }
    redirect("/app");
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 safe-top safe-bottom">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--primary-container) 70%, transparent), transparent 70%), radial-gradient(ellipse 60% 50% at 100% 100%, color-mix(in srgb, var(--secondary-container) 55%, transparent), transparent 65%), var(--surface)",
        }}
      />
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h1 className="flex justify-center">
          <EventslinerLiveWordmark size="hero" href={null} />
        </h1>
        <p className="text-body-lg text-muted-foreground">
          Run events in India — branded pages, registration, and check-in on one platform.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/app">Explore events</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
        </div>
        <p className="text-body-sm text-muted-foreground">
          Organizing an event?{" "}
          <Link href="/orgs/new" className="text-primary underline">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
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
    redirect("/orgs/new");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 safe-top safe-bottom">
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <h1 className="text-display-sm">Eventsliner.live</h1>
        <p className="text-body-lg text-muted-foreground">
          Run events in India — branded pages, registration, and check-in on one platform.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/sign-in">Create organization</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

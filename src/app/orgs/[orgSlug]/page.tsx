import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/authz/can";
import { AppShell } from "@/components/shells/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function OrgHomePage({ params }: Props) {
  const { orgSlug } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/auth/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!org) notFound();

  const allowed = await can(user, "org:read", { type: "organization", org });
  if (!allowed) notFound();

  const hasEvents = org.events.length > 0;

  return (
    <AppShell orgName={org.name} orgSlug={org.slug}>
      {!hasEvents ? (
        <div className="mx-auto max-w-xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-headline">Welcome to {org.name}</h1>
            <p className="text-body text-muted-foreground">
              Create your first event to publish a branded page and start collecting registrations.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Create your first event</CardTitle>
              <CardDescription>
                Workshops, meetups, and conferences — one event, one website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg">
                <Link href={`/orgs/${org.slug}/events/new`}>Create event</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-headline">Events</h1>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/orgs/${org.slug}/settings/razorpay`}>Razorpay</Link>
              </Button>
              <Button asChild>
                <Link href={`/orgs/${org.slug}/events/new`}>Create event</Link>
              </Button>
            </div>
          </div>
          <ul className="space-y-3">
            {org.events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/orgs/${org.slug}/events/${event.id}`}
                  className="flex min-h-12 items-center justify-between rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-title-md">{event.title}</span>
                  <span className="text-label-sm text-muted-foreground capitalize">{event.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";

type FeedEvent = {
  id: string;
  title: string;
  slug: string | null;
  startsAt: string | null;
  city: string | null;
  organizer: { name: string; slug: string };
  priceFromCents: number;
  url: string | null;
};

export default function FollowingPage() {
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [follows, setFollows] = useState<{ org: { name: string; slug: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    fetch("/api/v1/me/following")
      .then(async (r) => {
        if (r.status === 401) {
          setAuthRequired(true);
          return;
        }
        const data = await r.json();
        setFeed(data.feed ?? []);
        setFollows(data.follows ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <nav className="mb-6 flex gap-2">
          <Link href="/app" className="text-body text-primary underline">
            Home
          </Link>
          <Link href="/my/tickets" className="text-body text-primary underline">
            My Tickets
          </Link>
          <Link href="/discover" className="text-body text-primary underline">
            Discover
          </Link>
        </nav>

        <h1 className="text-display font-bold">Following</h1>
        <p className="mt-2 text-body-lg text-muted-foreground">
          Public events from organizers you follow
        </p>

        {authRequired ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">Sign in to follow organizers</p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        ) : loading ? (
          <p className="mt-8 text-body">Loading…</p>
        ) : follows.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">Not following anyone yet</p>
            <p className="mt-2 text-body text-muted-foreground">
              Follow organizers from their profile page to see their events here.
            </p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/discover">Discover events</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-body">
              Following {follows.length} organizer{follows.length !== 1 ? "s" : ""}:{" "}
              {follows.map((f) => f.org.name).join(", ")}
            </p>
            <ul className="mt-6 space-y-3">
              {feed.length === 0 ? (
                <li className="text-body text-muted-foreground">No upcoming events from followed organizers</li>
              ) : (
                feed.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={e.url ?? "#"}
                      className="flex min-h-14 items-center justify-between rounded-[var(--radius-sm)] border border-outline px-4 py-3 hover:bg-surface-container"
                    >
                      <div>
                        <p className="text-body-lg font-medium">{e.title}</p>
                        <p className="text-body-sm text-muted-foreground">
                          {e.organizer.name}
                          {e.startsAt
                            ? ` · ${new Date(e.startsAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`
                            : ""}
                        </p>
                      </div>
                      <span className="text-body font-medium">
                        {e.priceFromCents === 0
                          ? "Free"
                          : `₹${(e.priceFromCents / 100).toLocaleString("en-IN")}`}
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </PublicShell>
  );
}

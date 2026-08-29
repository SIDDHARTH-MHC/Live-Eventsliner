"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";

type SavedEvent = {
  eventId: string;
  title: string;
  slug: string | null;
  startsAt: string | null;
  city: string | null;
  url: string | null;
};

export default function CalendarPage() {
  const [saved, setSaved] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    fetch("/api/v1/me/saved-events")
      .then(async (r) => {
        if (r.status === 401) {
          setAuthRequired(true);
          return;
        }
        const data = await r.json();
        setSaved(data.saved ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function removeEvent(slug: string | null) {
    if (!slug) return;
    await fetch(`/api/v1/me/saved-events?eventSlug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    setSaved((prev) => prev.filter((s) => s.slug !== slug));
  }

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

        <h1 className="text-display font-bold">Saved events</h1>
        <p className="mt-2 text-body-lg text-muted-foreground">
          Events you saved to your calendar
        </p>

        {authRequired ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">Sign in to save events</p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        ) : loading ? (
          <p className="mt-8 text-body">Loading…</p>
        ) : saved.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">No saved events</p>
            <p className="mt-2 text-body text-muted-foreground">
              Save events from Discover to build your calendar.
            </p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/discover">Discover events</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {saved.map((e) => (
              <li
                key={e.eventId}
                className="flex min-h-14 items-center justify-between rounded-[var(--radius-sm)] border border-outline px-4 py-3"
              >
                <Link href={e.url ?? "#"} className="flex-1">
                  <p className="text-body-lg font-medium">{e.title}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {e.startsAt
                      ? new Date(e.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                      : "Date TBA"}
                    {e.city ? ` · ${e.city}` : ""}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  className="min-h-12 text-destructive"
                  onClick={() => removeEvent(e.slug)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}

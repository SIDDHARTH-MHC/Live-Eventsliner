"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";

type Ticket = {
  attendeeId: string;
  event: { title: string; slug: string | null; startsAt: string | null; city: string | null };
  ticketType: string;
  ticketUrl: string | null;
  appUrl: string | null;
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    fetch("/api/v1/me/tickets")
      .then(async (r) => {
        if (r.status === 401) {
          setAuthRequired(true);
          return;
        }
        const data = await r.json();
        setTickets(data.tickets ?? []);
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
          <Link href="/discover" className="text-body text-primary underline">
            Discover
          </Link>
          <Link href="/following" className="text-body text-primary underline">
            Following
          </Link>
          <Link href="/calendar" className="text-body text-primary underline">
            Calendar
          </Link>
        </nav>

        <h1 className="text-display font-bold">My Tickets</h1>
        <p className="mt-2 text-body-lg text-muted-foreground">
          Your passes across all Eventsliner events
        </p>

        {authRequired ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">Sign in to see your tickets</p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        ) : loading ? (
          <p className="mt-8 text-body">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-md)] border border-outline px-6 py-12 text-center">
            <p className="text-headline-sm">No tickets yet</p>
            <p className="mt-2 text-body text-muted-foreground">
              Register for an event to see your pass here.
            </p>
            <Button asChild className="mt-4 min-h-12">
              <Link href="/discover">Discover events</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {tickets.map((t) => (
              <li
                key={t.attendeeId}
                className="rounded-[var(--radius-md)] border border-outline p-4"
              >
                <p className="text-title font-semibold">{t.event.title}</p>
                <p className="text-body-sm text-muted-foreground">
                  {t.event.startsAt
                    ? new Date(t.event.startsAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "Date TBA"}
                  {t.event.city ? ` · ${t.event.city}` : ""}
                </p>
                <p className="mt-1 text-body">{t.ticketType}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.ticketUrl ? (
                    <Button asChild size="sm" className="min-h-12">
                      <Link href={t.ticketUrl}>Open ticket</Link>
                    </Button>
                  ) : null}
                  {t.appUrl ? (
                    <Button asChild variant="outline" size="sm" className="min-h-12">
                      <Link href={t.appUrl}>Event app</Link>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}

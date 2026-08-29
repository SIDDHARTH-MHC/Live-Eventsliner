"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";

type EventCard = {
  id: string;
  title: string;
  slug: string | null;
  startsAt: string | null;
  city: string | null;
  priceFromCents: number;
  isFree: boolean;
  url: string | null;
};

export default function ConsumerAppPage() {
  const [city, setCity] = useState("Delhi");
  const [weekend, setWeekend] = useState<EventCard[]>([]);
  const [free, setFree] = useState<EventCard[]>([]);
  const [trending, setTrending] = useState<EventCard[]>([]);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    const base = `/api/v1/discover?city=${encodeURIComponent(city)}&limit=6`;
    Promise.all([
      fetch(`${base}&rail=this_weekend`).then((r) => r.json()),
      fetch(`${base}&free=true`).then((r) => r.json()),
      fetch(`/api/v1/discover?rail=trending&limit=6`).then((r) => r.json()),
      fetch("/api/v1/me/tickets").then(async (r) => (r.ok ? r.json() : { tickets: [] })),
    ]).then(([w, f, t, tickets]) => {
      setWeekend(w.events ?? []);
      setFree(f.events ?? []);
      setTrending(t.events ?? []);
      setTicketCount(tickets.tickets?.length ?? 0);
    });
  }, [city]);

  function EventRail({ title, events }: { title: string; events: EventCard[] }) {
    if (events.length === 0) return null;
    return (
      <section className="mt-8">
        <h2 className="text-headline-sm font-semibold">{title}</h2>
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {events.map((e) => (
            <li key={e.id} className="min-w-[260px] shrink-0">
              <Link
                href={e.url ?? "#"}
                className="flex min-h-[140px] flex-col rounded-[var(--radius-md)] border border-outline p-4 hover:bg-surface-container"
              >
                <p className="text-label text-muted-foreground">
                  {e.startsAt
                    ? new Date(e.startsAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
                    : "TBA"}
                </p>
                <p className="mt-2 text-body-lg font-medium line-clamp-2">{e.title}</p>
                <p className="mt-auto pt-3 text-body font-medium">
                  {e.isFree || e.priceFromCents === 0
                    ? "Free"
                    : `₹${(e.priceFromCents / 100).toLocaleString("en-IN")}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display font-bold">Eventsliner</h1>
            <p className="mt-1 text-body-lg text-muted-foreground">Discover events in India</p>
          </div>
          <select
            className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="Delhi">Delhi</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="">All cities</option>
          </select>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="default" className="min-h-12">
            <Link href="/discover">Discover</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12">
            <Link href="/my/tickets">My Tickets{ticketCount ? ` (${ticketCount})` : ""}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12">
            <Link href="/following">Following</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12">
            <Link href="/calendar">Saved</Link>
          </Button>
        </nav>

        <EventRail title="This weekend" events={weekend} />
        <EventRail title="Free events" events={free} />
        <EventRail title="Trending" events={trending} />

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="min-h-12">
            <Link href="/discover">Browse all events</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}

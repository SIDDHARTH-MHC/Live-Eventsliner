"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type EventCard = {
  id: string;
  title: string;
  slug: string | null;
  startsAt: string | null;
  city: string | null;
  category: string | null;
  venueName: string | null;
  priceFromCents: number;
  isFree: boolean;
  organizer: { name: string; slug: string };
  url: string | null;
};

type Facets = {
  cities: string[];
  categories: string[];
};

export default function DiscoverPage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [facets, setFacets] = useState<Facets>({ cities: [], categories: [] });
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Delhi");
  const [category, setCategory] = useState("");
  const [priceFilter, setPriceFilter] = useState<"" | "free" | "paid">("");
  const [rail, setRail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    if (priceFilter === "free") params.set("free", "true");
    if (priceFilter === "paid") params.set("paid", "true");
    if (rail) params.set("rail", rail);

    fetch(`/api/v1/discover?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setFacets(data.facets ?? { cities: [], categories: [] });
      })
      .finally(() => setLoading(false));
  }, [q, city, category, priceFilter, rail]);

  function formatPrice(cents: number, isFree: boolean) {
    if (isFree || cents === 0) return "Free";
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Date TBA";
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-display font-bold">Discover events</h1>
          <p className="mt-2 text-body-lg text-muted-foreground">
            Find workshops, meetups, and conferences in India
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { id: "", label: "All upcoming" },
            { id: "this_weekend", label: "This weekend" },
            { id: "trending", label: "Trending" },
          ].map((r) => (
            <Button
              key={r.id}
              variant={rail === r.id ? "default" : "outline"}
              className="min-h-12"
              onClick={() => setRail(r.id)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search events…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-h-12 sm:col-span-2"
          />
          <select
            className="min-h-12 rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All cities</option>
            {facets.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {!facets.cities.includes("Delhi") ? <option value="Delhi">Delhi</option> : null}
          </select>
          <Button
            variant={priceFilter === "free" ? "default" : "outline"}
            className="min-h-12"
            onClick={() => setPriceFilter(priceFilter === "free" ? "" : "free")}
          >
            Free only
          </Button>
        </div>

        {category || facets.categories.length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              className={`min-h-10 rounded-full px-4 text-body ${!category ? "bg-primary text-primary-foreground" : "border border-outline"}`}
              onClick={() => setCategory("")}
            >
              All
            </button>
            {facets.categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`min-h-10 rounded-full px-4 text-body capitalize ${category === c ? "bg-primary text-primary-foreground" : "border border-outline"}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="text-body-lg">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-outline px-6 py-16 text-center">
            <p className="text-headline-sm">No events found</p>
            <p className="mt-2 text-body text-muted-foreground">
              Try a different city or search term. Only public published events appear here.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={event.url ?? "#"}
                  className="flex min-h-[180px] flex-col rounded-[var(--radius-md)] border border-outline p-4 transition-colors hover:bg-surface-container"
                >
                  <p className="text-label text-muted-foreground">
                    {formatDate(event.startsAt)}
                    {event.city ? ` · ${event.city}` : ""}
                  </p>
                  <h2 className="mt-2 text-title font-semibold line-clamp-2">{event.title}</h2>
                  {event.venueName ? (
                    <p className="mt-1 text-body-sm text-muted-foreground line-clamp-1">
                      {event.venueName}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-body font-medium">
                      {formatPrice(event.priceFromCents, event.isFree)}
                    </span>
                    <span className="text-body-sm text-muted-foreground">
                      {event.organizer.name}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}

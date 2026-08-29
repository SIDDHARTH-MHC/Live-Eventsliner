"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";

type Profile = {
  org: { name: string; slug: string; primaryColor: string | null; country: string };
  events: {
    id: string;
    title: string;
    slug: string | null;
    startsAt: string | null;
    city: string | null;
    priceFromCents: number;
    url: string | null;
  }[];
};

export default function OrganizerProfilePage() {
  const params = useParams<{ orgSlug: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/v1/public/organizers/${params.orgSlug}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error?.message ?? "Not found");
          return;
        }
        setProfile(data);
      });
  }, [params.orgSlug]);

  if (error) {
    return (
      <PublicShell>
        <p className="p-8 text-body">{error}</p>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <p className="p-8 text-body">Loading…</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/discover" className="text-body text-primary underline">
          ← Discover
        </Link>
        <header className="mt-4">
          <h1 className="text-display font-bold">{profile.org.name}</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Organizer · {profile.org.country === "IN" ? "India" : profile.org.country}
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-headline-sm font-semibold">Upcoming public events</h2>
          {profile.events.length === 0 ? (
            <p className="mt-4 text-body text-muted-foreground">No upcoming public events</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {profile.events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={e.url ?? "#"}
                    className="flex min-h-14 items-center justify-between rounded-[var(--radius-sm)] border border-outline px-4 py-3 hover:bg-surface-container"
                  >
                    <div>
                      <p className="text-body-lg font-medium">{e.title}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {e.startsAt
                          ? new Date(e.startsAt).toLocaleDateString("en-IN", {
                              dateStyle: "medium",
                              timeZone: "Asia/Kolkata",
                            })
                          : "Date TBA"}
                        {e.city ? ` · ${e.city}` : ""}
                      </p>
                    </div>
                    <span className="text-body font-medium">
                      {e.priceFromCents === 0
                        ? "Free"
                        : `₹${(e.priceFromCents / 100).toLocaleString("en-IN")}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicShell>
  );
}

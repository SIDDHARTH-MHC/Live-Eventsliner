"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";

type Profile = {
  org: {
    name: string;
    slug: string;
    bio: string | null;
    website: string | null;
    city: string | null;
    country: string;
  };
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
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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
    fetch("/api/v1/me/following")
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setFollowing(
          (data.follows ?? []).some(
            (f: { org: { slug: string } }) => f.org.slug === params.orgSlug,
          ),
        );
      });
  }, [params.orgSlug]);

  async function toggleFollow() {
    setFollowLoading(true);
    if (following) {
      await fetch(`/api/v1/me/following?orgSlug=${encodeURIComponent(params.orgSlug)}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      setFollowing(false);
    } else {
      const res = await fetch("/api/v1/me/following", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ orgSlug: params.orgSlug }),
      });
      if (res.status === 401) {
        window.location.href = "/auth/sign-in";
        return;
      }
      setFollowing(true);
    }
    setFollowLoading(false);
  }

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
        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display font-bold">{profile.org.name}</h1>
            <p className="mt-2 text-body text-muted-foreground">
              Organizer
              {profile.org.city ? ` · ${profile.org.city}` : ""}
              {profile.org.country === "IN" ? " · India" : ""}
            </p>
            {profile.org.bio ? (
              <p className="mt-4 text-body-lg">{profile.org.bio}</p>
            ) : null}
            {profile.org.website ? (
              <a
                href={profile.org.website}
                className="mt-2 inline-block text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.org.website}
              </a>
            ) : null}
          </div>
          <Button
            variant={following ? "secondary" : "default"}
            className="min-h-12"
            disabled={followLoading}
            onClick={toggleFollow}
          >
            {following ? "Following" : "Follow"}
          </Button>
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

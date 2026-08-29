"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EventData = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  description: string | null;
  timezone: string;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  capacity: number | null;
  publicSlug: string | null;
};

export default function EventSettingsPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [params.orgSlug, params.eventId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setStatus("saving");
    setMessage("");
    const res = await fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        title: event.title,
        description: event.description,
        timezone: event.timezone,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        city: event.city,
        capacity: event.capacity,
        visibility: event.visibility,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvent(data.event);
      setMessage("Saved");
      setStatus("idle");
    } else {
      setStatus("error");
      setMessage("Unable to save");
    }
  }

  async function publish() {
    setStatus("saving");
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/publish`,
      {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    );
    if (res.ok) {
      router.refresh();
      const data = await res.json();
      setEvent(data.event);
      setMessage("Published");
      setStatus("idle");
    } else {
      const data = await res.json();
      setMessage(data.error?.message ?? "Unable to publish");
      setStatus("error");
    }
  }

  async function unpublish() {
    setStatus("saving");
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/unpublish`,
      { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" } },
    );
    if (res.ok) {
      const data = await res.json();
      setEvent(data.event);
      setMessage("Unpublished");
      setStatus("idle");
    }
  }

  if (status === "loading" || !event) {
    return <p className="p-8 text-body">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/orgs/${params.orgSlug}`} className="text-label text-primary underline">
            Back to org
          </Link>
          <h1 className="mt-2 text-headline">Event settings</h1>
          <p className="text-body-sm capitalize text-muted-foreground">Status: {event.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/orgs/${params.orgSlug}/events/${params.eventId}/preview`}>
              Preview
            </Link>
          </Button>
          {event.status === "published" ? (
            <Button variant="secondary" onClick={unpublish}>
              Unpublish
            </Button>
          ) : (
            <Button onClick={publish}>Publish event</Button>
          )}
        </div>
      </div>

      {event.publicSlug && event.status === "published" ? (
        <Card>
          <CardHeader>
            <CardTitle>Public page</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`/e/${event.publicSlug}`}
              className="text-body text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              /e/{event.publicSlug}
            </a>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-24 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 py-3 text-body"
                value={event.description ?? ""}
                onChange={(e) => setEvent({ ...event, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts (local)</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={event.startsAt ? event.startsAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={event.timezone}
                  onChange={(e) => setEvent({ ...event, timezone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueName">Venue name</Label>
              <Input
                id="venueName"
                value={event.venueName ?? ""}
                onChange={(e) => setEvent({ ...event, venueName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={event.city ?? ""}
                onChange={(e) => setEvent({ ...event, city: e.target.value })}
                placeholder="Delhi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                className="flex h-12 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
                value={event.visibility}
                onChange={(e) => setEvent({ ...event, visibility: e.target.value })}
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
            {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

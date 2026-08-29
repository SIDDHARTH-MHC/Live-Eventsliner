"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PublicShell } from "@/components/shells/public-shell";

export default function WatchPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stream, setStream] = useState<{ title: string; embedUrl: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setAuthorized(false);
      return;
    }
    fetch(`/api/v1/public/events/${params.slug}/watch?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        setStream(data.stream);
      });
  }, [params.slug, token]);

  useEffect(() => {
    if (!authorized || !stream) return;
    const interval = setInterval(() => {
      fetch("/api/v1/analytics/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "stream.watch_minute",
          properties: { slug: params.slug, streamTitle: stream.title },
        }),
      }).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(interval);
  }, [authorized, stream, params.slug]);

  if (authorized === null) {
    return (
      <PublicShell>
        <p className="p-8">Verifying access…</p>
      </PublicShell>
    );
  }

  if (!authorized || !stream) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-headline">Access denied</h1>
          <p className="mt-4 text-body text-muted-foreground">
            Virtual stream access requires a valid virtual or hybrid ticket.
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-headline mb-4">{stream.title}</h1>
        <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-md)] bg-black">
          <iframe
            src={stream.embedUrl}
            title={stream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </PublicShell>
  );
}

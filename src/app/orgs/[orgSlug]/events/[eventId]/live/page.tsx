"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LiveSummary = {
  registered: number;
  checkedIn: number;
  checkInRate: number;
  recent: { name: string; at: string }[];
};

export default function LiveDashboardPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [summary, setSummary] = useState<LiveSummary | null>(null);

  useEffect(() => {
    function poll() {
      fetch(`/api/v1/events/${params.eventId}/live`)
        .then((r) => r.json())
        .then(setSummary);
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [params.eventId]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
          className="text-label text-primary underline"
        >
          ← Event settings
        </Link>
        <h1 className="mt-2 text-headline">Live check-in</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-label text-muted-foreground">Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display font-bold">{summary?.registered ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-label text-muted-foreground">Checked in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display font-bold text-primary">{summary?.checkedIn ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-label text-muted-foreground">Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display font-bold">{summary ? `${summary.checkInRate}%` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recent.length ? (
            <ul className="space-y-2 text-body">
              {summary.recent.map((r, i) => (
                <li key={i} className="flex justify-between border-b border-border py-2">
                  <span>{r.name}</span>
                  <span className="text-body-sm text-muted-foreground">
                    {new Date(r.at).toLocaleTimeString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-muted-foreground">No check-ins yet</p>
          )}
        </CardContent>
      </Card>

      <Link
        href={`/orgs/${params.orgSlug}/events/${params.eventId}/check-in`}
        className="inline-flex min-h-12 items-center text-body text-primary underline"
      >
        Open check-in scanner →
      </Link>
    </div>
  );
}

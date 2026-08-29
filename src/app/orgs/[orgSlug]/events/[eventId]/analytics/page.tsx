"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Analytics = {
  funnel: {
    pageViews: number;
    registered: number;
    checkedIn: number;
    conversionRate: number;
    checkInRate: number;
  };
  revenue: { totalCents: number; orderCount: number; currency: string };
  ticketBreakdown: { ticketType: string; count: number }[];
  checkInHistogram: { hour: number; count: number }[];
};

export default function EventAnalyticsPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/analytics`)
      .then((r) => r.json())
      .then((data) => setAnalytics(data.analytics));
  }, [params.orgSlug, params.eventId]);

  if (!analytics) {
    return <p className="p-8 text-body">Loading analytics…</p>;
  }

  const maxHour = Math.max(...analytics.checkInHistogram.map((h) => h.count), 1);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
        className="text-label text-primary underline"
      >
        ← Event settings
      </Link>
      <h1 className="text-headline">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-label">Page views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display-sm">{analytics.funnel.pageViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-label">Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display-sm">{analytics.funnel.registered}</p>
            <p className="text-body-sm text-muted-foreground">
              {analytics.funnel.conversionRate}% conversion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-label">Checked in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display-sm">{analytics.funnel.checkedIn}</p>
            <p className="text-body-sm text-muted-foreground">
              {analytics.funnel.checkInRate}% of registered
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-label">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-display-sm">
              ₹{(analytics.revenue.totalCents / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-body-sm text-muted-foreground">
              {analytics.revenue.orderCount} paid orders
            </p>
          </CardContent>
        </Card>
      </div>

      {analytics.ticketBreakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ticket breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-body">
              {analytics.ticketBreakdown.map((t) => (
                <li key={t.ticketType} className="flex justify-between">
                  <span>{t.ticketType}</span>
                  <span>{t.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {analytics.checkInHistogram.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Check-in by hour (IST)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {analytics.checkInHistogram.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${(h.count / maxHour) * 100}%`, minHeight: h.count ? 4 : 0 }}
                  />
                  <span className="text-label text-muted-foreground">{h.hour}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

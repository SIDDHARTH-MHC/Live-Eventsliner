"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";

type TicketData = {
  attendee: {
    firstName: string;
    lastName: string;
    ticketType: string;
    status: string;
  };
  event: {
    title: string;
    startsAt: string | null;
    timezone: string;
    venueName: string | null;
    venueAddress: string | null;
    city: string | null;
    publicSlug: string | null;
  };
  qrPayload: string;
  qrSvg: string;
};

export default function TicketPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<TicketData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/tickets/${params.token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          setError(body.error?.message ?? "Ticket not found");
          return;
        }
        setData(body);
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <PublicShell>
        <p className="p-8 text-body-lg">Loading your pass…</p>
      </PublicShell>
    );
  }

  if (error || !data) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-headline">Ticket unavailable</h1>
          <p className="mt-4 text-body text-muted-foreground">{error || "Not found"}</p>
        </div>
      </PublicShell>
    );
  }

  const dateLabel = data.event.startsAt
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: data.event.timezone,
      }).format(new Date(data.event.startsAt))
    : "Date TBA";

  const checkedIn = data.attendee.status === "checked_in";

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="text-center">
          <p className="text-label uppercase tracking-wide text-muted-foreground">Your pass</p>
          <h1 className="mt-2 text-headline">{data.event.title}</h1>
          <p className="mt-2 text-title">
            {data.attendee.firstName} {data.attendee.lastName}
          </p>
          <p className="text-body text-muted-foreground">{data.attendee.ticketType}</p>
        </div>

        <div
          className="mx-auto mt-8 flex max-w-[320px] flex-col items-center rounded-[var(--radius-lg)] border-2 border-foreground bg-white p-6"
          aria-label="QR code for check-in"
        >
          <div
            className="w-full [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: data.qrSvg }}
          />
          {checkedIn ? (
            <p
              className="mt-4 rounded-full bg-green-100 px-4 py-2 text-body-lg font-semibold text-green-900"
              role="status"
            >
              ✓ Checked in
            </p>
          ) : (
            <p className="mt-4 text-body-lg font-medium">Show this QR at the gate</p>
          )}
        </div>

        <div className="mt-8 space-y-3 text-body">
          <p>
            <span className="font-medium">When:</span> {dateLabel}
          </p>
          {data.event.venueName ? (
            <p>
              <span className="font-medium">Where:</span> {data.event.venueName}
              {data.event.city ? `, ${data.event.city}` : ""}
            </p>
          ) : null}
        </div>

        {data.event.publicSlug ? (
          <Link
            href={`/e/${data.event.publicSlug}`}
            className="mt-8 inline-flex min-h-12 items-center text-body text-primary underline"
          >
            View event details
          </Link>
        ) : null}

        <p className="mt-12 text-body-sm text-muted-foreground">
          Add this page to your home screen for quick access at the venue.
        </p>
      </div>
    </PublicShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Attendee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  ticketType: { name: string };
  registration: { id: string; status: string; confirmedAt: string | null };
};

export default function AttendeesPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState<"loading" | "idle">("loading");
  const [message, setMessage] = useState("");
  const [live, setLive] = useState<{ registered: number; checkedIn: number } | null>(null);
  const [timelineAttendeeId, setTimelineAttendeeId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{
    attendee: { name: string; email: string; status: string };
    checkIns: { id: string; result: string; scannedAt: string; isManual: boolean }[];
    messages: { id: string; trigger: string; channel: string; status: string; createdAt: string }[];
  } | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  function load() {
    const qs = new URLSearchParams();
    if (query) qs.set("q", query);
    if (statusFilter) qs.set("status", statusFilter);
    fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/attendees?${qs.toString()}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setAttendees(data.attendees ?? []);
        setStatus("idle");
      });
  }

  useEffect(() => {
    load();
    fetch(`/api/v1/events/${params.eventId}/live`)
      .then((r) => r.json())
      .then((data) => setLive({ registered: data.registered, checkedIn: data.checkedIn }));
  }, [params.orgSlug, params.eventId, query, statusFilter]);

  async function cancelRegistration(registrationId: string) {
    if (!confirm("Cancel this registration? A full refund will be attempted for paid tickets.")) {
      return;
    }
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/registrations/${registrationId}`,
      {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    );
    if (res.ok) {
      setMessage("Registration cancelled");
      load();
    }
  }

  async function resendConfirmation(registrationId: string) {
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/registrations/${registrationId}/resend`,
      {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    );
    if (res.ok) {
      setMessage("Confirmation email sent");
    }
  }

  async function openCrm(attendeeId: string) {
    setTimelineAttendeeId(attendeeId);
    setTimelineLoading(true);
    setTimeline(null);
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/analytics?attendeeId=${attendeeId}`,
    );
    const data = await res.json();
    setTimeline(data.timeline ?? null);
    setTimelineLoading(false);
  }

  if (status === "loading") {
    return <p className="p-8 text-body">Loading attendees…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
          className="text-label text-primary underline"
        >
          ← Event settings
        </Link>
        <h1 className="mt-2 text-headline">Attendees</h1>
      </div>

      {live ? (
        <div className="flex flex-wrap gap-4 rounded-[var(--radius-md)] bg-surface-container px-4 py-3 text-body">
          <span>
            <strong>{live.registered}</strong> registered
          </span>
          <span>
            <strong>{live.checkedIn}</strong> checked in
          </span>
          <Link
            href={`/orgs/${params.orgSlug}/events/${params.eventId}/live`}
            className="text-primary underline"
          >
            Live dashboard
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-12">
          <a
            href={`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/attendees/export`}
            download
          >
            Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-12 flex-1"
        />
        <select
          className="flex h-12 rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="checked_in">Checked in</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}

      {attendees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-headline-sm">No attendees yet</p>
            <p className="mt-2 text-body text-muted-foreground">
              Attendees appear here after registrations are confirmed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{attendees.length} attendee{attendees.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-left text-label text-muted-foreground">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Ticket</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} className="border-b border-border">
                    <td className="py-3 pr-4">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="py-3 pr-4">{a.email}</td>
                    <td className="py-3 pr-4">{a.ticketType.name}</td>
                    <td className="py-3 pr-4 capitalize">{a.status.replace("_", " ")}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => openCrm(a.id)}
                        >
                          CRM
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => resendConfirmation(a.registration.id)}
                        >
                          Resend
                        </Button>
                        {a.status !== "cancelled" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-10 text-destructive"
                            onClick={() => cancelRegistration(a.registration.id)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {timelineAttendeeId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>CRM timeline</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setTimelineAttendeeId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <p className="text-body text-muted-foreground">Loading timeline…</p>
            ) : !timeline ? (
              <p className="text-body text-muted-foreground">No timeline data.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-body">
                  <strong>{timeline.attendee.name}</strong> · {timeline.attendee.email} ·{" "}
                  <span className="capitalize">{timeline.attendee.status.replace("_", " ")}</span>
                </p>
                <div>
                  <h3 className="text-title-sm font-semibold">Check-ins</h3>
                  {timeline.checkIns.length === 0 ? (
                    <p className="mt-1 text-body-sm text-muted-foreground">None yet</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-body-sm">
                      {timeline.checkIns.map((c) => (
                        <li key={c.id}>
                          {c.result} ·{" "}
                          {new Date(c.scannedAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                          {c.isManual ? " (manual)" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-title-sm font-semibold">Messages</h3>
                  {timeline.messages.length === 0 ? (
                    <p className="mt-1 text-body-sm text-muted-foreground">No messages logged</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-body-sm">
                      {timeline.messages.map((m) => (
                        <li key={m.id}>
                          {m.trigger} · {m.channel} · {m.status} ·{" "}
                          {new Date(m.createdAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

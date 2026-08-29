"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";

type Tab = "pass" | "schedule" | "venue";

export default function EventAppPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [tab, setTab] = useState<Tab>("pass");
  const [event, setEvent] = useState<{ title: string; venueName: string | null; city: string | null } | null>(null);
  const [ticket, setTicket] = useState<{ qrSvg: string; attendee: { firstName: string; lastName: string } } | null>(null);
  const [sessions, setSessions] = useState<{ id: string; title: string; startsAt: string | null; room: string | null }[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-event.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (token && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          type: "CACHE_TICKET",
          url: `/api/v1/tickets/${token}`,
        });
      });
    }
  }, [token]);

  useEffect(() => {
    fetch(`/api/v1/public/events/${params.slug}`)
      .then((r) => r.json())
      .then((data) => setEvent(data.event));
    fetch(`/api/v1/public/events/${params.slug}/sessions`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions ?? []));
  }, [params.slug]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/tickets/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.qrSvg) setTicket(data);
      });
  }, [token]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "pass", label: "My Pass" },
    { id: "schedule", label: "Schedule" },
    { id: "venue", label: "Venue" },
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-6">
        <h1 className="text-headline">{event?.title ?? "Event"}</h1>
        <nav className="mt-6 flex gap-2 border-b border-outline pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`min-h-12 flex-1 rounded-[var(--radius-sm)] text-body-lg font-medium ${tab === t.id ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "pass" && (
            <div>
              {ticket ? (
                <div
                  className="mx-auto max-w-[280px] [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
                />
              ) : (
                <p className="text-body">
                  Open your ticket link from your confirmation email, or{" "}
                  <Link href={`/e/${params.slug}/register`} className="text-primary underline">
                    register
                  </Link>
                  .
                </p>
              )}
              {ticket ? (
                <p className="mt-4 text-center text-title">
                  {ticket.attendee.firstName} {ticket.attendee.lastName}
                </p>
              ) : null}
            </div>
          )}
          {tab === "schedule" && (
            <ul className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-body text-muted-foreground">Schedule coming soon</p>
              ) : (
                sessions.map((s) => (
                  <li key={s.id} className="rounded-[var(--radius-sm)] border border-outline p-4">
                    <p className="text-body-lg font-medium">{s.title}</p>
                    {s.startsAt ? (
                      <p className="text-body-sm text-muted-foreground">
                        {new Date(s.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        {s.room ? ` · ${s.room}` : ""}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          )}
          {tab === "venue" && (
            <div className="text-body-lg">
              {event?.venueName ? <p className="font-medium">{event.venueName}</p> : null}
              {event?.city ? <p className="text-muted-foreground">{event.city}</p> : null}
              {!event?.venueName && !event?.city ? (
                <p className="text-muted-foreground">Venue details on the event page</p>
              ) : null}
              <Link href={`/e/${params.slug}`} className="mt-4 inline-block text-primary underline">
                Full event page
              </Link>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

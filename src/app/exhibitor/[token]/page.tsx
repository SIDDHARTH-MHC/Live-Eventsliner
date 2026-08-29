"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/shells/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ExhibitorData = {
  id: string;
  name: string;
  description: string | null;
  boothNumber: string | null;
  passQuota: number;
  passesUsed: number;
  event: { title: string; publicSlug: string | null };
  staff: { id: string; name: string; email: string; phone: string | null }[];
  leadCount: number;
  leads: {
    id: string;
    scannedAt: string;
    notes: string | null;
    attendee: { firstName: string; lastName: string; email: string; company: string | null } | null;
  }[];
};

export default function ExhibitorPortalPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<ExhibitorData | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    fetch(`/api/v1/exhibitor/${params.token}`)
      .then(async (r) => {
        const json = await r.json();
        if (r.ok) setData(json.exhibitor);
      });
  }

  useEffect(() => {
    load();
  }, [params.token]);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/v1/exhibitor/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ name: staffName, email: staffEmail }),
    });
    if (res.ok) {
      setStaffName("");
      setStaffEmail("");
      setMessage("Staff pass allocated");
      load();
    } else {
      const err = await res.json();
      setMessage(err.error?.message ?? "Failed to add staff");
    }
  }

  if (!data) {
    return (
      <PublicShell>
        <p className="p-8 text-body">Loading exhibitor portal…</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-label text-muted-foreground">{data.event.title}</p>
        <h1 className="text-display font-bold">{data.name}</h1>
        {data.boothNumber ? (
          <p className="mt-2 text-body-lg">Booth {data.boothNumber}</p>
        ) : null}
        {data.description ? (
          <p className="mt-4 text-body text-muted-foreground">{data.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-4 rounded-[var(--radius-md)] bg-surface-container px-4 py-3 text-body">
          <span>
            <strong>{data.leadCount}</strong> leads captured
          </span>
          <span>
            <strong>{data.passesUsed}</strong> / {data.passQuota} staff passes used
          </span>
        </div>

        <section className="mt-10">
          <h2 className="text-headline-sm font-semibold">Staff passes</h2>
          <form onSubmit={addStaff} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="min-h-12"
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="min-h-12"
              required
            />
            <Button type="submit" className="min-h-12">
              Add staff
            </Button>
          </form>
          {message ? <p className="mt-2 text-body-sm text-muted-foreground">{message}</p> : null}
          <ul className="mt-4 space-y-2">
            {data.staff.map((s) => (
              <li key={s.id} className="text-body">
                {s.name} · {s.email}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm font-semibold">Leads</h2>
            <Button asChild variant="outline" className="min-h-12">
              <a href={`/api/v1/exhibitors/${data.id}/leads?format=csv`} download>
                Export CSV
              </a>
            </Button>
          </div>
          {data.leads.length === 0 ? (
            <p className="mt-4 text-body text-muted-foreground">
              Scan attendee QR codes from the lead capture PWA to collect leads.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.leads.map((l) => (
                <li key={l.id} className="rounded-[var(--radius-sm)] border border-outline p-3 text-body">
                  {l.attendee ? (
                    <>
                      <strong>
                        {l.attendee.firstName} {l.attendee.lastName}
                      </strong>
                      {l.attendee.company ? ` · ${l.attendee.company}` : ""}
                      <br />
                      {l.attendee.email}
                    </>
                  ) : (
                    "Unknown attendee"
                  )}
                  <span className="block text-body-sm text-muted-foreground">
                    {new Date(l.scannedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.event.publicSlug ? (
          <Link
            href={`/e/${data.event.publicSlug}`}
            className="mt-8 inline-block text-primary underline"
          >
            View event page
          </Link>
        ) : null}
      </div>
    </PublicShell>
  );
}

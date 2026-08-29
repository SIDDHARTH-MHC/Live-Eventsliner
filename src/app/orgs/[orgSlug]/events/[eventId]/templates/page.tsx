"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Template = {
  id: string;
  trigger: string;
  channel: string;
  subject: string | null;
  bodyText: string | null;
  active: boolean;
};

const TRIGGERS = [
  "registration.confirmed",
  "payment.failed",
  "event.reminder",
  "post_event.survey",
  "staff.invited",
  "stream.reminder",
];

export default function TemplatesPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [trigger, setTrigger] = useState(TRIGGERS[0]!);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/templates`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, [params.orgSlug, params.eventId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/templates`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          trigger,
          subject,
          bodyHtml: `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`,
          bodyText,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to save template");
      return;
    }
    setMessage("Template saved");
    setSubject("");
    setBodyText("");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline">Message templates</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Email (and WhatsApp when consented) for registration, reminders, and stream links.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/orgs/${params.orgSlug}/events/${params.eventId}`}>Back to event</Link>
        </Button>
      </div>

      {loading ? <p className="text-body text-muted-foreground">Loading…</p> : null}
      {error ? (
        <p className="text-body text-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-body text-primary" role="status">
          {message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create / update email template</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label htmlFor="trigger">Trigger</Label>
              <select
                id="trigger"
                className="mt-2 flex min-h-12 w-full rounded-[var(--radius-sm)] border border-outline bg-surface px-3"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              >
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                className="mt-2"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="You're registered — {{eventTitle}}"
                required
              />
            </div>
            <div>
              <Label htmlFor="body">Body (text)</Label>
              <textarea
                id="body"
                className="mt-2 min-h-32 w-full rounded-[var(--radius-sm)] border border-outline bg-surface p-3 text-body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hi {{firstName}}, you're confirmed for {{eventTitle}}."
                required
              />
              <p className="mt-2 text-label text-muted-foreground">
                Variables: {"{{firstName}}"}, {"{{eventTitle}}"}, {"{{ticketUrl}}"}, {"{{eventDate}}"}
              </p>
            </div>
            <Button type="submit" size="lg">
              Save template
            </Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-title-md font-semibold">Active templates</h2>
        {templates.length === 0 ? (
          <p className="mt-3 text-body text-muted-foreground">
            Using built-in defaults until you save custom templates.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded-[var(--radius-sm)] border border-outline px-4 py-3"
              >
                <p className="text-body font-medium">
                  {t.trigger} · {t.channel}
                </p>
                <p className="text-body-sm text-muted-foreground">{t.subject}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

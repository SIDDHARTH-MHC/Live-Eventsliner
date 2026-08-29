"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Speaker = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
};

export default function SpeakersPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  function load() {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/speakers`)
      .then((r) => r.json())
      .then((data) => setSpeakers(data.speakers ?? []));
  }

  useEffect(() => {
    load();
  }, [params.orgSlug, params.eventId]);

  async function addSpeaker(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/speakers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ name, title, company, bio }),
    });
    setName("");
    setTitle("");
    setCompany("");
    setBio("");
    load();
  }

  async function removeSpeaker(speakerId: string) {
    await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/speakers?speakerId=${speakerId}`,
      { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } },
    );
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
        className="text-label text-primary underline"
      >
        ← Event settings
      </Link>
      <h1 className="text-headline">Speakers</h1>

      <form onSubmit={addSpeaker} className="space-y-4 rounded-[var(--radius-md)] border border-outline p-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-12 mt-1" required />
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-12 mt-1" />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="min-h-12 mt-1" />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 min-h-24 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 py-3 text-body"
          />
        </div>
        <Button type="submit" className="min-h-12">
          Add speaker
        </Button>
      </form>

      <ul className="space-y-3">
        {speakers.map((s) => (
          <li key={s.id} className="flex items-start justify-between rounded-[var(--radius-sm)] border border-outline p-4">
            <div>
              <p className="text-body-lg font-medium">{s.name}</p>
              {s.title || s.company ? (
                <p className="text-body-sm text-muted-foreground">
                  {[s.title, s.company].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {s.bio ? <p className="mt-2 text-body">{s.bio}</p> : null}
            </div>
            <Button variant="ghost" className="min-h-12 text-destructive" onClick={() => removeSpeaker(s.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewEventPage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch(`/api/v1/orgs/${params.orgSlug}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/orgs/${params.orgSlug}/events/${data.event.id}`);
    } else {
      setStatus("error");
      const data = await res.json();
      setMessage(data.error?.message ?? "Unable to create event");
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link href={`/orgs/${params.orgSlug}`} className="text-label text-primary underline">
          Back
        </Link>
        <h1 className="mt-4 text-headline">Create event</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Event title</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product workshop — Delhi"
                required
              />
            </div>
            {message ? <p className="text-body-sm text-destructive">{message}</p> : null}
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Creating…" : "Create draft event"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

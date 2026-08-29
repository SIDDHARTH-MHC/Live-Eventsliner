"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/shells/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/v1/orgs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ name, slug: slug || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/orgs/${data.org.slug}`);
      router.refresh();
    } else {
      setStatus("error");
      const data = await res.json();
      setMessage(data.error?.message ?? "Unable to create organization");
      setStatus("idle");
    }
  }

  return (
    <PageShell
      title="Create organization"
      description="You will be the owner. Defaults: India (IN), Asia/Kolkata."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Organization name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Delhi Design Collective"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug (optional)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="delhi-design"
            pattern="[a-z0-9-]+"
          />
          <p className="text-caption text-muted-foreground">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        {message ? (
          <p className="text-body-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </PageShell>
  );
}

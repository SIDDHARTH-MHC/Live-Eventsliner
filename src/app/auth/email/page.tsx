"use client";

import { useState } from "react";
import { PageShell } from "@/components/shells/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EmailSignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/v1/auth/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setStatus("sent");
      setMessage("Check your inbox — or the server console in development.");
    } else {
      setStatus("error");
      const data = await res.json();
      setMessage(data.error?.message ?? "Unable to send link");
    }
  }

  return (
    <PageShell title="Sign in with email" description="Magic link expires in 15 minutes.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={status === "error"}
            aria-describedby={message ? "email-error" : undefined}
          />
          {message ? (
            <p id="email-error" className="text-body-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={status === "loading" || status === "sent"}>
          {status === "loading" ? "Sending…" : status === "sent" ? "Link sent" : "Send magic link"}
        </Button>
      </form>
    </PageShell>
  );
}

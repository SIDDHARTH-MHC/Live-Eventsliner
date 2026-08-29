"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RazorpaySettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const [connected, setConnected] = useState(false);
  const [mockMode, setMockMode] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/orgs/${params.orgSlug}/settings/razorpay`)
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.razorpay?.connected ?? false);
        setMockMode(data.razorpay?.mockMode ?? true);
        setStatus("idle");
      });
  }, [params.orgSlug]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/v1/orgs/${params.orgSlug}/settings/razorpay`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        razorpayKeyId: keyId || null,
        razorpayKeySecret: keySecret || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setConnected(data.razorpay?.connected ?? false);
      setMessage("Razorpay settings saved");
      setKeySecret("");
    } else {
      setMessage(data.error?.message ?? "Save failed");
    }
    setStatus("idle");
  }

  if (status === "loading") {
    return <p className="p-8 text-body">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <Link href={`/orgs/${params.orgSlug}`} className="text-label text-primary underline">
          ← Organization
        </Link>
        <h1 className="mt-2 text-headline">Razorpay settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-body">
            Status:{" "}
            <strong>{connected ? "Connected" : mockMode ? "Mock mode (dev)" : "Not connected"}</strong>
          </p>
          {mockMode && !connected ? (
            <p className="rounded-[var(--radius-sm)] bg-primary-container p-4 text-body-sm text-on-primary-container">
              No Razorpay keys configured. Paid tickets use mock checkout in development. Set org
              keys or global RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env for test mode.
            </p>
          ) : null}
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyId">Key ID</Label>
              <Input
                id="keyId"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="rzp_test_…"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keySecret">Key secret</Label>
              <Input
                id="keySecret"
                type="password"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder="Enter new secret to update"
                autoComplete="new-password"
              />
            </div>
            {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={status === "saving"} className="min-h-12">
              {status === "saving" ? "Saving…" : "Save Razorpay keys"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shells/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EnterpriseSettings = {
  customSubdomain: string | null;
  ssoEnabled: boolean;
  ssoProvider: string | null;
  workosConfigured: boolean;
  ssoEnvEnabled: boolean;
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
};

export default function OrgSettingsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug;
  const [orgName, setOrgName] = useState(orgSlug);
  const [settings, setSettings] = useState<EnterpriseSettings | null>(null);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [subdomain, setSubdomain] = useState("");
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/orgs/${orgSlug}/settings/enterprise`).then((r) => r.json()),
      fetch(`/api/v1/orgs/${orgSlug}/api-keys`).then((r) => r.json()),
      fetch(`/api/v1/orgs/${orgSlug}/webhooks`).then((r) => r.json()),
      fetch(`/api/v1/me`).then((r) => r.json()).catch(() => ({})),
    ]).then(([ent, keyData, wh, me]) => {
      if (ent.settings) {
        setSettings(ent.settings);
        setSubdomain(ent.settings.customSubdomain ?? "");
        setSsoEnabled(ent.settings.ssoEnabled);
      }
      if (ent.error) setError(ent.error.message);
      setKeys(keyData.keys ?? []);
      setWebhooks(wh.webhooks ?? []);
      if (me?.user) setOrgName(orgSlug);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [orgSlug]);

  async function saveEnterprise(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch(`/api/v1/orgs/${orgSlug}/settings/enterprise`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({
        customSubdomain: subdomain.trim() || null,
        ssoEnabled,
        ssoProvider: ssoEnabled ? "workos" : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to save");
      return;
    }
    setSettings((s) => (s ? { ...s, ...data.settings } : data.settings));
    setMessage("Enterprise settings saved");
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    setNewKey(null);
    const res = await fetch(`/api/v1/orgs/${orgSlug}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({
        name: keyName || "Default",
        scopes: ["events:read", "attendees:read", "orders:read", "checkin:write"],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to create key");
      return;
    }
    setNewKey(data.key.key);
    setKeyName("");
    setMessage("API key created — copy it now; it won’t be shown again");
    load();
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/v1/orgs/${orgSlug}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({
        url: webhookUrl,
        events: ["registration.confirmed", "checkin.recorded", "payment.captured"],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.message ?? "Failed to create webhook");
      return;
    }
    setWebhookUrl("");
    setMessage(
      data.webhook?.secret
        ? `Webhook created. Signing secret: ${data.webhook.secret}`
        : "Webhook created",
    );
    load();
  }

  return (
    <AppShell orgName={orgName} orgSlug={orgSlug}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-headline">Organization settings</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Payments, SSO, custom subdomain, API keys, and outbound webhooks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/orgs/${orgSlug}/settings/razorpay`}>Razorpay</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/orgs/${orgSlug}/audit`}>Audit log</Link>
            </Button>
          </div>
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
            <CardTitle>Custom subdomain</CardTitle>
            <CardDescription>
              Point DNS CNAME to the Eventsliner host. Middleware resolves{" "}
              <code className="text-label">{`{subdomain || "your-org"}.eventsliner.live`}</code> to
              your next public event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveEnterprise} className="space-y-4">
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                    placeholder="acme"
                    autoComplete="off"
                    className="max-w-xs"
                  />
                  <span className="text-body text-muted-foreground">.eventsliner.live</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="sso"
                  type="checkbox"
                  className="h-5 w-5"
                  checked={ssoEnabled}
                  onChange={(e) => setSsoEnabled(e.target.checked)}
                />
                <Label htmlFor="sso">Enable WorkOS SSO for this organization</Label>
              </div>
              {settings && !settings.workosConfigured ? (
                <p className="text-body-sm text-muted-foreground">
                  WorkOS keys unset — mock SSO provider is used when SSO_ENABLED is not true. Set
                  WORKOS_API_KEY, WORKOS_CLIENT_ID, and SSO_ENABLED=true in production.
                </p>
              ) : null}
              <Button type="submit" size="lg">
                Save enterprise settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              Scoped REST access for events, attendees, and partner check-in. Keys are hashed at
              rest (SHA-256).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createApiKey} className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Key name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                aria-label="API key name"
              />
              <Button type="submit">Create key</Button>
            </form>
            {newKey ? (
              <p className="break-all rounded-[var(--radius-sm)] bg-surface-container p-3 text-body-sm">
                {newKey}
              </p>
            ) : null}
            {keys.length === 0 ? (
              <p className="text-body text-muted-foreground">No API keys yet.</p>
            ) : (
              <ul className="space-y-2">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex min-h-12 items-center justify-between rounded-[var(--radius-sm)] border border-outline px-3"
                  >
                    <span className="text-body">
                      {k.name} · <code>{k.keyPrefix}…</code>
                    </span>
                    <span className="text-label text-muted-foreground">
                      {k.scopes.join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outbound webhooks</CardTitle>
            <CardDescription>
              HMAC-signed delivery on registration, check-in, and payment events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createWebhook} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="url"
                placeholder="https://example.com/hooks/eventsliner"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
                aria-label="Webhook URL"
              />
              <Button type="submit">Add webhook</Button>
            </form>
            {webhooks.length === 0 ? (
              <p className="text-body text-muted-foreground">No webhooks configured.</p>
            ) : (
              <ul className="space-y-2">
                {webhooks.map((w) => (
                  <li
                    key={w.id}
                    className="rounded-[var(--radius-sm)] border border-outline px-3 py-3 text-body-sm"
                  >
                    <p className="break-all">{w.url}</p>
                    <p className="mt-1 text-muted-foreground">{w.events.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

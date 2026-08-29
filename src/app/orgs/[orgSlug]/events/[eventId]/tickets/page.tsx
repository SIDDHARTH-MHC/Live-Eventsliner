"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/components/registration/registration-form-renderer";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  quantity: number | null;
  soldCount: number;
  mode: string;
  isActive: boolean;
};

export default function TicketTypesPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [message, setMessage] = useState("");
  const [newTicket, setNewTicket] = useState({
    name: "",
    description: "",
    priceCents: 0,
    quantity: "",
    mode: "open_free" as "open_free" | "open_paid" | "rsvp",
  });

  function load() {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/ticket-types`)
      .then((r) => r.json())
      .then((data) => {
        setTicketTypes(data.ticketTypes ?? []);
        setStatus("idle");
      });
  }

  useEffect(() => {
    load();
  }, [params.orgSlug, params.eventId]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const priceCents =
      newTicket.mode === "open_paid" ? Math.round(parseFloat(String(newTicket.priceCents)) * 100) || 0 : 0;

    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/ticket-types`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: newTicket.name,
          description: newTicket.description || undefined,
          priceCents,
          quantity: newTicket.quantity ? parseInt(newTicket.quantity, 10) : null,
          mode: newTicket.mode,
        }),
      },
    );

    if (res.ok) {
      setNewTicket({ name: "", description: "", priceCents: 0, quantity: "", mode: "open_free" });
      setMessage("Ticket created");
      load();
    } else {
      const data = await res.json();
      setMessage(data.error?.message ?? "Failed to create ticket");
    }
    setStatus("idle");
  }

  async function toggleActive(ticket: TicketType) {
    await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/ticket-types/${ticket.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ isActive: !ticket.isActive }),
      },
    );
    load();
  }

  if (status === "loading") {
    return <p className="p-8 text-body">Loading tickets…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
          className="text-label text-primary underline"
        >
          ← Event settings
        </Link>
        <h1 className="mt-2 text-headline">Ticket types</h1>
      </div>

      {ticketTypes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-body text-muted-foreground">
            No tickets yet. Add at least one before publishing.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {ticketTypes.map((t) => (
            <li
              key={t.id}
              className="flex min-h-12 items-center justify-between rounded-[var(--radius-md)] border border-border p-4"
            >
              <div>
                <p className="text-title-md">{t.name}</p>
                <p className="text-body-sm text-muted-foreground">
                  {t.priceCents > 0 ? formatPrice(t.priceCents) : t.mode === "rsvp" ? "RSVP" : "Free"}
                  {t.quantity !== null
                    ? ` · ${t.soldCount}/${t.quantity} sold`
                    : ` · ${t.soldCount} sold`}
                  {!t.isActive ? " · Inactive" : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleActive(t)}>
                {t.isActive ? "Deactivate" : "Activate"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add ticket type</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newTicket.name}
                onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })}
                placeholder="General admission"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-12 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
                value={newTicket.mode}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    mode: e.target.value as "open_free" | "open_paid" | "rsvp",
                  })
                }
              >
                <option value="open_free">Free</option>
                <option value="open_paid">Paid</option>
                <option value="rsvp">RSVP (yes/no)</option>
              </select>
            </div>
            {newTicket.mode === "open_paid" ? (
              <div className="space-y-2">
                <Label htmlFor="price">Price (INR)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  step="1"
                  value={newTicket.priceCents || ""}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, priceCents: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="quantity">Capacity (blank = unlimited)</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newTicket.quantity}
                onChange={(e) => setNewTicket({ ...newTicket, quantity: e.target.value })}
              />
            </div>
            {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" disabled={status === "saving"} className="min-h-12">
              {status === "saving" ? "Creating…" : "Add ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

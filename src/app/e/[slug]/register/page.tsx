"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RegistrationFormRenderer,
  formatPrice,
} from "@/components/registration/registration-form-renderer";
import type { FormSchema } from "@/lib/registration/form-schema";
import { PublicShell } from "@/components/shells/public-shell";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  mode: string;
  available: number | null;
  soldOut: boolean;
  salesOpen: boolean;
};

type EventMeta = {
  id: string;
  title: string;
  publicSlug: string;
  currency: string;
};

export default function RegisterPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventMeta | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [rsvpResponse, setRsvpResponse] = useState<"yes" | "no">("yes");
  const [status, setStatus] = useState<"loading" | "idle" | "submitting" | "error">("loading");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/public/events/${params.slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error.message);
          return;
        }
        setEvent(data.event);
        setTicketTypes(data.ticketTypes);
        setFormSchema(data.formSchema);
        const open = data.ticketTypes.filter((t: TicketType) => t.salesOpen && !t.soldOut);
        if (open.length === 1) setSelectedTicketId(open[0].id);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to load registration");
      });
  }, [params.slug]);

  const selectedTicket = ticketTypes.find((t) => t.id === selectedTicketId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicketId) {
      setMessage("Please select a ticket");
      return;
    }
    setStatus("submitting");
    setErrors({});
    setMessage("");

    const res = await fetch(`/api/v1/public/events/${params.slug}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketTypeId: selectedTicketId,
        answers,
        rsvpResponse: selectedTicket?.mode === "rsvp" ? rsvpResponse : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatus("idle");
      if (data.error?.details?.fields) {
        setErrors(data.error.details.fields);
      }
      setMessage(data.error?.message ?? "Registration failed");
      return;
    }

    const regId = data.registration.id;
    if (data.registration.requiresPayment) {
      router.push(`/e/${params.slug}/register/${regId}/checkout`);
    } else if (data.registration.status === "confirmed") {
      router.push(`/e/${params.slug}/register/${regId}/confirmed`);
    } else {
      router.push(`/e/${params.slug}/register/${regId}/confirmed`);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-body text-muted-foreground">Loading registration…</p>
      </div>
    );
  }

  if (status === "error" && !event) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-headline">Registration unavailable</h1>
        <p className="mt-2 text-body text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link href={`/e/${params.slug}`}>Back to event</Link>
        </Button>
      </div>
    );
  }

  const openTickets = ticketTypes.filter((t) => t.salesOpen);
  const allSoldOut = openTickets.length > 0 && openTickets.every((t) => t.soldOut);

  return (
    <PublicShell eventTitle={event?.title ?? "Register"} stickyCta={null}>
      <div className="mx-auto max-w-lg space-y-6 pb-8">
        <div>
          <Link href={`/e/${params.slug}`} className="text-label text-primary underline">
            ← Back to event
          </Link>
          <h1 className="mt-2 text-headline">Register</h1>
          <p className="text-body text-muted-foreground">{event?.title}</p>
        </div>

        {ticketTypes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-body">Registration is not open yet.</p>
            </CardContent>
          </Card>
        ) : allSoldOut ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-headline-sm">Sold out</p>
              <p className="mt-2 text-body text-muted-foreground">
                All tickets for this event have been claimed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticketTypes.map((ticket) => {
                  const disabled = !ticket.salesOpen || ticket.soldOut;
                  return (
                    <label
                      key={ticket.id}
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 ${
                        selectedTicketId === ticket.id
                          ? "border-primary bg-primary-container/30"
                          : "border-border"
                      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="ticket"
                        className="mt-1 h-5 w-5 accent-primary"
                        checked={selectedTicketId === ticket.id}
                        onChange={() => setSelectedTicketId(ticket.id)}
                        disabled={disabled}
                      />
                      <div className="flex-1">
                        <p className="text-title-md">{ticket.name}</p>
                        {ticket.description ? (
                          <p className="text-body-sm text-muted-foreground">{ticket.description}</p>
                        ) : null}
                        <p className="mt-1 text-body">
                          {ticket.priceCents > 0
                            ? formatPrice(ticket.priceCents, ticket.currency)
                            : ticket.mode === "rsvp"
                              ? "RSVP"
                              : "Free"}
                          {ticket.soldOut ? " · Sold out" : ""}
                          {!ticket.salesOpen ? " · Sales closed" : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            {selectedTicket?.mode === "rsvp" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Will you attend?</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button
                    type="button"
                    variant={rsvpResponse === "yes" ? "default" : "outline"}
                    className="min-h-12 flex-1"
                    onClick={() => setRsvpResponse("yes")}
                  >
                    Yes, I&apos;ll be there
                  </Button>
                  <Button
                    type="button"
                    variant={rsvpResponse === "no" ? "default" : "outline"}
                    className="min-h-12 flex-1"
                    onClick={() => setRsvpResponse("no")}
                  >
                    No, can&apos;t make it
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {formSchema && (selectedTicket?.mode !== "rsvp" || rsvpResponse === "yes") ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your details</CardTitle>
                </CardHeader>
                <CardContent>
                  <RegistrationFormRenderer
                    schema={formSchema}
                    values={answers}
                    onChange={(id, v) => setAnswers((prev) => ({ ...prev, [id]: v }))}
                    errors={errors}
                    disabled={status === "submitting"}
                  />
                </CardContent>
              </Card>
            ) : null}

            {message ? <p className="text-body-sm text-destructive">{message}</p> : null}

            <Button
              type="submit"
              size="lg"
              className="w-full min-h-12"
              disabled={status === "submitting" || !selectedTicketId}
            >
              {status === "submitting"
                ? "Submitting…"
                : selectedTicket?.priceCents
                  ? "Continue to payment"
                  : selectedTicket?.mode === "rsvp" && rsvpResponse === "no"
                    ? "Submit RSVP"
                    : "Complete registration"}
            </Button>
          </form>
        )}
      </div>
    </PublicShell>
  );
}

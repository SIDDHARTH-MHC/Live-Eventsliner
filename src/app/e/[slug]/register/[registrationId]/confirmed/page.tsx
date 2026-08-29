"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicShell } from "@/components/shells/public-shell";

type RegistrationStatus = {
  id: string;
  status: string;
  confirmedAt: string | null;
  ticketType: { name: string };
  event: { title: string; publicSlug: string | null };
  attendee: { firstName: string; lastName: string; email: string } | null;
};

export default function ConfirmedPage() {
  const params = useParams<{ slug: string; registrationId: string }>();
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch(`/api/v1/registrations/${params.registrationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.registration) {
          setRegistration(data.registration);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [params.registrationId]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-body text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isConfirmed = registration?.status === "confirmed";
  const isCancelled = registration?.status === "cancelled";

  return (
    <PublicShell eventTitle={registration?.event.title ?? "Registration"} stickyCta={null}>
      <div className="mx-auto max-w-lg space-y-6 p-8">
        <Card>
          <CardContent className="py-8 text-center">
            {isConfirmed ? (
              <>
                <p className="text-display-sm text-primary">You&apos;re registered!</p>
                <p className="mt-4 text-body">
                  Thanks{registration?.attendee ? `, ${registration.attendee.firstName}` : ""}.
                  A confirmation email has been sent to{" "}
                  <strong>{registration?.attendee?.email}</strong>.
                </p>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  Ticket: {registration?.ticketType.name}
                </p>
              </>
            ) : isCancelled ? (
              <>
                <p className="text-headline">RSVP recorded</p>
                <p className="mt-2 text-body text-muted-foreground">
                  Thanks for letting us know you can&apos;t make it.
                </p>
              </>
            ) : (
              <>
                <p className="text-headline">Registration {registration?.status}</p>
                <p className="mt-2 text-body text-muted-foreground">
                  Status: {registration?.status}
                </p>
              </>
            )}
            <Button asChild className="mt-8 min-h-12 w-full">
              <Link href={`/e/${params.slug}`}>Back to event page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}

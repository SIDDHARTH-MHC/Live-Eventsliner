"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicShell } from "@/components/shells/public-shell";

type RegistrationStatus = {
  id: string;
  status: string;
  confirmedAt: string | null;
  event: { title: string; publicSlug: string | null };
  attendee: { firstName: string; lastName: string; email: string } | null;
};

export default function PendingPaymentPage() {
  const params = useParams<{ slug: string; registrationId: string }>();
  const router = useRouter();
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const maxAttempts = 40;

    async function poll() {
      if (cancelled) return;
      const res = await fetch(`/api/v1/registrations/${params.registrationId}`);
      const data = await res.json();
      if (data.registration) {
        setRegistration(data.registration);
        if (data.registration.status === "confirmed") {
          router.replace(`/e/${params.slug}/register/${params.registrationId}/confirmed`);
          return;
        }
        if (data.registration.status === "expired" || data.registration.status === "cancelled") {
          setTimedOut(true);
          return;
        }
      }
      setAttempts((a) => a + 1);
      if (attempts >= maxAttempts) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, 3000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [params.registrationId, params.slug, router, attempts]);

  return (
    <PublicShell eventTitle={registration?.event.title ?? "Confirming payment"} stickyCta={null}>
      <div className="mx-auto max-w-lg space-y-6 p-8 text-center">
        {timedOut ? (
          <Card>
            <CardContent className="py-8">
              <h1 className="text-headline">Still processing</h1>
              <p className="mt-2 text-body text-muted-foreground">
                {registration?.status === "expired"
                  ? "Your reservation expired. Please register again."
                  : "We are confirming your payment. If you were charged, we will email you shortly."}
              </p>
              <Button asChild className="mt-6 min-h-12">
                <Link href={`/e/${params.slug}`}>Back to event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div
              className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
              role="status"
              aria-label="Confirming payment"
            />
            <h1 className="text-headline">Confirming your payment</h1>
            <p className="text-body text-muted-foreground">
              Please wait — do not close this page. This usually takes a few seconds.
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/components/registration/registration-form-renderer";
import { PublicShell } from "@/components/shells/public-shell";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CheckoutData = {
  orderId: string;
  providerOrderId: string;
  amountCents: number;
  currency: string;
  keyId: string;
  mock: boolean;
  registrationId: string;
  eventTitle: string;
  buyerName: string | null;
  buyerEmail: string;
  buyerPhone: string | null;
};

export default function CheckoutPage() {
  const params = useParams<{ slug: string; registrationId: string }>();
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "paying" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/registrations/${params.registrationId}/checkout`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error.message);
          return;
        }
        setCheckout(data.checkout);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to start checkout");
      });
  }, [params.registrationId]);

  async function payWithMock() {
    setStatus("paying");
    const res = await fetch(`/api/v1/registrations/${params.registrationId}/checkout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mockComplete: true }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/e/${params.slug}/register/${params.registrationId}/pending`);
    } else {
      setStatus("idle");
      setMessage(data.error?.message ?? "Payment failed");
    }
  }

  function payWithRazorpay() {
    if (!checkout || !window.Razorpay) {
      setMessage("Payment system not loaded. Please refresh.");
      return;
    }
    setStatus("paying");
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      amount: checkout.amountCents,
      currency: checkout.currency,
      name: "Eventsliner",
      description: checkout.eventTitle,
      order_id: checkout.providerOrderId,
      prefill: {
        name: checkout.buyerName ?? undefined,
        email: checkout.buyerEmail,
        contact: checkout.buyerPhone ?? undefined,
      },
      handler: () => {
        router.push(`/e/${params.slug}/register/${params.registrationId}/pending`);
      },
      modal: {
        ondismiss: () => setStatus("idle"),
      },
    });
    rzp.open();
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-body text-muted-foreground">Preparing checkout…</p>
      </div>
    );
  }

  if (status === "error" || !checkout) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-headline">Checkout unavailable</h1>
        <p className="mt-2 text-body text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link href={`/e/${params.slug}/register`}>Try again</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {!checkout.mock ? (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      ) : null}
      <PublicShell eventTitle={checkout.eventTitle} stickyCta={null}>
        <div className="mx-auto max-w-lg space-y-6 pb-8">
          <div>
            <Link
              href={`/e/${params.slug}/register`}
              className="text-label text-primary underline"
            >
              ← Back
            </Link>
            <h1 className="mt-2 text-headline">Payment</h1>
            <p className="text-body text-muted-foreground">{checkout.eventTitle}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-display-sm">
                {formatPrice(checkout.amountCents, checkout.currency)}
              </p>
              <p className="text-body-sm text-muted-foreground">
                Prices include GST where applicable. Your spot is held for 15 minutes.
              </p>
              {checkout.mock ? (
                <div className="rounded-[var(--radius-sm)] bg-primary-container p-4 text-body-sm text-on-primary-container">
                  Dev mode: Razorpay keys not configured. Use the mock pay button below.
                </div>
              ) : null}
              {message ? <p className="text-body-sm text-destructive">{message}</p> : null}
              <Button
                size="lg"
                className="w-full min-h-12"
                disabled={status === "paying"}
                onClick={checkout.mock ? payWithMock : payWithRazorpay}
              >
                {status === "paying"
                  ? "Processing…"
                  : checkout.mock
                    ? "Pay with mock UPI (dev)"
                    : "Pay with Razorpay"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicShell>
    </>
  );
}

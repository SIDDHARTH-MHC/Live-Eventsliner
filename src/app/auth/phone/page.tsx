"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/shells/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PhoneSignInPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/v1/auth/phone/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ phone }),
    });
    setStatus("idle");
    if (res.ok) {
      setStep("otp");
      setMessage("Enter the 6-digit code (check server console in dev).");
    } else {
      setStatus("error");
      const data = await res.json();
      setMessage(data.error?.message ?? "Unable to send OTP");
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/v1/auth/phone/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ phone, code }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setStatus("error");
      const data = await res.json();
      setMessage(data.error?.message ?? "Invalid code");
      setStatus("idle");
    }
  }

  return (
    <PageShell title="Sign in with phone" description="Indian mobile numbers (+91).">
      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              aria-invalid={status === "error"}
            />
          </div>
          {message ? (
            <p className="text-body-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Verifying…" : "Verify and sign in"}
          </Button>
        </form>
      )}
    </PageShell>
  );
}

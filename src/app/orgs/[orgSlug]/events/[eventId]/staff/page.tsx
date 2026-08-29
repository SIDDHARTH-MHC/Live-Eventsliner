"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffMember = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  acceptedAt: string | null;
};

export default function StaffPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/staff`)
      .then((r) => r.json())
      .then((data) => setStaff(data.staff ?? []));
  }

  useEffect(() => {
    load();
  }, [params.orgSlug, params.eventId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ phone, name: name || undefined, role: "checkin" }),
    });
    if (res.ok) {
      setMessage("Staff invited — they can sign in with phone OTP");
      setPhone("");
      setName("");
      load();
    }
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
        <h1 className="mt-2 text-headline">Check-in staff</h1>
        <p className="text-body text-muted-foreground">
          Invite staff by phone. They sign in with OTP to access the check-in scanner.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (India)</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="min-h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-12"
              />
            </div>
            {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
            <Button type="submit" className="min-h-12">
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{staff.length} staff member{staff.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-body text-muted-foreground">No staff invited yet</p>
          ) : (
            <ul className="space-y-3">
              {staff.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-border py-2 text-body">
                  <div>
                    <p className="font-medium">{s.name ?? s.phone}</p>
                    <p className="text-body-sm text-muted-foreground">{s.phone}</p>
                  </div>
                  <span className="text-body-sm capitalize">
                    {s.acceptedAt ? s.role : "Pending OTP"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

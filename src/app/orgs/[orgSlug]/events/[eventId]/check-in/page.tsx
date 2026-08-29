"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckInShell } from "@/components/shells/check-in-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ScanResult = {
  result: string;
  message: string;
  attendee?: { firstName: string; lastName: string; ticketType: string };
  checkedInAt?: string;
};

type SearchResult = {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  status: string;
};

function getStationId(eventId: string): string {
  const key = `el-station-${eventId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function CheckInPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const router = useRouter();
  const [eventTitle, setEventTitle] = useState("Event");
  const [authChecked, setAuthChecked] = useState(false);
  const [mode, setMode] = useState<"scan" | "search">("scan");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [manualInput, setManualInput] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    fetch("/api/v1/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push(`/auth/phone?redirect=/orgs/${params.orgSlug}/events/${params.eventId}/check-in`);
          return;
        }
        setAuthChecked(true);
      });
  }, [params.orgSlug, params.eventId, router]);

  useEffect(() => {
    if (!authChecked) return;
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.event?.title) setEventTitle(data.event.title);
      });
  }, [authChecked, params.orgSlug, params.eventId]);

  const submitCheckIn = useCallback(
    async (payload: {
      rawPayload?: string;
      attendeeId?: string;
      isManual?: boolean;
    }) => {
      if (processingRef.current) return;
      processingRef.current = true;

      const stationId = getStationId(params.eventId);
      const idempotencyKey = crypto.randomUUID();

      try {
        const res = await fetch(`/api/v1/events/${params.eventId}/check-ins`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ ...payload, stationId }),
        });
        const result: ScanResult = await res.json();
        setLastResult(result);
        setHistory((h) => [result, ...h].slice(0, 5));

        if (navigator.vibrate) {
          navigator.vibrate(result.result === "ok" ? [100, 50, 100] : [300]);
        }
      } finally {
        setTimeout(() => {
          processingRef.current = false;
        }, 800);
      }
    },
    [params.eventId],
  );

  useEffect(() => {
    if (!authChecked || mode !== "scan") return;

    let cancelled = false;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          (decoded) => {
            if (!cancelled) submitCheckIn({ rawPayload: decoded });
          },
          () => undefined,
        );
      } catch {
        // Camera unavailable — manual input fallback
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [authChecked, mode, submitCheckIn]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(
        `/api/v1/events/${params.eventId}/check-ins/search?q=${encodeURIComponent(searchQuery)}`,
      )
        .then((r) => r.json())
        .then((data) => setSearchResults(data.results ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, params.eventId]);

  if (!authChecked) {
    return <p className="p-8 text-body-lg">Checking access…</p>;
  }

  const resultColor =
    lastResult?.result === "ok"
      ? "bg-green-600 text-white"
      : lastResult?.result === "already"
        ? "bg-amber-500 text-black"
        : lastResult
          ? "bg-red-600 text-white"
          : "bg-surface-container text-foreground";

  return (
    <CheckInShell eventName={eventTitle} stationName="Gate">
      <div
        className={`mb-6 rounded-[var(--radius-md)] px-6 py-8 text-center transition-colors ${resultColor}`}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
      >
        {lastResult ? (
          <>
            <p className="text-display font-bold">
              {lastResult.result === "ok"
                ? "✓"
                : lastResult.result === "already"
                  ? "↻"
                  : "✗"}
            </p>
            <p className="mt-2 text-headline font-semibold">
              {lastResult.attendee
                ? `${lastResult.attendee.firstName} ${lastResult.attendee.lastName}`
                : lastResult.message}
            </p>
            {lastResult.attendee ? (
              <p className="mt-1 text-body-lg">{lastResult.message}</p>
            ) : null}
          </>
        ) : (
          <p className="text-body-lg">Ready to scan</p>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={mode === "scan" ? "default" : "outline"}
          className="min-h-12 flex-1 text-body-lg"
          onClick={() => setMode("scan")}
        >
          Scan
        </Button>
        <Button
          variant={mode === "search" ? "default" : "outline"}
          className="min-h-12 flex-1 text-body-lg"
          onClick={() => setMode("search")}
        >
          Search
        </Button>
      </div>

      {mode === "scan" ? (
        <div className="space-y-4">
          <div
            id="qr-reader"
            className="overflow-hidden rounded-[var(--radius-md)] border border-outline"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) submitCheckIn({ rawPayload: manualInput.trim() });
            }}
          >
            <label htmlFor="manual-qr" className="text-label">
              Manual code / wedge scanner
            </label>
            <Input
              id="manual-qr"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="mt-2 min-h-12 text-body-lg"
              placeholder="Paste or scan QR payload"
              autoComplete="off"
            />
            <Button type="submit" className="mt-3 min-h-12 w-full text-body-lg">
              Check in
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="min-h-12 text-body-lg"
            inputMode="search"
            autoComplete="off"
          />
          <ul className="space-y-2">
            {searchResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex min-h-14 w-full flex-col rounded-[var(--radius-sm)] border border-outline px-4 py-3 text-left active:bg-surface-container"
                  onClick={() => submitCheckIn({ attendeeId: r.id, isManual: true })}
                >
                  <span className="text-body-lg font-medium">{r.name}</span>
                  <span className="text-body-sm text-muted-foreground">
                    {r.ticketType} · {r.status.replace("_", " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 ? (
        <div className="mt-8">
          <p className="text-label text-muted-foreground">Recent scans</p>
          <ul className="mt-2 space-y-1 text-body-sm">
            {history.map((h, i) => (
              <li key={i}>
                {h.attendee
                  ? `${h.attendee.firstName} ${h.attendee.lastName} — ${h.result}`
                  : h.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/orgs/${params.orgSlug}/events/${params.eventId}/live`}
        className="mt-8 inline-flex min-h-12 items-center text-body text-primary underline"
      >
        Live dashboard →
      </Link>
    </CheckInShell>
  );
}

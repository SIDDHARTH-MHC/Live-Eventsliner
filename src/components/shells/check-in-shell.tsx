import type { ReactNode } from "react";

type CheckInShellProps = {
  eventName: string;
  stationName?: string;
  children: ReactNode;
};

/** Stub shell for Phase 3 check-in — separate from dashboard chrome. */
export function CheckInShell({ eventName, stationName, children }: CheckInShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-black safe-top safe-bottom">
      <header className="border-b border-black/10 px-4 py-4">
        <p className="text-body-lg font-semibold">{eventName}</p>
        {stationName ? (
          <p className="text-body text-black/70">Station: {stationName}</p>
        ) : null}
      </header>
      <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
    </div>
  );
}

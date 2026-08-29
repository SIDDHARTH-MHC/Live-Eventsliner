import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

type PublicShellProps = {
  eventTitle?: string;
  organizerName?: string;
  primaryColor?: string;
  children: ReactNode;
  stickyCta?: ReactNode;
};

export function PublicShell({
  eventTitle = "",
  organizerName,
  primaryColor,
  children,
  stickyCta,
}: PublicShellProps) {
  const style = primaryColor
    ? ({
        "--organizer-primary": primaryColor,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="flex min-h-dvh flex-col bg-surface safe-top"
      data-organizer-primary
      style={style}
    >
      <header className="border-b border-border px-4 py-4">
        <p className="text-label-sm text-muted-foreground">{organizerName ?? "Event"}</p>
        <h1 className="text-title-lg line-clamp-2">{eventTitle}</h1>
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-6 pb-28">{children}</main>
      {stickyCta ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur-sm safe-bottom">
          <div className="mx-auto max-w-[720px]">{stickyCta}</div>
        </div>
      ) : null}
      <footer className="border-t border-border px-4 py-6 text-center">
        <p className="text-caption text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="underline underline-offset-2">
            Eventsliner
          </Link>
        </p>
      </footer>
    </div>
  );
}

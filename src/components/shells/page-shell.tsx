import type { ReactNode } from "react";
import { EventslinerLiveWordmark } from "@/components/brand/eventsliner-live-wordmark";

type PageShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PageShell({ title, description, children, footer }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface safe-top safe-bottom">
      <header className="border-b border-border px-4 py-4 md:px-6">
        <EventslinerLiveWordmark size="md" href="/" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 md:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-headline">{title}</h1>
          {description ? (
            <p className="text-body text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
      {footer ? (
        <footer className="border-t border-border px-4 py-4 text-center text-caption text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}

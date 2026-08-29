"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, LayoutDashboard, LogOut, Settings } from "lucide-react";

type AppShellProps = {
  orgName: string;
  orgSlug: string;
  children: ReactNode;
};

const navItems = [
  { href: "", label: "Home", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ orgName, orgSlug, children }: AppShellProps) {
  const pathname = usePathname();
  const base = `/orgs/${orgSlug}`;

  return (
    <div className="flex min-h-dvh flex-col bg-surface md:flex-row safe-top safe-bottom">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-container md:block">
        <div className="border-b border-border px-6 py-5">
          <p className="text-label-sm text-muted-foreground">Organization</p>
          <p className="text-title-md truncate">{orgName}</p>
        </div>
        <nav className="flex flex-col gap-1 p-4" aria-label="Organizer navigation">
          {navItems.map((item) => {
            const href = `${base}${item.href}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-4 text-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-foreground hover:bg-surface-container-high",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <form action="/api/v1/auth/logout" method="post">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-md)] px-4 text-label text-muted-foreground hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 md:hidden">
          <div>
            <p className="text-label-sm text-muted-foreground">Organization</p>
            <p className="text-title-sm truncate">{orgName}</p>
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

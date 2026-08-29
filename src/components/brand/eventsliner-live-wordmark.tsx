import Link from "next/link";
import { cn } from "@/lib/utils";
import { PRODUCT_NAME } from "@/lib/brand";

type WordmarkSize = "sm" | "md" | "lg" | "hero";

type EventslinerLiveWordmarkProps = {
  size?: WordmarkSize;
  className?: string;
  /** When set, wraps the mark in a link (default `/`). Pass `null` to skip linking. */
  href?: string | null;
  showMark?: boolean;
  /** Accessible label; defaults to product name. */
  label?: string;
};

const markSize: Record<WordmarkSize, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
  hero: "h-11 w-11 sm:h-12 sm:w-12",
};

const textSize: Record<WordmarkSize, string> = {
  sm: "text-[0.9375rem] leading-none tracking-tight",
  md: "text-[1.125rem] leading-none tracking-tight",
  lg: "text-[1.375rem] leading-none tracking-tight",
  hero: "text-[1.75rem] sm:text-[2.25rem] leading-none tracking-tight",
};

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <circle cx="16" cy="16" r="3.5" fill="var(--on-primary)" />
      <path
        d="M9.5 16a6.5 6.5 0 0 1 6.5-6.5"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M22.5 16a6.5 6.5 0 0 1-6.5 6.5"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Eventsliner Live wordmark — pulse mark + “Eventsliner” + emphasized “Live”.
 * Mark is SVG; type uses the product Inter stack for hierarchy.
 */
export function EventslinerLiveWordmark({
  size = "md",
  className,
  href = "/",
  showMark = true,
  label = PRODUCT_NAME,
}: EventslinerLiveWordmarkProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-on-surface",
        textSize[size],
        className,
      )}
    >
      {showMark ? <BrandMark className={markSize[size]} /> : null}
      <span className="inline-flex items-baseline gap-[0.28em]">
        <span className="font-medium">Eventsliner</span>
        <span className="font-bold text-primary">Live</span>
      </span>
    </span>
  );

  if (href === null) {
    return (
      <span className="inline-flex" role="img" aria-label={label}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none"
      aria-label={label}
    >
      {content}
    </Link>
  );
}

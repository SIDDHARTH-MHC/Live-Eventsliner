import type { RegistrationMode, RegistrationStatus } from "@prisma/client";

export type TransitionContext = {
  mode: RegistrationMode;
  priceCents: number;
  rsvpResponse?: "yes" | "no";
};

const TERMINAL: RegistrationStatus[] = ["confirmed", "rejected", "cancelled", "expired"];

export function isTerminal(status: RegistrationStatus): boolean {
  return TERMINAL.includes(status);
}

export function getInitialStatus(ctx: TransitionContext): RegistrationStatus {
  if (ctx.mode === "rsvp") {
    return ctx.rsvpResponse === "no" ? "cancelled" : "started";
  }
  return "started";
}

export function onSubmit(ctx: TransitionContext): RegistrationStatus {
  if (ctx.mode === "rsvp" && ctx.rsvpResponse === "no") {
    return "cancelled";
  }

  if (ctx.priceCents > 0 && ctx.mode === "open_paid") {
    return "pending_payment";
  }

  return "confirmed";
}

export function requiresPayment(ctx: TransitionContext): boolean {
  return ctx.priceCents > 0 && ctx.mode === "open_paid";
}

export function canTransition(
  from: RegistrationStatus,
  to: RegistrationStatus,
): boolean {
  if (isTerminal(from)) return false;

  const allowed: Record<RegistrationStatus, RegistrationStatus[]> = {
    started: ["pending_payment", "confirmed", "cancelled", "expired", "waitlisted"],
    pending_payment: ["confirmed", "cancelled", "expired"],
    pending_approval: ["pending_payment", "confirmed", "rejected", "cancelled"],
    waitlisted: ["pending_payment", "confirmed", "cancelled", "expired"],
    confirmed: ["cancelled"],
    rejected: [],
    cancelled: [],
    expired: [],
  };

  return allowed[from]?.includes(to) ?? false;
}

export function transition(
  from: RegistrationStatus,
  to: RegistrationStatus,
): RegistrationStatus {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_TRANSITION:${from}->${to}`);
  }
  return to;
}

import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email/provider";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import type { MessageChannel, MessageStatus } from "@prisma/client";

export type CommsTrigger =
  | "registration.confirmed"
  | "payment.failed"
  | "event.reminder"
  | "post_event.survey"
  | "staff.invited"
  | "stream.reminder";

const DEFAULT_TEMPLATES: Record<
  CommsTrigger,
  { subject: string; bodyHtml: string; bodyText: string; waTemplate?: string }
> = {
  "registration.confirmed": {
    subject: "You're registered — {{eventTitle}}",
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>You\'re confirmed for <strong>{{eventTitle}}</strong>.</p><p><a href="{{ticketUrl}}">Open your ticket</a></p>',
    bodyText: "Hi {{firstName}}, you're confirmed for {{eventTitle}}. Ticket: {{ticketUrl}}",
    waTemplate: "registration_confirmed",
  },
  "payment.failed": {
    subject: "Payment failed — {{eventTitle}}",
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>Your payment for {{eventTitle}} could not be processed. <a href="{{checkoutUrl}}">Try again</a></p>',
    bodyText: "Payment failed for {{eventTitle}}. Retry: {{checkoutUrl}}",
  },
  "event.reminder": {
    subject: "Reminder: {{eventTitle}} is tomorrow",
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>{{eventTitle}} is coming up on {{eventDate}}.</p><p><a href="{{ticketUrl}}">Your ticket</a></p>',
    bodyText: "Reminder: {{eventTitle}} on {{eventDate}}. Ticket: {{ticketUrl}}",
    waTemplate: "event_reminder_24h",
  },
  "post_event.survey": {
    subject: "How was {{eventTitle}}?",
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>We\'d love your feedback on {{eventTitle}}.</p><p><a href="{{surveyUrl}}">Take the survey</a></p>',
    bodyText: "Feedback survey for {{eventTitle}}: {{surveyUrl}}",
  },
  "staff.invited": {
    subject: "You're invited to staff {{eventTitle}}",
    bodyHtml:
      "<p>Hi {{firstName}},</p><p>You've been invited as check-in staff for {{eventTitle}}.</p>",
    bodyText: "Staff invite for {{eventTitle}}",
  },
  "stream.reminder": {
    subject: "Live stream starting — {{eventTitle}}",
    bodyHtml:
      '<p>Hi {{firstName}},</p><p>{{eventTitle}} stream is live. <a href="{{streamUrl}}">Watch now</a></p>',
    bodyText: "Stream live for {{eventTitle}}: {{streamUrl}}",
    waTemplate: "stream_live",
  },
};

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

async function logMessage(opts: {
  orgId: string;
  eventId?: string;
  trigger: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  bodyPreview?: string;
  status: MessageStatus;
  provider?: string;
  providerId?: string;
  error?: string;
}) {
  await db.message.create({
    data: {
      orgId: opts.orgId,
      eventId: opts.eventId,
      trigger: opts.trigger,
      channel: opts.channel,
      toAddress: opts.to,
      subject: opts.subject,
      bodyPreview: opts.bodyPreview?.slice(0, 500),
      status: opts.status,
      provider: opts.provider,
      providerId: opts.providerId,
      error: opts.error,
      sentAt: opts.status === "sent" ? new Date() : undefined,
    },
  });
}

export async function sendTriggeredMessage(opts: {
  trigger: CommsTrigger;
  orgId: string;
  eventId?: string;
  to: string;
  phone?: string;
  whatsappConsented?: boolean;
  vars: Record<string, string>;
  channels?: MessageChannel[];
}) {
  const channels = opts.channels ?? ["email"];
  const defaults = DEFAULT_TEMPLATES[opts.trigger];

  for (const channel of channels) {
    const template = await db.messageTemplate.findFirst({
      where: {
        trigger: opts.trigger,
        channel,
        active: true,
        OR: [{ eventId: opts.eventId ?? undefined }, { eventId: null, orgId: opts.orgId }],
      },
      orderBy: { eventId: "desc" },
    });

    const subject = render(template?.subject ?? defaults.subject, opts.vars);
    const html = render(template?.bodyHtml ?? defaults.bodyHtml, opts.vars);
    const text = render(template?.bodyText ?? defaults.bodyText, opts.vars);

    try {
      if (channel === "email") {
        const email = getEmailProvider();
        await email.send({ to: opts.to, subject, html, text });
        await logMessage({
          orgId: opts.orgId,
          eventId: opts.eventId,
          trigger: opts.trigger,
          channel: "email",
          to: opts.to,
          subject,
          bodyPreview: text,
          status: "sent",
          provider: process.env.RESEND_API_KEY ? "resend" : "console",
        });
      }

      if (channel === "whatsapp" && opts.phone && opts.whatsappConsented) {
        const wa = getWhatsAppProvider();
        const templateId =
          process.env.WHATSAPP_TEMPLATE_REGISTRATION ??
          defaults.waTemplate ??
          "registration_confirmed";
        const params = [opts.vars.firstName ?? "", opts.vars.eventTitle ?? ""];
        const result = await wa.sendTemplate({ to: opts.phone, templateId, params });
        await logMessage({
          orgId: opts.orgId,
          eventId: opts.eventId,
          trigger: opts.trigger,
          channel: "whatsapp",
          to: opts.phone,
          bodyPreview: text,
          status: "sent",
          provider: process.env.GUPSHUP_API_KEY ? "gupshup" : "console",
          providerId: result.providerId,
        });
      }
    } catch (error) {
      await logMessage({
        orgId: opts.orgId,
        eventId: opts.eventId,
        trigger: opts.trigger,
        channel,
        to: channel === "whatsapp" ? (opts.phone ?? opts.to) : opts.to,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export async function ensureDefaultTemplates(orgId: string, eventId: string) {
  for (const [trigger, tpl] of Object.entries(DEFAULT_TEMPLATES)) {
    await db.messageTemplate.upsert({
      where: {
        eventId_trigger_channel: {
          eventId,
          trigger,
          channel: "email",
        },
      },
      create: {
        orgId,
        eventId,
        trigger,
        channel: "email",
        subject: tpl.subject,
        bodyHtml: tpl.bodyHtml,
        bodyText: tpl.bodyText,
      },
      update: {},
    });
  }
}

export async function getAttendeeCrmTimeline(attendeeId: string) {
  const attendee = await db.attendee.findUnique({
    where: { id: attendeeId },
    include: {
      checkIns: { orderBy: { scannedAt: "desc" }, take: 20 },
      registration: { select: { id: true, status: true, confirmedAt: true } },
    },
  });
  if (!attendee) return null;

  const messages = await db.message.findMany({
    where: {
      OR: [{ toAddress: attendee.email }, { toAddress: attendee.phone ?? "" }],
      eventId: attendee.eventId,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return {
    attendee: {
      id: attendee.id,
      name: `${attendee.firstName} ${attendee.lastName}`,
      email: attendee.email,
      status: attendee.status,
    },
    registration: attendee.registration,
    checkIns: attendee.checkIns.map((c) => ({
      id: c.id,
      result: c.result,
      scannedAt: c.scannedAt.toISOString(),
      isManual: c.isManual,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      trigger: m.trigger,
      channel: m.channel,
      status: m.status,
      sentAt: m.sentAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function getEventAnalyticsSummary(eventId: string) {
  const [registered, checkedIn, orders, pageViews] = await Promise.all([
    db.attendee.count({ where: { eventId, status: { not: "cancelled" } } }),
    db.attendee.count({ where: { eventId, status: "checked_in" } }),
    db.order.findMany({
      where: { eventId, status: "paid" },
      select: { totalCents: true },
    }),
    db.analyticsEvent.count({ where: { eventId, name: "page_view" } }),
  ]);

  const revenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);

  const ticketBreakdown = await db.attendee.groupBy({
    by: ["ticketTypeId"],
    where: { eventId, status: { not: "cancelled" } },
    _count: true,
  });

  const ticketTypes = await db.ticketType.findMany({
    where: { eventId },
    select: { id: true, name: true },
  });
  const ticketTypeMap = Object.fromEntries(ticketTypes.map((t) => [t.id, t.name]));

  const checkInByHour = await db.$queryRaw<{ hour: number; count: bigint }[]>`
    SELECT EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'Asia/Kolkata')::int as hour, COUNT(*)::bigint as count
    FROM check_ins
    WHERE event_id = ${eventId}
    GROUP BY hour
    ORDER BY hour
  `;

  return {
    funnel: {
      pageViews,
      registered,
      checkedIn,
      conversionRate: pageViews > 0 ? Math.round((registered / pageViews) * 100) : 0,
      checkInRate: registered > 0 ? Math.round((checkedIn / registered) * 100) : 0,
    },
    revenue: {
      totalCents: revenueCents,
      orderCount: orders.length,
      currency: "INR",
    },
    ticketBreakdown: ticketBreakdown.map((t) => ({
      ticketType: ticketTypeMap[t.ticketTypeId] ?? t.ticketTypeId,
      count: t._count,
    })),
    checkInHistogram: checkInByHour.map((h) => ({
      hour: h.hour,
      count: Number(h.count),
    })),
  };
}

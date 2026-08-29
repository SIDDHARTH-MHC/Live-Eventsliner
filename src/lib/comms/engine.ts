import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email/provider";

export type CommsTrigger =
  | "registration.confirmed"
  | "payment.failed"
  | "event.reminder"
  | "post_event.survey";

const DEFAULT_TEMPLATES: Record<
  CommsTrigger,
  { subject: string; bodyHtml: string; bodyText: string }
> = {
  "registration.confirmed": {
    subject: "You're registered — {{eventTitle}}",
    bodyHtml:
      "<p>Hi {{firstName}},</p><p>You're confirmed for <strong>{{eventTitle}}</strong>.</p><p><a href=\"{{ticketUrl}}\">Open your ticket</a></p>",
    bodyText: "Hi {{firstName}}, you're confirmed for {{eventTitle}}. Ticket: {{ticketUrl}}",
  },
  "payment.failed": {
    subject: "Payment failed — {{eventTitle}}",
    bodyHtml:
      "<p>Hi {{firstName}},</p><p>Your payment for {{eventTitle}} could not be processed. <a href=\"{{checkoutUrl}}\">Try again</a></p>",
    bodyText: "Payment failed for {{eventTitle}}. Retry: {{checkoutUrl}}",
  },
  "event.reminder": {
    subject: "Reminder: {{eventTitle}} is tomorrow",
    bodyHtml:
      "<p>Hi {{firstName}},</p><p>{{eventTitle}} is coming up on {{eventDate}}.</p><p><a href=\"{{ticketUrl}}\">Your ticket</a></p>",
    bodyText: "Reminder: {{eventTitle}} on {{eventDate}}. Ticket: {{ticketUrl}}",
  },
  "post_event.survey": {
    subject: "How was {{eventTitle}}?",
    bodyHtml:
      "<p>Hi {{firstName}},</p><p>We'd love your feedback on {{eventTitle}}.</p><p><a href=\"{{surveyUrl}}\">Take the survey</a></p>",
    bodyText: "Feedback survey for {{eventTitle}}: {{surveyUrl}}",
  },
};

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendTriggeredMessage(opts: {
  trigger: CommsTrigger;
  orgId: string;
  eventId?: string;
  to: string;
  vars: Record<string, string>;
}) {
  const template = await db.messageTemplate.findFirst({
    where: {
      trigger: opts.trigger,
      channel: "email",
      active: true,
      OR: [{ eventId: opts.eventId ?? undefined }, { eventId: null, orgId: opts.orgId }],
    },
    orderBy: { eventId: "desc" },
  });

  const defaults = DEFAULT_TEMPLATES[opts.trigger];
  const subject = render(template?.subject ?? defaults.subject, opts.vars);
  const html = render(template?.bodyHtml ?? defaults.bodyHtml, opts.vars);
  const text = render(template?.bodyText ?? defaults.bodyText, opts.vars);

  const email = getEmailProvider();
  await email.send({ to: opts.to, subject, html, text });
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

import { NextRequest } from "next/server";
import { withApiContext, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email/provider";
import { ensureTicketToken, ticketUrl } from "@/lib/credentials/ticket-token";

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  return withApiContext(request, async (req) => {
    if (!verifyCronSecret(req)) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const events = await db.event.findMany({
      where: {
        status: "published",
        startsAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        attendees: {
          where: { status: { in: ["registered", "checked_in"] } },
        },
      },
    });

    const email = getEmailProvider();
    let sent = 0;

    for (const event of events) {
      for (const attendee of event.attendees) {
        const token = await ensureTicketToken(attendee.id);
        const passUrl = ticketUrl(token);

        const dateLabel = event.startsAt
          ? new Intl.DateTimeFormat("en-IN", {
              dateStyle: "full",
              timeStyle: "short",
              timeZone: event.timezone,
            }).format(event.startsAt)
          : "Tomorrow";

        await email.send({
          to: attendee.email,
          subject: `Reminder: ${event.title} is tomorrow`,
          html: `
            <p>Hi ${attendee.firstName},</p>
            <p>This is a reminder that <strong>${event.title}</strong> is coming up.</p>
            <p><strong>When:</strong> ${dateLabel}</p>
            ${event.venueName ? `<p><strong>Where:</strong> ${event.venueName}${event.city ? `, ${event.city}` : ""}</p>` : ""}
            <p><a href="${passUrl}"><strong>Open your ticket & QR pass</strong></a></p>
            <p>See you there!</p>
          `,
          text: `Reminder: ${event.title} is tomorrow (${dateLabel}). Your pass: ${passUrl}`,
        });
        sent++;
      }
    }

    return json({ events: events.length, remindersSent: sent });
  });
}

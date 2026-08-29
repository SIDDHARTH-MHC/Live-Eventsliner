import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { parseQrPayload } from "@/lib/credentials/public-id";
import { z } from "zod";

type RouteParams = { params: Promise<{ exhibitorId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { exhibitorId } = await params;
    const exhibitor = await db.exhibitor.findUnique({ where: { id: exhibitorId } });
    if (!exhibitor) return errorJson(404, "NOT_FOUND", "Exhibitor not found");

    const leads = await db.lead.findMany({
      where: { exhibitorId },
      orderBy: { scannedAt: "desc" },
    });

    const attendees = await db.attendee.findMany({
      where: { id: { in: leads.map((l) => l.attendeeId) } },
      select: { id: true, firstName: true, lastName: true, email: true, company: true },
    });

    const attendeeMap = Object.fromEntries(attendees.map((a) => [a.id, a]));

    const headers = ["first_name", "last_name", "email", "company", "scanned_at"];
    const rows = leads.map((l) => {
      const a = attendeeMap[l.attendeeId];
      return [a?.firstName ?? "", a?.lastName ?? "", a?.email ?? "", a?.company ?? "", l.scannedAt.toISOString()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${exhibitor.name}.csv"`,
      },
    });
  });
}

const scanSchema = z.object({
  rawPayload: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { exhibitorId } = await params;
    const exhibitor = await db.exhibitor.findUnique({ where: { id: exhibitorId } });
    if (!exhibitor) return errorJson(404, "NOT_FOUND", "Exhibitor not found");

    const body = scanSchema.parse(await req.json());
    const publicId = parseQrPayload(body.rawPayload);
    if (!publicId) return errorJson(422, "INVALID", "Invalid QR");

    const credential = await db.credential.findFirst({
      where: { publicId, eventId: exhibitor.eventId, status: "active" },
    });
    if (!credential) return errorJson(404, "NOT_FOUND", "Attendee not found");

    const lead = await db.lead.upsert({
      where: {
        exhibitorId_attendeeId: { exhibitorId, attendeeId: credential.attendeeId },
      },
      create: {
        exhibitorId,
        attendeeId: credential.attendeeId,
        eventId: exhibitor.eventId,
        notes: body.notes,
      },
      update: { notes: body.notes, scannedAt: new Date() },
    });

    const attendee = await db.attendee.findUnique({ where: { id: credential.attendeeId } });
    return json({ lead, attendee: attendee ? { firstName: attendee.firstName, lastName: attendee.lastName, company: attendee.company } : null });
  });
}

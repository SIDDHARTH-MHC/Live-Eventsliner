import { NextRequest } from "next/server";
import { withApiContext, errorJson } from "@/lib/api/response";
import { db } from "@/lib/db";
import { buildQrPayload } from "@/lib/credentials/public-id";
import { getBadgePrintPartner } from "@/lib/partners/hardware";
import QRCode from "qrcode";

type RouteParams = { params: Promise<{ attendeeId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { attendeeId } = await params;
    const format = new URL(req.url).searchParams.get("format") ?? "html";

    const attendee = await db.attendee.findUnique({
      where: { id: attendeeId },
      include: { credential: true, event: true, ticketType: true },
    });

    if (!attendee?.credential || attendee.credential.status !== "active") {
      return errorJson(404, "NOT_FOUND", "Attendee or credential not found");
    }

    if (format === "zpl") {
      const partner = getBadgePrintPartner();
      const payload = await partner.buildPayload({
        attendeeId: attendee.id,
        publicId: attendee.credential.publicId,
        displayName: `${attendee.firstName} ${attendee.lastName}`,
        ticketType: attendee.ticketType.name,
        eventTitle: attendee.event.title,
        format: "zpl",
      });
      return new Response(payload.zpl ?? "", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const qrPayload = buildQrPayload(attendee.credential.publicId);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 200, margin: 2 });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Badge — ${attendee.firstName} ${attendee.lastName}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; max-width: 400px; margin: 0 auto; }
  .badge { border: 2px solid #000; padding: 24px; text-align: center; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .event { color: #666; margin-bottom: 16px; }
  img { width: 180px; height: 180px; }
  .type { margin-top: 12px; font-weight: 600; }
</style></head><body>
<div class="badge">
  <div class="event">${attendee.event.title}</div>
  <h1>${attendee.firstName} ${attendee.lastName}</h1>
  ${attendee.company ? `<p>${attendee.company}</p>` : ""}
  <img src="${qrDataUrl}" alt="QR code" />
  <p class="type">${attendee.ticketType.name}</p>
</div>
<p style="margin-top:24px;font-size:12px;color:#666">Print via QZ Tray + Zebra. ZPL: ?format=zpl — see docs/20-hardware-partners.md</p>
</body></html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });
}

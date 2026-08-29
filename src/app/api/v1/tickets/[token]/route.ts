import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { buildQrPayload } from "@/lib/credentials/public-id";
import QRCode from "qrcode";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { token } = await params;

    const ticketToken = await db.ticketToken.findUnique({
      where: { token },
      include: {
        attendee: {
          include: {
            event: true,
            ticketType: true,
            credential: true,
          },
        },
      },
    });

    if (!ticketToken) return errorJson(404, "NOT_FOUND", "Ticket not found");

    const { attendee } = ticketToken;
    if (!attendee.credential || attendee.credential.status !== "active") {
      return errorJson(410, "REVOKED", "This ticket is no longer valid");
    }

    const qrPayload = buildQrPayload(attendee.credential.publicId);
    const qrSvg = await QRCode.toString(qrPayload, {
      type: "svg",
      margin: 2,
      width: 320,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return json({
      attendee: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        ticketType: attendee.ticketType.name,
        status: attendee.status,
      },
      event: {
        title: attendee.event.title,
        startsAt: attendee.event.startsAt?.toISOString() ?? null,
        timezone: attendee.event.timezone,
        venueName: attendee.event.venueName,
        venueAddress: attendee.event.venueAddress,
        city: attendee.event.city,
        publicSlug: attendee.event.publicSlug,
      },
      qrPayload,
      qrSvg,
    });
  });
}

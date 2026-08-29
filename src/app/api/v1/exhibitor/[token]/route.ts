import { NextRequest } from "next/server";
import { withApiContext, errorJson, json } from "@/lib/api/response";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async () => {
    const { token } = await params;
    const exhibitor = await db.exhibitor.findUnique({
      where: { accessToken: token },
      include: {
        event: { select: { title: true, publicSlug: true } },
        staff: true,
        leads: {
          include: {
            exhibitor: false,
          },
          orderBy: { scannedAt: "desc" },
          take: 100,
        },
        _count: { select: { leads: true } },
      },
    });
    if (!exhibitor) return errorJson(404, "NOT_FOUND", "Exhibitor portal not found");

    const attendeeIds = exhibitor.leads.map((l) => l.attendeeId);
    const attendees = attendeeIds.length
      ? await db.attendee.findMany({
          where: { id: { in: attendeeIds } },
          select: { id: true, firstName: true, lastName: true, email: true, company: true, jobTitle: true },
        })
      : [];
    const attendeeMap = Object.fromEntries(attendees.map((a) => [a.id, a]));

    return json({
      exhibitor: {
        id: exhibitor.id,
        name: exhibitor.name,
        description: exhibitor.description,
        boothNumber: exhibitor.boothNumber,
        passQuota: exhibitor.passQuota,
        passesUsed: exhibitor.passesUsed,
        event: exhibitor.event,
        staff: exhibitor.staff,
        leadCount: exhibitor._count.leads,
        leads: exhibitor.leads.map((l) => ({
          id: l.id,
          scannedAt: l.scannedAt.toISOString(),
          notes: l.notes,
          attendee: attendeeMap[l.attendeeId] ?? null,
        })),
      },
    });
  });
}

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  return withApiContext(request, async (req) => {
    const { token } = await params;
    const exhibitor = await db.exhibitor.findUnique({ where: { accessToken: token } });
    if (!exhibitor) return errorJson(404, "NOT_FOUND", "Exhibitor portal not found");

    if (exhibitor.passesUsed >= exhibitor.passQuota) {
      return errorJson(400, "QUOTA_EXCEEDED", "Pass quota reached");
    }

    const body = staffSchema.parse(await req.json());
    const staff = await db.exhibitorStaff.create({
      data: {
        exhibitorId: exhibitor.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
      },
    });

    await db.exhibitor.update({
      where: { id: exhibitor.id },
      data: { passesUsed: { increment: 1 } },
    });

    return json({ staff }, { status: 201 });
  });
}

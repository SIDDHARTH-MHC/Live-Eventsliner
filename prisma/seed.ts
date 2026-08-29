import { PrismaClient } from "@prisma/client";
import { createEvent, publishEvent } from "../src/lib/events/service";
import { DEFAULT_FORM_SCHEMA } from "../src/lib/registration/form-schema";
import { materializeAttendee } from "../src/lib/attendees/materialize";
import { ensureTicketToken, ticketUrl } from "../src/lib/credentials/ticket-token";

const db = new PrismaClient();

async function main() {
  const email = "demo@eventsliner.live";

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        name: "Demo Organizer",
      },
    });
  }

  const orgSlug = "delhi-demo";
  let org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "Delhi Demo Collective",
        slug: orgSlug,
        country: "IN",
        timezone: "Asia/Kolkata",
        primaryColor: "#6750a4",
        memberships: {
          create: { userId: user.id, role: "owner", acceptedAt: new Date() },
        },
      },
    });
  }

  let existingEvent = await db.event.findFirst({
    where: { orgId: org.id, slug: "product-workshop" },
    include: { ticketTypes: true },
  });

  if (!existingEvent) {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 14);
    startsAt.setHours(10, 0, 0, 0);

    const event = await createEvent({
      orgId: org.id,
      title: "Product workshop — Delhi",
      slug: "product-workshop",
      description:
        "A hands-on afternoon for product managers and founders. Learn positioning, pricing, and launch checklists for India-first events.",
      timezone: "Asia/Kolkata",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 4 * 60 * 60 * 1000),
      venueName: "India Habitat Centre",
      city: "Delhi",
      visibility: "public",
      category: "workshop",
      tags: ["product", "startup", "delhi"],
      createdById: user.id,
    });

    await db.event.update({
      where: { id: event.id },
      data: { registrationFormSchema: DEFAULT_FORM_SCHEMA },
    });

    await db.ticketType.createMany({
      data: [
        {
          eventId: event.id,
          orgId: org.id,
          name: "Free seat",
          description: "General admission — no payment required",
          priceCents: 0,
          mode: "open_free",
          quantity: 50,
          sortOrder: 0,
        },
        {
          eventId: event.id,
          orgId: org.id,
          name: "VIP workshop pass",
          description: "Includes front-row seating and materials (mock paid — use dev checkout)",
          priceCents: 49900,
          mode: "open_paid",
          quantity: 20,
          sortOrder: 1,
        },
        {
          eventId: event.id,
          orgId: org.id,
          name: "RSVP",
          description: "Let us know if you are coming",
          priceCents: 0,
          mode: "rsvp",
          quantity: null,
          sortOrder: 2,
        },
      ],
    });

    await publishEvent(event.id, user.id);
    console.log(`Seeded published event: /e/${orgSlug}-product-workshop`);
  } else if (existingEvent.ticketTypes.length === 0) {
    await db.ticketType.createMany({
      data: [
        {
          eventId: existingEvent.id,
          orgId: org.id,
          name: "Free seat",
          priceCents: 0,
          mode: "open_free",
          quantity: 50,
          sortOrder: 0,
        },
        {
          eventId: existingEvent.id,
          orgId: org.id,
          name: "VIP workshop pass",
          priceCents: 49900,
          mode: "open_paid",
          quantity: 20,
          sortOrder: 1,
        },
      ],
    });
    console.log("Added ticket types to existing demo event");
  } else {
    console.log("Seed event already exists — skipping");
  }

  const event = await db.event.findFirst({
    where: { orgId: org.id, slug: "product-workshop" },
    include: { ticketTypes: true },
  });

  if (event && event.ticketTypes.length > 0) {
    const existingAttendees = await db.attendee.count({ where: { eventId: event.id } });
    if (existingAttendees === 0) {
      const freeTicket = event.ticketTypes.find((t) => t.mode === "open_free") ?? event.ticketTypes[0];
      const demoAttendees = [
        { firstName: "Ananya", lastName: "Kapoor", email: "ananya.demo@example.com", phone: "+919876543210" },
        { firstName: "Rahul", lastName: "Mehta", email: "rahul.demo@example.com", phone: "+919876543211" },
        { firstName: "Priya", lastName: "Singh", email: "priya.demo@example.com", phone: "+919876543212" },
      ];

      for (const demo of demoAttendees) {
        const reg = await db.registration.create({
          data: {
            eventId: event.id,
            orgId: org.id,
            ticketTypeId: freeTicket.id,
            status: "confirmed",
            confirmedAt: new Date(),
            answers: {
              firstName: demo.firstName,
              lastName: demo.lastName,
              email: demo.email,
              phone: demo.phone,
            },
          },
        });
        await materializeAttendee(reg.id);
      }
      console.log(`Seeded ${demoAttendees.length} demo attendees with QR tickets`);
    }

    let staffUser = await db.user.findUnique({ where: { phone: "+919888877766" } });
    if (!staffUser) {
      staffUser = await db.user.create({
        data: {
          phone: "+919888877766",
          phoneVerifiedAt: new Date(),
          name: "Check-in Staff Demo",
        },
      });
    }

    await db.eventStaff.upsert({
      where: { eventId_phone: { eventId: event.id, phone: "+919888877766" } },
      create: {
        eventId: event.id,
        orgId: org.id,
        phone: "+919888877766",
        name: "Check-in Staff Demo",
        userId: staffUser.id,
        role: "checkin",
        acceptedAt: new Date(),
      },
      update: { userId: staffUser.id, acceptedAt: new Date() },
    });
    console.log("Seeded check-in staff: +919888877766");
  }

  const sampleAttendee = await db.attendee.findFirst({
    where: { event: { orgId: org.id, slug: "product-workshop" } },
  });
  if (sampleAttendee) {
    const token = await ensureTicketToken(sampleAttendee.id);
    console.log(`Sample ticket: ${ticketUrl(token)}`);
  }

  console.log(`Demo user: ${email}`);
  console.log(`Demo org: /orgs/${orgSlug}`);
  console.log(`Register: /e/${orgSlug}-product-workshop/register`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

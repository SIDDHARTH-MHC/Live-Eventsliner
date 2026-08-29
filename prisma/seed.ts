import { PrismaClient } from "@prisma/client";
import { createEvent, publishEvent } from "../src/lib/events/service";

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

  const existingEvent = await db.event.findFirst({
    where: { orgId: org.id, slug: "product-workshop" },
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
      createdById: user.id,
    });

    await publishEvent(event.id, user.id);
    console.log(`Seeded published event: /e/${orgSlug}-product-workshop`);
  } else {
    console.log("Seed event already exists — skipping");
  }

  console.log(`Demo user: ${email}`);
  console.log(`Demo org: /orgs/${orgSlug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

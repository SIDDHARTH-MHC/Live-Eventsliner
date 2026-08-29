import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

describe("tenant isolation", () => {
  let userAId: string;
  let userBId: string;
  let orgAId: string;
  let orgBId: string;
  const suffix = Date.now();

  beforeAll(async () => {
    const userA = await db.user.create({
      data: { email: `tenant-a-${suffix}@test.com` },
    });
    const userB = await db.user.create({
      data: { email: `tenant-b-${suffix}@test.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    const orgA = await db.organization.create({
      data: {
        name: "Org A",
        slug: `org-a-${suffix}`,
        memberships: {
          create: { userId: userAId, role: "owner", acceptedAt: new Date() },
        },
      },
    });
    const orgB = await db.organization.create({
      data: {
        name: "Org B",
        slug: `org-b-${suffix}`,
        memberships: {
          create: { userId: userBId, role: "owner", acceptedAt: new Date() },
        },
      },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;
  });

  afterAll(async () => {
    await db.membership.deleteMany({
      where: { orgId: { in: [orgAId, orgBId] } },
    });
    await db.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await db.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await db.$disconnect();
  });

  it("org B user cannot read org A by id through membership filter", async () => {
    const crossTenantMembership = await db.membership.findFirst({
      where: { userId: userBId, orgId: orgAId },
    });
    expect(crossTenantMembership).toBeNull();

    const orgAEventsForB = await db.event.findMany({
      where: {
        orgId: orgAId,
        org: { memberships: { some: { userId: userBId } } },
      },
    });
    expect(orgAEventsForB).toHaveLength(0);

    const orgBVisibleToB = await db.organization.findFirst({
      where: { id: orgBId, memberships: { some: { userId: userBId } } },
    });
    expect(orgBVisibleToB?.id).toBe(orgBId);
  });
});

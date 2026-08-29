import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, type Organization, type User } from "@prisma/client";
import { can } from "@/lib/authz/can";

const db = new PrismaClient();

describe("can()", () => {
  let owner: User;
  let stranger: User;
  let org: Organization;

  beforeAll(async () => {
    owner = await db.user.create({ data: { email: "owner-can-test@example.com" } });
    stranger = await db.user.create({ data: { email: "stranger-can-test@example.com" } });
    org = await db.organization.create({
      data: {
        name: "Can Test Org",
        slug: `can-test-${Date.now()}`,
        memberships: {
          create: { userId: owner.id, role: "owner", acceptedAt: new Date() },
        },
      },
    });
  });

  afterAll(async () => {
    await db.membership.deleteMany({ where: { orgId: org.id } });
    await db.organization.delete({ where: { id: org.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, stranger.id] } } });
    await db.$disconnect();
  });

  it("allows owner to read and update org", async () => {
    expect(await can(owner, "org:read", { type: "organization", org })).toBe(true);
    expect(await can(owner, "org:update", { type: "organization", org })).toBe(true);
    expect(await can(owner, "org:delete", { type: "organization", org })).toBe(true);
  });

  it("denies stranger org access", async () => {
    expect(await can(stranger, "org:read", { type: "organization", org })).toBe(false);
    expect(await can(stranger, "org:update", { type: "organization", org })).toBe(false);
  });

  it("allows anyone authenticated to create org", async () => {
    expect(await can(stranger, "org:create", { type: "global" })).toBe(true);
  });
});

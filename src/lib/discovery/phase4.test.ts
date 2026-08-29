import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { discoverEvents } from "@/lib/discovery/service";

const db = new PrismaClient();

describe("Phase 4 discovery", () => {
  let orgId: string;
  let publicEventId: string;
  let unlistedEventId: string;
  let privateEventId: string;
  let draftEventId: string;

  beforeAll(async () => {
    const org = await db.organization.create({
      data: { name: "Discovery Test", slug: `disc-test-${Date.now()}` },
    });
    orgId = org.id;

    const base = {
      orgId,
      title: "Test Event",
      slug: "test",
      city: "Delhi",
      category: "workshop",
      tags: ["product"],
      status: "published" as const,
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const pub = await db.event.create({
      data: {
        ...base,
        slug: "pub",
        publicSlug: `disc-pub-${Date.now()}`,
        visibility: "public",
        title: "Public Workshop Delhi",
      },
    });
    publicEventId = pub.id;

    const unlisted = await db.event.create({
      data: {
        ...base,
        slug: "unlisted",
        publicSlug: `disc-unlisted-${Date.now()}`,
        visibility: "unlisted",
        title: "Unlisted Secret",
      },
    });
    unlistedEventId = unlisted.id;

    const priv = await db.event.create({
      data: {
        ...base,
        slug: "private",
        publicSlug: `disc-private-${Date.now()}`,
        visibility: "private",
        title: "Private Corp",
      },
    });
    privateEventId = priv.id;

    const draft = await db.event.create({
      data: {
        ...base,
        slug: "draft",
        visibility: "public",
        status: "draft",
        title: "Draft Event",
      },
    });
    draftEventId = draft.id;
  });

  afterAll(async () => {
    await db.event.deleteMany({
      where: { id: { in: [publicEventId, unlistedEventId, privateEventId, draftEventId] } },
    });
    await db.organization.deleteMany({ where: { id: orgId } });
    await db.$disconnect();
  });

  it("returns only PUBLIC published events", async () => {
    const results = await discoverEvents({ city: "Delhi" });
    const ids = results.map((e) => e.id);
    expect(ids).toContain(publicEventId);
    expect(ids).not.toContain(unlistedEventId);
    expect(ids).not.toContain(privateEventId);
    expect(ids).not.toContain(draftEventId);
  });

  it("supports keyword search", async () => {
    const results = await discoverEvents({ q: "Public Workshop" });
    expect(results.some((e) => e.id === publicEventId)).toBe(true);
  });
});

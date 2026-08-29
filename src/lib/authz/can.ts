import type { User, Organization, Event, MembershipRole } from "@prisma/client";
import { db } from "@/lib/db";

export type Action =
  | "org:read"
  | "org:create"
  | "org:update"
  | "org:delete"
  | "event:read"
  | "event:create"
  | "event:update"
  | "event:publish"
  | "event:delete"
  | "media:upload"
  | "ticket:manage"
  | "registration:manage"
  | "attendee:read"
  | "attendee:manage"
  | "org:payments";

export type Resource =
  | { type: "organization"; org: Organization }
  | { type: "event"; event: Event; org?: Organization }
  | { type: "global" };

export type Actor = User | null;

async function getMembershipRole(
  userId: string,
  orgId: string,
): Promise<MembershipRole | null> {
  const membership = await db.membership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  return membership?.role ?? null;
}

function isOrgAdminRole(role: MembershipRole | null): boolean {
  return role === "owner" || role === "admin";
}

export async function can(actor: Actor, action: Action, resource: Resource): Promise<boolean> {
  if (!actor || actor.status !== "active") {
    if (action === "org:create") return true;
    if (resource.type === "event" && resource.event.status === "published") {
      const visibility = resource.event.visibility;
      if (action === "event:read" && (visibility === "public" || visibility === "unlisted")) {
        return true;
      }
    }
    return false;
  }

  switch (action) {
    case "org:create":
      return true;

    case "org:read":
    case "org:update":
    case "org:delete": {
      if (resource.type !== "organization") return false;
      const role = await getMembershipRole(actor.id, resource.org.id);
      if (action === "org:read") return role !== null;
      if (action === "org:update") return isOrgAdminRole(role);
      if (action === "org:delete") return role === "owner";
      return false;
    }

    case "event:read": {
      if (resource.type === "event") {
        const role = await getMembershipRole(actor.id, resource.event.orgId);
        if (role) return true;
        if (resource.event.status === "published") {
          return (
            resource.event.visibility === "public" || resource.event.visibility === "unlisted"
          );
        }
      }
      return false;
    }

    case "event:create":
    case "event:update":
    case "event:publish":
    case "event:delete":
    case "media:upload":
    case "ticket:manage":
    case "registration:manage":
    case "attendee:read":
    case "attendee:manage": {
      if (resource.type === "event") {
        const role = await getMembershipRole(actor.id, resource.event.orgId);
        return isOrgAdminRole(role);
      }
      if (resource.type === "organization") {
        const role = await getMembershipRole(actor.id, resource.org.id);
        return isOrgAdminRole(role);
      }
      return false;
    }

    case "org:payments": {
      if (resource.type !== "organization") return false;
      const role = await getMembershipRole(actor.id, resource.org.id);
      return role === "owner" || role === "admin";
    }

    default:
      return false;
  }
}

export async function requireCan(
  actor: Actor,
  action: Action,
  resource: Resource,
): Promise<void> {
  const allowed = await can(actor, action, resource);
  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}

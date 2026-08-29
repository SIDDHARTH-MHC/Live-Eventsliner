import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { withApiContext, json, errorJson } from "@/lib/api/response";

export async function GET(request: Request) {
  return withApiContext(request, async () => {
    const user = await getSessionUser();
    if (!user) {
      return errorJson(401, "UNAUTHORIZED", "Sign in required");
    }

    const memberships = await db.membership.findMany({
      where: { userId: user.id },
      include: { org: { select: { id: true, name: true, slug: true } } },
    });

    return json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        timezone: user.timezone,
        locale: user.locale,
      },
      memberships: memberships.map((m) => ({
        orgId: m.orgId,
        role: m.role,
        org: m.org,
      })),
    });
  });
}

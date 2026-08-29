import { redirect } from "next/navigation";
import { createSession, sessionCookieOptions } from "@/lib/auth/session";
import { verifyMagicLink } from "@/lib/auth/credentials";
import { cookies } from "next/headers";
import { PageShell } from "@/components/shells/page-shell";

export default async function VerifyMagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <PageShell title="Invalid link" description="This sign-in link is missing or expired.">
        <p className="text-body">
          <a href="/auth/email" className="text-primary underline">
            Request a new link
          </a>
        </p>
      </PageShell>
    );
  }

  const userId = await verifyMagicLink(token);
  if (!userId) {
    return (
      <PageShell title="Link expired" description="This sign-in link has expired or was already used.">
        <p className="text-body">
          <a href="/auth/email" className="text-primary underline">
            Request a new link
          </a>
        </p>
      </PageShell>
    );
  }

  const sessionToken = await createSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(sessionToken));

  redirect("/");
}

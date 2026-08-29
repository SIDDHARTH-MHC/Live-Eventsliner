import Link from "next/link";
import { PageShell } from "@/components/shells/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <PageShell
      title="Sign in"
      description="Use email magic link or phone OTP. India numbers supported (+91)."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>We will send a one-time sign-in link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/email">Continue with email</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Phone</CardTitle>
            <CardDescription>OTP via SMS (MSG91 in production).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/phone">Continue with phone</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

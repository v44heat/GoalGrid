import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  pending: "Your account is waiting for admin approval.",
  suspended: "Your account has been suspended. Ask the league admin.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reason?: string };
}) {
  const profile = await getCurrentProfile();
  if (profile?.status === "APPROVED") redirect("/");

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 font-display text-4xl font-bold tracking-tight">Log in</h1>
      <Card>
        <LoginForm
          next={safeNextPath(searchParams.next)}
          notice={searchParams.reason ? NOTICES[searchParams.reason] : undefined}
        />
      </Card>
    </div>
  );
}

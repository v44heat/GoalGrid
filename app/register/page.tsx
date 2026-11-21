import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const profile = await getCurrentProfile();
  if (profile?.status === "APPROVED") redirect("/");

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 font-display text-4xl font-bold tracking-tight">Create account</h1>
      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}

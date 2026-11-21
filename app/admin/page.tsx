import Link from "next/link";
import { UserCheck, Users, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const count = async (status: string) => {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };

  const [pending, approved, suspended] = await Promise.all([
    count("PENDING"),
    count("APPROVED"),
    count("SUSPENDED"),
  ]);

  const stats = [
    { label: "Waiting for approval", value: pending, icon: Users, highlight: pending > 0 },
    { label: "Approved players", value: approved, icon: UserCheck, highlight: false },
    { label: "Suspended", value: suspended, icon: UserX, highlight: false },
  ];

  return (
    <>
      <PageHeader title="Admin dashboard" description="Season tools arrive in the next phases." />
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, highlight }) => (
          <Card key={label} className={highlight ? "border-gold/50" : undefined}>
            <Icon className="h-5 w-5 text-chalk-faint" aria-hidden />
            <p className="tabular mt-3 font-display text-5xl font-bold">{value}</p>
            <p className="text-sm text-chalk-dim">{label}</p>
          </Card>
        ))}
      </div>
      {pending > 0 && (
        <p className="mt-6">
          <Link href="/admin/players" className="text-grass underline-offset-2 hover:underline">
            Review {pending} pending {pending === 1 ? "registration" : "registrations"}
          </Link>
        </p>
      )}
    </>
  );
}

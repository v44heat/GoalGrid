import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonForm } from "@/components/admin/SeasonForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New season" };
export const dynamic = "force-dynamic";

export default async function NewSeasonPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("id, username")
    .eq("status", "APPROVED")
    .order("username", { ascending: true });

  return (
    <>
      <PageHeader title="New season" description="Pick the start date and who plays." />
      <SeasonForm players={data ?? []} />
    </>
  );
}

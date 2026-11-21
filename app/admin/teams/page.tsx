import { Shirt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamForm } from "@/components/admin/TeamForm";
import { TeamRow } from "@/components/admin/TeamRow";
import { createClient } from "@/lib/supabase/server";
import { getTeams } from "@/lib/data/seasons";

export const metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const teams = await getTeams(createClient());

  return (
    <>
      <PageHeader title="Teams" description="Clubs players can pick from. A club can be used once per season." />

      <h2 className="mb-3 font-display text-2xl font-semibold">Add a team</h2>
      <TeamForm />

      <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">All teams ({teams.length})</h2>
      {teams.length === 0 ? (
        <EmptyState icon={Shirt} title="No teams yet" description="Add the first club above." />
      ) : (
        <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
          {teams.map((t) => (
            <TeamRow key={t.id} team={t} />
          ))}
        </ul>
      )}
    </>
  );
}

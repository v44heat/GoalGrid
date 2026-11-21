import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { ParticipantManager } from "@/components/admin/ParticipantManager";
import { createClient } from "@/lib/supabase/server";
import { getParticipants, getSeason, getTeams } from "@/lib/data/seasons";
import { UUID_RE } from "@/lib/validation/auth";
import { formatDate } from "@/utils/dates";

export const metadata = { title: "Manage season" };
export const dynamic = "force-dynamic";

export default async function AdminSeasonPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string };
}) {
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const season = await getSeason(supabase, params.id);
  if (!season) notFound();

  const [participants, teams, { data: approved }] = await Promise.all([
    getParticipants(supabase, season.id),
    getTeams(supabase),
    supabase.from("users").select("id, username").eq("status", "APPROVED").order("username"),
  ]);

  const inSeason = new Set(participants.map((p) => p.user_id));
  const addable = (approved ?? []).filter((u) => !inSeason.has(u.id));
  const isDraft = season.status === "DRAFT";
  const canEditTeams = season.status === "DRAFT" || season.status === "ACTIVE";

  return (
    <>
      <PageHeader
        title={season.name}
        description={`${formatDate(season.start_date)} to ${formatDate(season.end_date)}`}
        actions={<SeasonStatusBadge status={season.status} />}
      />

      {searchParams.created && (
        <p className="mb-6 rounded-lg border border-grass/40 bg-grass/10 px-4 py-3 text-sm">
          Season created. Players can now pick their teams on the{" "}
          <Link href={`/seasons/${season.id}`} className="text-grass underline-offset-2 hover:underline">
            season page
          </Link>
          . Fixtures come in the next phase.
        </p>
      )}

      <h2 className="mb-3 font-display text-2xl font-semibold">
        Participants ({participants.length})
      </h2>
      <ParticipantManager
        seasonId={season.id}
        isDraft={isDraft}
        canEditTeams={canEditTeams}
        participants={participants}
        teams={teams}
        addable={addable}
      />
    </>
  );
}

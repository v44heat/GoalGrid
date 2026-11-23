import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { ParticipantManager } from "@/components/admin/ParticipantManager";
import { FixturePreview } from "@/components/admin/FixturePreview";
import { SeasonControls } from "@/components/admin/SeasonControls";
import { SeasonLifecycle } from "@/components/admin/SeasonLifecycle";
import { createClient } from "@/lib/supabase/server";
import { getParticipants, getSeason, getTeams } from "@/lib/data/seasons";
import { getFixtureCount } from "@/lib/data/fixtures";
import { generateFixtures, MAX_PLAYERS, MIN_PLAYERS, summarise } from "@/lib/fixtures/generate";
import { UUID_RE } from "@/lib/validation/auth";
import { addDays, formatDate } from "@/utils/dates";

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

  const [participants, teams, { data: approved }, fixtureCount] = await Promise.all([
    getParticipants(supabase, season.id),
    getTeams(supabase),
    supabase.from("users").select("id, username").eq("status", "APPROVED").order("username"),
    getFixtureCount(supabase, season.id),
  ]);

  const inSeason = new Set(participants.map((p) => p.user_id));
  const addable = (approved ?? []).filter((u) => !inSeason.has(u.id));
  const isDraft = season.status === "DRAFT";
  const canEditTeams = season.status === "DRAFT" || season.status === "ACTIVE";

  // Preview of what "generate" will save. Participants are sorted by username, and the
  // generate action uses the same order, so the preview and the saved list match.
  const sizeOk = participants.length >= MIN_PLAYERS && participants.length <= MAX_PLAYERS;
  const showPreview = isDraft && fixtureCount === 0 && sizeOk;
  const names = new Map(participants.map((p) => [p.user_id, p.username]));
  const generated = showPreview ? generateFixtures(participants.map((p) => p.user_id)) : [];
  const previewMatches = generated.map((f) => ({
    matchday: f.matchday,
    date: addDays(season.start_date, f.dayOffset),
    home: names.get(f.home) ?? "?",
    away: names.get(f.away) ?? "?",
  }));
  const { matches, matchdays } = summarise(generated);
  const playersWithoutTeam = participants.filter((p) => !p.team_id).map((p) => p.username);

  // Matches that would be left without a result if the season were completed now.
  const { count: unplayedCount } = await supabase
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", season.id)
    .in("status", ["UPCOMING", "POSTPONED"]);

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
          . When everyone is in, generate the fixtures below.
        </p>
      )}

      <h2 className="mb-3 font-display text-2xl font-semibold">
        Participants ({participants.length})
      </h2>
      <ParticipantManager
        seasonId={season.id}
        isDraft={isDraft && fixtureCount === 0}
        canEditTeams={canEditTeams}
        participants={participants}
        teams={teams}
        addable={addable}
      />
      {isDraft && fixtureCount > 0 && (
        <p className="mt-3 text-sm text-chalk-faint">
          The player list is locked because fixtures exist. Discard the fixtures to change it.
        </p>
      )}

      <h2 className="mb-3 mt-12 font-display text-2xl font-semibold">Fixtures</h2>

      {fixtureCount > 0 ? (
        <div className="space-y-4">
          <p className="text-chalk-dim">
            {fixtureCount} fixtures generated.{" "}
            <Link
              href={`/admin/fixtures?season=${season.id}`}
              className="text-grass underline-offset-2 hover:underline"
            >
              Manage dates and statuses
            </Link>
          </p>
          <SeasonControls
            seasonId={season.id}
            seasonName={season.name}
            isDraft={isDraft}
            fixtureCount={fixtureCount}
            canGenerate={false}
            playersWithoutTeam={playersWithoutTeam}
          />
        </div>
      ) : !isDraft ? (
        <p className="text-chalk-dim">No fixtures were generated for this season.</p>
      ) : !sizeOk ? (
        <p className="text-chalk-dim">
          A season needs between {MIN_PLAYERS} and {MAX_PLAYERS} players to generate fixtures. It has{" "}
          {participants.length}.
        </p>
      ) : (
        <div className="space-y-5">
          <p className="text-chalk-dim">
            Preview: {matches} matches over {matchdays} matchdays. Every player meets every other player twice,
            home and away. Nothing is saved until you confirm.
          </p>
          <FixturePreview matches={previewMatches} />
          <SeasonControls
            seasonId={season.id}
            seasonName={season.name}
            isDraft={isDraft}
            fixtureCount={0}
            canGenerate
            playersWithoutTeam={playersWithoutTeam}
          />
        </div>
      )}

      {!isDraft && (
        <>
          <h2 className="mb-3 mt-12 font-display text-2xl font-semibold">Season status</h2>
          <SeasonLifecycle
            seasonId={season.id}
            seasonName={season.name}
            status={season.status}
            unplayed={unplayedCount ?? 0}
          />
        </>
      )}
    </>
  );
}

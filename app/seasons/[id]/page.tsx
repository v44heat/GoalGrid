import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { TeamPicker } from "@/components/seasons/TeamPicker";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { SummaryCardButton } from "@/components/graphics/ImageButtons";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getParticipants, getSeason, getTeams } from "@/lib/data/seasons";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";
import { summaryData } from "@/lib/data/graphics";
import { UUID_RE } from "@/lib/validation/auth";
import { formatDate } from "@/utils/dates";
import { TEAM_SELECTION_STATUS } from "@/types/league";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return { title: "Season" };
  const season = await getSeason(createClient(), params.id);
  return { title: season?.name ?? "Season" };
}

export default async function SeasonPage({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const season = await getSeason(supabase, params.id);
  if (!season) notFound();

  const [participants, teams, profile] = await Promise.all([
    getParticipants(supabase, season.id),
    getTeams(supabase),
    getCurrentProfile(),
  ]);

  const me = profile?.status === "APPROVED" ? profile : null;
  const mine = me ? participants.find((p) => p.user_id === me.id) : undefined;
  const selectionOpen = season.status === TEAM_SELECTION_STATUS;

  const takenBy: Record<string, { userId: string; username: string }> = {};
  participants.forEach((p) => {
    if (p.team_id) takenBy[p.team_id] = { userId: p.user_id, username: p.username };
  });

  // The champion block appears once a season is completed or archived.
  const finished = season.status === "COMPLETED" || season.status === "ARCHIVED";
  const finalTable = finished ? buildSeasonTable(await getFixtureRows(supabase, season.id)) : null;
  const summary = finalTable ? summaryData(season.name, finalTable) : null;

  return (
    <>
      <PageHeader
        title={season.name}
        description={`${formatDate(season.start_date)} to ${formatDate(season.end_date)}`}
        actions={<SeasonStatusBadge status={season.status} />}
      />

      {finished && (
        <section aria-labelledby="champion-heading" className="mb-10">
          {summary ? (
            <Card className="border-gold/50 bg-gold/[0.06]">
              <div className="flex flex-wrap items-center gap-5">
                <Trophy className="h-12 w-12 shrink-0 text-gold" aria-hidden />
                {summary.champion.team && (
                  <TeamLogo
                    name={summary.champion.team.name}
                    shortName={summary.champion.team.shortName}
                    logoUrl={summary.champion.team.logoUrl}
                    className="h-16 w-16"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 id="champion-heading" className="text-sm font-medium uppercase tracking-widest text-gold">
                    Season champion
                  </h2>
                  <p className="truncate font-display text-4xl font-bold">{summary.champion.player}</p>
                  <p className="text-chalk-dim">{summary.champion.team?.name ?? "No team"}</p>
                </div>
                <SummaryCardButton data={summary} />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {(
                  [
                    ["Matches", summary.champion.played],
                    ["Wins", summary.champion.won],
                    ["Draws", summary.champion.drawn],
                    ["Losses", summary.champion.lost],
                    ["Goals", summary.champion.goalsFor],
                    ["Points", summary.champion.points],
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-chalk-dim">{label}</dt>
                    <dd className="tabular font-display text-3xl font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : (
            <Card>
              <h2 id="champion-heading" className="font-display text-2xl font-semibold">
                No single champion
              </h2>
              <p className="mt-1 text-chalk-dim">
                {finalTable && finalTable.playedCount > 0
                  ? "Players finished level on points, goal difference and goals scored."
                  : "No matches were played in this season."}
              </p>
            </Card>
          )}
        </section>
      )}

      <h2 className="mb-3 font-display text-2xl font-semibold">Players ({participants.length})</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <li key={p.id}>
            <Card className="flex items-center gap-3 py-3">
              {p.team ? (
                <TeamLogo name={p.team.name} shortName={p.team.short_name} logoUrl={p.team.logo_url} />
              ) : (
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-turf-600 text-chalk-faint"
                >
                  ?
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{p.username}</p>
                <p className="truncate text-sm text-chalk-dim">{p.team?.name ?? "No team yet"}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <section className="mt-12" aria-labelledby="team-heading">
        <h2 id="team-heading" className="mb-3 font-display text-2xl font-semibold">
          Choose your team
        </h2>

        {!me ? (
          <Card>
            <p className="text-chalk-dim">Log in to pick a team if you&apos;re playing in this season.</p>
            <Link href={`/login?next=/seasons/${season.id}`} className="mt-4 inline-block">
              <Button variant="secondary">Log in</Button>
            </Link>
          </Card>
        ) : !mine ? (
          <Card>
            <p className="text-chalk-dim">You&apos;re not playing in this season.</p>
          </Card>
        ) : !selectionOpen ? (
          <Card>
            <p className="text-chalk-dim">
              {mine.team
                ? `Team selection is closed. You're playing as ${mine.team.name}.`
                : "Team selection is closed. Ask the admin to assign you a team."}
            </p>
          </Card>
        ) : teams.length === 0 ? (
          <Card>
            <p className="text-chalk-dim">No teams are available yet. The admin needs to add some.</p>
          </Card>
        ) : (
          <TeamPicker
            seasonId={season.id}
            teams={teams}
            takenBy={takenBy}
            myTeamId={mine.team_id}
            myUserId={me.id}
          />
        )}
      </section>
    </>
  );
}

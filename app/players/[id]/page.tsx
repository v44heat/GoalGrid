import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { Avatar } from "@/components/ui/Avatar";
import { FormChips } from "@/components/standings/FormChips";
import { createClient } from "@/lib/supabase/server";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";
import { UUID_RE } from "@/lib/validation/auth";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Player" };

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { season?: string };
}) {
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const all = await getSeasonsWithFixtures(supabase);

  // Only seasons this player actually took part in.
  const { data: entries } = await supabase
    .from("season_participants")
    .select("season_id")
    .eq("user_id", params.id);
  const mine = new Set((entries ?? []).map((e) => e.season_id));
  const seasons = all.filter((s) => mine.has(s.id));
  const season = pickSeason(seasons, searchParams.season);
  if (!season) notFound();

  const fixtures = await getFixtureRows(supabase, season.id);
  const table = buildSeasonTable(fixtures);
  const me = table.rows.find((r) => r.playerId === params.id);
  if (!me) notFound();

  // Newest first, from this player's point of view.
  const history = table.played
    .filter((f) => f.home.userId === me.playerId || f.away.userId === me.playerId)
    .reverse();
  const upcoming = fixtures
    .filter(
      (f) => f.result === null && f.status !== "CANCELLED" && (f.home.userId === me.playerId || f.away.userId === me.playerId)
    )
    .slice(0, 3);

  const stats: [string, string | number][] = [
    ["Played", me.played],
    ["Won", me.won],
    ["Drawn", me.drawn],
    ["Lost", me.lost],
    ["Goals for", me.goalsFor],
    ["Goals against", me.goalsAgainst],
    ["Goal diff.", me.goalDifference > 0 ? `+${me.goalDifference}` : me.goalDifference],
    ["Points", me.points],
  ];

  return (
    <>
      <PageHeader title={me.username} description={`${season.name}${me.team ? ` · ${me.team.name}` : ""}`} />
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath={`/players/${me.playerId}`} />

      <Card className="mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={me.username} path={me.avatarPath} size={72} />
        {me.team ? (
          <TeamLogo name={me.team.name} shortName={me.team.short_name} logoUrl={me.team.logo_url} className="h-16 w-16" />
        ) : null}
        <div>
          <p className="text-sm text-chalk-dim">League position</p>
          <p className="tabular font-display text-5xl font-bold">
            {table.playedCount > 0 ? `${me.position}${me.tied ? "=" : ""}` : "-"}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-chalk-dim">Form</p>
          <FormChips form={me.form} />
        </div>
      </Card>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-turf-700 bg-turf-800/60 px-4 py-3">
            <dt className="text-sm text-chalk-dim">{label}</dt>
            <dd className="tabular font-display text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Match history</h2>
      {history.length === 0 ? (
        <p className="text-chalk-dim">No matches played yet.</p>
      ) : (
        <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
          {history.map((f) => {
            const isHome = f.home.userId === me.playerId;
            const gf = isHome ? f.result!.homeScore : f.result!.awayScore;
            const ga = isHome ? f.result!.awayScore : f.result!.homeScore;
            const outcome = gf > ga ? "W" : gf === ga ? "D" : "L";
            return (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 truncate">
                  <span className={cn(isHome && "font-semibold")}>{f.home.username}</span>{" "}
                  <span className="tabular font-display text-lg font-bold">
                    {f.result!.homeScore} - {f.result!.awayScore}
                  </span>{" "}
                  <span className={cn(!isHome && "font-semibold")}>{f.away.username}</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-chalk-faint sm:inline">{formatDate(f.scheduledDate)}</span>
                  <Badge tone={outcome === "W" ? "success" : outcome === "D" ? "neutral" : "danger"}>{outcome}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Coming up</h2>
          <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
            {upcoming.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="truncate">
                  {f.home.username} <span className="text-chalk-faint">vs</span> {f.away.username}
                </p>
                <span className="shrink-0 text-sm text-chalk-dim">{formatDate(f.scheduledDate)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link href={`/head-to-head?a=${me.playerId}`} className="text-grass underline-offset-2 hover:underline">
          Compare with another player
        </Link>
        <Link href={`/standings?season=${season.id}`} className="text-grass underline-offset-2 hover:underline">
          Back to standings
        </Link>
      </p>
    </>
  );
}

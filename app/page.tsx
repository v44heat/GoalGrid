import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { LeagueTable } from "@/components/standings/LeagueTable";
import { StatCard } from "@/components/statistics/StatCard";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { PitchMarkings } from "@/components/layout/PitchMarkings";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";
import { buildStatistics } from "@/lib/data/statistics";
import type { Leader } from "@/lib/league/statistics";
import { SEASON_LENGTH_DAYS } from "@/lib/constants";
import { formatDate, relativeDayLabel, todayInLeagueTimezone } from "@/utils/dates";

export const dynamic = "force-dynamic";

const FORMAT = [
  { label: "Players", value: "6" },
  { label: "Matchdays", value: "10" },
  { label: "Matches", value: "30" },
  { label: "Days", value: String(SEASON_LENGTH_DAYS) },
];

/** Shown before any season has fixtures. */
function Landing() {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-turf-700 bg-gradient-to-br from-turf-800 to-turf-900 px-6 py-14 sm:px-12 sm:py-20">
        <PitchMarkings className="pointer-events-none absolute -right-16 top-1/2 hidden w-[520px] -translate-y-1/2 text-grass/15 md:block" />
        <div className="relative max-w-xl">
          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            Everyone plays everyone, home and away.
          </h1>
          <p className="mt-5 max-w-md text-lg text-chalk-dim">
            One month, one table. Fixtures, results and standings for our eFootball league, always calculated from
            the scores.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/standings">
              <Button size="lg">View standings</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Join the league
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Season format" className="mt-8">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FORMAT.map((f) => (
            <div key={f.label} className="rounded-xl border border-turf-700 bg-turf-800/60 px-5 py-4">
              <dt className="text-sm text-chalk-dim">{f.label}</dt>
              <dd className="tabular font-display text-5xl font-bold text-grass">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-chalk-faint">
          Standard format for six players. Fixtures are generated from whoever joins the season.
        </p>
      </section>
    </>
  );
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <Link href={href} className="text-sm text-grass underline-offset-2 hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: { deleted?: string } }) {
  // Shown once, right after someone deletes their account (the action sends them here).
  const banner =
    searchParams.deleted === "1" ? (
      <p role="status" className="mb-6 rounded-lg border border-grass/40 bg-grass/10 px-4 py-3 text-sm">
        Your account has been deleted. Your personal data has been erased.
      </p>
    ) : null;

  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons);
  if (!season) {
    return (
      <>
        {banner}
        <Landing />
      </>
    );
  }

  const [fixtures, profile] = await Promise.all([getFixtureRows(supabase, season.id), getCurrentProfile()]);
  const table = buildSeasonTable(fixtures);
  const { stats, names } = buildStatistics(fixtures, table);

  const today = todayInLeagueTimezone();
  const finished = season.status === "COMPLETED" || season.status === "ARCHIVED";
  const anyPlayed = table.playedCount > 0;
  const pct = table.totalCount ? Math.round((table.playedCount / table.totalCount) * 100) : 0;

  const leaders = anyPlayed ? table.rows.filter((r) => r.position === 1) : [];
  const latest = table.played.slice().reverse().slice(0, 5);
  const upcoming = fixtures
    .filter((f) => f.status === "UPCOMING" && f.scheduledDate >= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.matchday - b.matchday)
    .slice(0, 5);

  const who = (l: Leader | null) => {
    if (!l) return undefined;
    const list = l.playerIds.map((id) => names.get(id) ?? "?");
    return list.length > 3 ? `${list.length} players tied` : list.join(", ");
  };
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  const avg = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

  return (
    <>
      {banner}
      <section className="relative overflow-hidden rounded-2xl border border-turf-700 bg-gradient-to-br from-turf-800 to-turf-900 px-6 py-8 sm:px-10">
        <PitchMarkings className="pointer-events-none absolute -right-10 top-1/2 hidden w-80 -translate-y-1/2 text-grass/10 md:block" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm uppercase tracking-widest text-chalk-dim">
            {season.status === "ACTIVE" ? "Current season" : finished ? "Latest season" : "Coming up"}
            <SeasonStatusBadge status={season.status} />
          </p>
          <h1 className="mt-1 font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl">
            {season.name}
          </h1>
          <p className="mt-2 text-chalk-dim">
            {formatDate(season.start_date)} to {formatDate(season.end_date)}
          </p>
          <div className="mt-5 max-w-md">
            <div className="mb-1.5 flex justify-between text-sm text-chalk-dim">
              <span>
                {table.playedCount} of {table.totalCount} matches played
              </span>
              <span className="tabular">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Season progress"
              className="h-2 overflow-hidden rounded-full bg-turf-700"
            >
              <div className="h-full rounded-full bg-grass" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="leader-heading" className="mt-6">
        <Card className={leaders.length ? "border-gold/40 bg-gold/[0.06]" : undefined}>
          <h2 id="leader-heading" className="text-sm font-medium uppercase tracking-widest text-gold">
            {finished ? "Champion" : "Current leader"}
          </h2>
          {leaders.length === 0 ? (
            <p className="mt-2 text-chalk-dim">
              {season.status === "DRAFT" ? "The season hasn't started yet." : "No matches played yet."}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {leaders.length === 1 && leaders[0].team ? (
                <TeamLogo
                  name={leaders[0].team.name}
                  shortName={leaders[0].team.short_name}
                  logoUrl={leaders[0].team.logo_url}
                  className="h-14 w-14"
                />
              ) : (
                <Trophy className="h-10 w-10 text-gold" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-4xl font-bold">
                  {leaders.map((l) => l.username).join(" & ")}
                </p>
                <p className="text-chalk-dim">
                  {leaders.length === 1 ? leaders[0].team?.name ?? "No team" : "Level at the top"}
                </p>
              </div>
              <p className="text-right">
                <span className="tabular font-display text-5xl font-bold text-gold">{leaders[0].points}</span>
                <span className="block text-sm text-chalk-dim">points</span>
              </p>
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="table-heading" className="mt-10">
        <SectionHeading title="Standings" href={`/standings?season=${season.id}`} linkLabel="Full table" />
        <h2 id="table-heading" className="sr-only">
          Standings
        </h2>
        <LeagueTable
          rows={table.rows}
          seasonId={season.id}
          currentUserId={profile?.status === "APPROVED" ? profile.id : undefined}
          anyPlayed={anyPlayed}
        />
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="latest-heading">
          <SectionHeading title="Latest results" href={`/results?season=${season.id}`} linkLabel="All results" />
          <h2 id="latest-heading" className="sr-only">
            Latest results
          </h2>
          {latest.length === 0 ? (
            <Card>
              <p className="text-chalk-dim">No results yet.</p>
            </Card>
          ) : (
            <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
              {latest.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate">
                    {f.home.username}{" "}
                    <span className="tabular font-display text-xl font-bold">
                      {f.result!.homeScore} - {f.result!.awayScore}
                    </span>{" "}
                    {f.away.username}
                  </p>
                  <span className="shrink-0 text-xs text-chalk-faint">MD {f.matchday}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="upcoming-heading">
          <SectionHeading title="Upcoming" href={`/fixtures?season=${season.id}`} linkLabel="All fixtures" />
          <h2 id="upcoming-heading" className="sr-only">
            Upcoming fixtures
          </h2>
          {upcoming.length === 0 ? (
            <Card>
              <p className="text-chalk-dim">{finished ? "The season is over." : "No upcoming fixtures."}</p>
            </Card>
          ) : (
            <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
              {upcoming.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate">
                    {f.home.username} <span className="text-chalk-faint">vs</span> {f.away.username}
                  </p>
                  <span
                    className={
                      f.scheduledDate === today
                        ? "shrink-0 text-sm font-medium text-gold"
                        : "shrink-0 text-sm text-chalk-dim"
                    }
                  >
                    {relativeDayLabel(f.scheduledDate, today)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {anyPlayed && (
        <section aria-labelledby="top-heading" className="mt-10">
          <SectionHeading title="Top performers" href={`/statistics?season=${season.id}`} linkLabel="All statistics" />
          <h2 id="top-heading" className="sr-only">
            Top performers
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Top scorer"
              value={stats.topScorer ? plural(stats.topScorer.value, "goal") : null}
              holders={who(stats.topScorer)}
            />
            <StatCard
              title="Most wins"
              value={stats.mostWins ? plural(stats.mostWins.value, "win") : null}
              holders={who(stats.mostWins)}
            />
            <StatCard
              title="Best defense"
              value={stats.bestDefense ? `${avg(stats.bestDefense.value)} per match` : null}
              holders={who(stats.bestDefense)}
              caption="Fewest goals conceded"
            />
          </div>
        </section>
      )}

      {!profile && (
        <p className="mt-10 text-center text-chalk-dim">
          Playing this season?{" "}
          <Link href="/login" className="text-grass underline-offset-2 hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="text-grass underline-offset-2 hover:underline">
            join the league
          </Link>
          .
        </p>
      )}
    </>
  );
}

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { StatCard } from "@/components/statistics/StatCard";
import { createClient } from "@/lib/supabase/server";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";
import { buildStatistics } from "@/lib/data/statistics";
import type { Leader } from "@/lib/league/statistics";
import { formatDate } from "@/utils/dates";

export const metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const avg = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export default async function StatisticsPage({ searchParams }: { searchParams: { season?: string } }) {
  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons, searchParams.season);

  const header = (
    <PageHeader
      title="Statistics"
      description={season?.name}
      actions={
        <Link href="/head-to-head">
          <Button variant="secondary">Head-to-head</Button>
        </Link>
      }
    />
  );

  if (!season) {
    return (
      <>
        {header}
        <EmptyState icon={BarChart3} title="No statistics yet" description="Statistics appear once a season has fixtures." />
      </>
    );
  }

  const fixtures = await getFixtureRows(supabase, season.id);
  const table = buildSeasonTable(fixtures);
  const { stats, names, matches } = buildStatistics(fixtures, table);
  const t = stats.totals;

  // Names for everyone sharing a record. Ties are shown, never hidden.
  const who = (l: Leader | null) => {
    if (!l) return undefined;
    const list = l.playerIds.map((id) => names.get(id) ?? "?");
    return list.length > 3 ? `${list.length} players tied` : list.join(", ");
  };
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

  const totals: [string, string | number][] = [
    ["Total matches", t.totalMatches],
    ["Matches played", t.matchesPlayed],
    ["Matches remaining", t.matchesRemaining],
    ["Total goals", t.totalGoals],
    ["Goals per match", t.matchesPlayed ? avg(t.averageGoalsPerMatch) : "-"],
  ];

  return (
    <>
      {header}
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath="/statistics" />

      <h2 className="mb-3 font-display text-2xl font-semibold">Season totals</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-turf-700 bg-turf-800/60 px-4 py-3">
            <dt className="text-sm text-chalk-dim">{label}</dt>
            <dd className="tabular font-display text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      {t.matchesPlayed === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={BarChart3}
            title="No matches played yet"
            description="Records appear as soon as the first result is recorded."
          />
        </div>
      ) : (
        <>
          <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Records</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Current leader"
              value={stats.leader ? plural(stats.leader.value, "pt") : null}
              holders={who(stats.leader)}
              caption="First place right now"
            />
            <StatCard
              title="Top scorer"
              value={stats.topScorer ? plural(stats.topScorer.value, "goal") : null}
              holders={who(stats.topScorer)}
              caption="Most goals scored in total"
            />
            <StatCard
              title="Highest scoring player"
              value={stats.highestScoringPlayer ? `${avg(stats.highestScoringPlayer.value)} per match` : null}
              holders={who(stats.highestScoringPlayer)}
              caption="Best goals-per-match average"
            />
            <StatCard
              title="Most wins"
              value={stats.mostWins ? plural(stats.mostWins.value, "win") : null}
              holders={who(stats.mostWins)}
            />
            <StatCard
              title="Most draws"
              value={stats.mostDraws ? plural(stats.mostDraws.value, "draw") : null}
              holders={who(stats.mostDraws)}
            />
            <StatCard
              title="Most losses"
              value={stats.mostLosses ? plural(stats.mostLosses.value, "loss", "losses") : null}
              holders={who(stats.mostLosses)}
            />
            <StatCard
              title="Best goal difference"
              value={stats.bestGoalDifference ? sign(stats.bestGoalDifference.value) : null}
              holders={who(stats.bestGoalDifference)}
            />
            <StatCard
              title="Best defense"
              value={stats.bestDefense ? `${avg(stats.bestDefense.value)} per match` : null}
              holders={who(stats.bestDefense)}
              caption="Fewest goals conceded per match"
            />
            <StatCard
              title="Longest winning streak"
              value={stats.longestWinStreak ? plural(stats.longestWinStreak.value, "match", "matches") : null}
              holders={who(stats.longestWinStreak)}
            />
            <StatCard
              title="Longest unbeaten streak"
              value={stats.longestUnbeatenStreak ? plural(stats.longestUnbeatenStreak.value, "match", "matches") : null}
              holders={who(stats.longestUnbeatenStreak)}
              caption="Wins and draws"
            />
            <StatCard
              title="Longest losing streak"
              value={stats.longestLosingStreak ? plural(stats.longestLosingStreak.value, "match", "matches") : null}
              holders={who(stats.longestLosingStreak)}
            />
          </div>

          {stats.highestScoringMatch && (
            <>
              <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Highest scoring match</h2>
              <Card>
                <p className="tabular font-display text-4xl font-bold text-grass">
                  {plural(stats.highestScoringMatch.value, "goal")}
                </p>
                <ul className="mt-3 divide-y divide-turf-700">
                  {stats.highestScoringMatch.matchIds.map((id) => {
                    const f = matches.get(id);
                    if (!f?.result) return null;
                    return (
                      <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>
                          {f.home.username}{" "}
                          <span className="tabular font-display text-xl font-bold">
                            {f.result.homeScore} - {f.result.awayScore}
                          </span>{" "}
                          {f.away.username}
                        </span>
                        <span className="text-sm text-chalk-dim">
                          Matchday {f.matchday} · {formatDate(f.scheduledDate)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}

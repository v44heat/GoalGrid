import { Table2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { LeagueTable } from "@/components/standings/LeagueTable";
import { TableImageButton } from "@/components/graphics/ImageButtons";
import { tableImageData } from "@/lib/data/graphics";
import { todayInLeagueTimezone } from "@/utils/dates";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";

export const metadata = { title: "Standings" };
export const dynamic = "force-dynamic";

export default async function StandingsPage({ searchParams }: { searchParams: { season?: string } }) {
  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons, searchParams.season);

  if (!season) {
    return (
      <>
        <PageHeader title="Standings" />
        <EmptyState
          icon={Table2}
          title="No table yet"
          description="The league table appears once a season has fixtures."
        />
      </>
    );
  }

  const [fixtures, profile] = await Promise.all([getFixtureRows(supabase, season.id), getCurrentProfile()]);
  const table = buildSeasonTable(fixtures);
  const pct = table.totalCount ? Math.round((table.playedCount / table.totalCount) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Standings"
        description={season.name}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <SeasonStatusBadge status={season.status} />
            <TableImageButton data={tableImageData(season.name, table, todayInLeagueTimezone())} />
          </div>
        }
      />
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath="/standings" />

      <div className="mb-4">
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

      <LeagueTable
        rows={table.rows}
        seasonId={season.id}
        currentUserId={profile?.status === "APPROVED" ? profile.id : undefined}
        anyPlayed={table.playedCount > 0}
      />
      <p className="mt-3 text-sm text-chalk-faint">
        Ranked by points, then goal difference, then goals scored. An equals sign after a position means players are
        level on all three.
      </p>
    </>
  );
}

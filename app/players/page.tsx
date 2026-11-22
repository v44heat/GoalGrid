import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { FormChips } from "@/components/standings/FormChips";
import { createClient } from "@/lib/supabase/server";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";

export const metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage({ searchParams }: { searchParams: { season?: string } }) {
  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons, searchParams.season);

  if (!season) {
    return (
      <>
        <PageHeader title="Players" />
        <EmptyState icon={Users} title="No players yet" description="Players appear once a season has fixtures." />
      </>
    );
  }

  const { rows, playedCount } = buildSeasonTable(await getFixtureRows(supabase, season.id));

  return (
    <>
      <PageHeader
        title="Players"
        description={season.name}
        actions={
          <Link href="/head-to-head">
            <Button variant="secondary">Head-to-head</Button>
          </Link>
        }
      />
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath="/players" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.playerId}>
            <Link href={`/players/${r.playerId}?season=${season.id}`} className="block">
              <Card className="transition-colors hover:border-grass/50">
                <div className="flex items-center gap-3">
                  {r.team ? (
                    <TeamLogo name={r.team.name} shortName={r.team.short_name} logoUrl={r.team.logo_url} className="h-12 w-12" />
                  ) : (
                    <span aria-hidden className="h-12 w-12 rounded-full border border-dashed border-turf-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-2xl font-semibold leading-tight">{r.username}</p>
                    <p className="truncate text-sm text-chalk-dim">{r.team?.name ?? "No team"}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-display text-3xl font-bold text-grass">{r.points}</p>
                    <p className="text-xs text-chalk-faint">pts</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-chalk-dim">
                  <span className="tabular">
                    {playedCount > 0 ? `#${r.position}${r.tied ? "=" : ""} · ` : ""}
                    {r.played}P {r.won}W {r.drawn}D {r.lost}L
                  </span>
                  <FormChips form={r.form} />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { ResultAdminRow } from "@/components/admin/ResultAdminRow";
import { createClient } from "@/lib/supabase/server";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows, groupByMatchday } from "@/lib/data/fixtures";
import { formatDate } from "@/utils/dates";

export const metadata = { title: "Manage results" };
export const dynamic = "force-dynamic";

export default async function AdminResultsPage({ searchParams }: { searchParams: { season?: string } }) {
  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons, searchParams.season);

  if (!season) {
    return (
      <>
        <PageHeader title="Results" />
        <EmptyState
          icon={ClipboardList}
          title="No fixtures yet"
          description="Generate and start a season before recording results."
          action={
            <Link href="/admin/seasons">
              <Button variant="secondary">Go to seasons</Button>
            </Link>
          }
        />
      </>
    );
  }

  const rows = await getFixtureRows(supabase, season.id);
  const groups = groupByMatchday(rows);
  const editable = season.status === "ACTIVE";
  const recorded = rows.filter((r) => r.result).length;

  return (
    <>
      <PageHeader
        title="Results"
        description={`${season.name}: ${recorded} of ${rows.length} recorded`}
        actions={<SeasonStatusBadge status={season.status} />}
      />
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath="/admin/results" />

      {!editable && (
        <p className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          {season.status === "DRAFT"
            ? "Start the season before recording results."
            : "This season is finished, so results are locked."}
        </p>
      )}

      <div className="space-y-6">
        {groups.map(({ matchday, fixtures }) => (
          <section key={matchday} className="overflow-hidden rounded-xl border border-turf-700 bg-turf-800/70">
            <h2 className="flex items-baseline justify-between border-b border-turf-700 px-4 py-3 font-display text-2xl font-semibold">
              Matchday {matchday}
              <span className="font-sans text-sm font-normal text-chalk-dim">
                {formatDate(fixtures.map((f) => f.scheduledDate).sort()[0])}
              </span>
            </h2>
            <ul className="divide-y divide-turf-700">
              {fixtures.map((f) => (
                <ResultAdminRow key={f.id} fixture={f} editable={editable} seasonName={season.name} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

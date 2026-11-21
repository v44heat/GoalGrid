import { Flag } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { SeasonSwitcher } from "@/components/seasons/SeasonSwitcher";
import { ResultsList } from "@/components/results/ResultsList";
import { createClient } from "@/lib/supabase/server";
import { getSeasonsWithFixtures, pickSeason } from "@/lib/data/season-picker";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function ResultsPage({ searchParams }: { searchParams: { season?: string } }) {
  const supabase = createClient();
  const seasons = await getSeasonsWithFixtures(supabase);
  const season = pickSeason(seasons, searchParams.season);

  if (!season) {
    return (
      <>
        <PageHeader title="Results" />
        <EmptyState icon={Flag} title="No results yet" description="Results appear once matches have been played." />
      </>
    );
  }

  const { played } = buildSeasonTable(await getFixtureRows(supabase, season.id));

  return (
    <>
      <PageHeader title="Results" description={season.name} actions={<SeasonStatusBadge status={season.status} />} />
      <SeasonSwitcher seasons={seasons} currentId={season.id} basePath="/results" />
      {played.length === 0 ? (
        <EmptyState icon={Flag} title="No results yet" description="Scores show up here as soon as the admin records them." />
      ) : (
        <ResultsList rows={played} />
      )}
    </>
  );
}

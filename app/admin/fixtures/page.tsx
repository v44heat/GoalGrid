import Link from "next/link";
import { CalendarX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { FixtureAdminRow } from "@/components/admin/FixtureAdminRow";
import { createClient } from "@/lib/supabase/server";
import { getFixtureRows, groupByMatchday } from "@/lib/data/fixtures";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import type { Season } from "@/types/database";

export const metadata = { title: "Manage fixtures" };
export const dynamic = "force-dynamic";

export default async function AdminFixturesPage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, status, created_at")
    .order("start_date", { ascending: false });
  const seasons = (data ?? []) as Season[];

  if (seasons.length === 0) {
    return (
      <>
        <PageHeader title="Fixtures" />
        <EmptyState
          icon={CalendarX}
          title="No seasons yet"
          description="Create a season first, then generate its fixtures."
          action={
            <Link href="/admin/seasons/new">
              <Button>New season</Button>
            </Link>
          }
        />
      </>
    );
  }

  const season =
    seasons.find((s) => s.id === searchParams.season) ??
    seasons.find((s) => s.status === "ACTIVE") ??
    seasons[0];

  const rows = await getFixtureRows(supabase, season.id);
  const groups = groupByMatchday(rows);

  return (
    <>
      <PageHeader
        title="Fixtures"
        description={`${season.name}: ${formatDate(season.start_date)} to ${formatDate(season.end_date)}`}
        actions={<SeasonStatusBadge status={season.status} />}
      />

      {seasons.length > 1 && (
        <nav aria-label="Season" className="mb-6 flex flex-wrap gap-2">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/admin/fixtures?season=${s.id}`}
              aria-current={s.id === season.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm",
                s.id === season.id
                  ? "border-grass bg-grass/10 text-grass"
                  : "border-turf-600 text-chalk-dim hover:text-chalk"
              )}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No fixtures yet"
          description="Generate this season's fixtures from the season page."
          action={
            <Link href={`/admin/seasons/${season.id}`}>
              <Button variant="secondary">Open season</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map(({ matchday, fixtures }) => (
            <section key={matchday} className="overflow-hidden rounded-xl border border-turf-700 bg-turf-800/70">
              <h2 className="border-b border-turf-700 px-4 py-3 font-display text-2xl font-semibold">
                Matchday {matchday}
              </h2>
              <ul className="divide-y divide-turf-700">
                {fixtures.map((f) => (
                  <FixtureAdminRow
                    key={f.id}
                    fixture={f}
                    minDate={season.start_date}
                    maxDate={season.end_date}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

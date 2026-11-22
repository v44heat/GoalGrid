import Link from "next/link";
import { CalendarX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { FixtureList } from "@/components/fixtures/FixtureList";
import { createClient } from "@/lib/supabase/server";
import { getFixtureRows, nextMatchday } from "@/lib/data/fixtures";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import type { Season } from "@/types/database";

export const metadata = { title: "Fixtures" };
export const dynamic = "force-dynamic";

// "Today" is judged in the league's own timezone, not the server's (Vercel runs in UTC).
const LEAGUE_TIMEZONE = "Africa/Nairobi";

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: { season?: string };
}) {
  const supabase = createClient();
  const [{ data: seasonData }, { data: withFixtures }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false }),
    supabase.from("fixtures").select("season_id"),
  ]);

  const hasFixtures = new Set((withFixtures ?? []).map((r) => r.season_id));
  const seasons = ((seasonData ?? []) as Season[]).filter((s) => hasFixtures.has(s.id));

  if (seasons.length === 0) {
    return (
      <>
        <PageHeader title="Fixtures" />
        <EmptyState
          icon={CalendarX}
          title="No fixtures yet"
          description="Fixtures appear here once the admin has generated them for a season."
        />
      </>
    );
  }

  const season =
    seasons.find((s) => s.id === searchParams.season) ??
    seasons.find((s) => s.status === "ACTIVE") ??
    seasons[0];

  const rows = await getFixtureRows(supabase, season.id);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: LEAGUE_TIMEZONE }).format(new Date());
  const next = season.status === "ACTIVE" ? nextMatchday(rows, today) : null;

  return (
    <>
      <PageHeader
        title="Fixtures"
        description={`${season.name}: ${formatDate(season.start_date)} to ${formatDate(season.end_date)}`}
        actions={<SeasonStatusBadge status={season.status} />}
      />

      {season.status === "DRAFT" && (
        <p className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          This season hasn't started yet. Dates may still change.
        </p>
      )}

      {seasons.length > 1 && (
        <nav aria-label="Season" className="mb-6 flex flex-wrap gap-2">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/fixtures?season=${s.id}`}
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

      <FixtureList rows={rows} today={today} nextMatchday={next} seasonName={season.name} />
    </>
  );
}

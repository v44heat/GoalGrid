import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/dates";
import type { Season } from "@/types/database";

export const metadata = { title: "Seasons" };
export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const supabase = createClient();
  const [{ data }, { data: rows }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false }),
    supabase.from("season_participants").select("season_id"),
  ]);

  const counts = new Map<string, number>();
  (rows ?? []).forEach((r) => counts.set(r.season_id, (counts.get(r.season_id) ?? 0) + 1));
  const seasons = (data ?? []) as Season[];

  return (
    <>
      <PageHeader title="Seasons" description="Every month-long league, past and present." />

      {seasons.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No seasons yet"
          description="The admin hasn't created a season. Check back soon."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {seasons.map((s) => (
            <li key={s.id}>
              <Link href={`/seasons/${s.id}`} className="block">
                <Card className="transition-colors hover:border-grass/50">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-3xl font-semibold leading-tight">{s.name}</h2>
                    <SeasonStatusBadge status={s.status} />
                  </div>
                  <p className="mt-2 text-sm text-chalk-dim">
                    {formatDate(s.start_date)} to {formatDate(s.end_date)}
                  </p>
                  <p className="mt-1 text-sm text-chalk-faint">{counts.get(s.id) ?? 0} players</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

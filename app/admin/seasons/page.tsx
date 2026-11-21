import Link from "next/link";
import { CalendarPlus, Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/utils/dates";
import type { Season } from "@/types/database";

export const metadata = { title: "Manage seasons" };
export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  const supabase = createClient();
  const [{ data: seasons }, { data: rows }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false }),
    supabase.from("season_participants").select("season_id"),
  ]);

  const counts = new Map<string, number>();
  (rows ?? []).forEach((r) => counts.set(r.season_id, (counts.get(r.season_id) ?? 0) + 1));
  const list = (seasons ?? []) as Season[];

  return (
    <>
      <PageHeader
        title="Seasons"
        actions={
          <Link href="/admin/seasons/new">
            <Button>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              New season
            </Button>
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No seasons yet"
          description="Create a season and choose who plays in it."
        />
      ) : (
        <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/seasons/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 hover:bg-turf-800"
              >
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {s.name} <SeasonStatusBadge status={s.status} />
                  </p>
                  <p className="text-sm text-chalk-dim">
                    {formatDate(s.start_date)} to {formatDate(s.end_date)}
                  </p>
                </div>
                <p className="text-sm text-chalk-dim">{counts.get(s.id) ?? 0} players</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

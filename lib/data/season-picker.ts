import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/types/database";

type Client = ReturnType<typeof createClient>;

/** Seasons that have fixtures, newest first. Draft seasons without fixtures have nothing to show. */
export async function getSeasonsWithFixtures(supabase: Client): Promise<Season[]> {
  const [{ data: seasons }, { data: rows }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false }),
    supabase.from("fixtures").select("season_id"),
  ]);
  const withFixtures = new Set((rows ?? []).map((r) => r.season_id));
  return ((seasons ?? []) as Season[]).filter((s) => withFixtures.has(s.id));
}

/** The requested season, else the active one, else the newest. */
export function pickSeason(seasons: Season[], requestedId?: string): Season | null {
  return (
    seasons.find((s) => s.id === requestedId) ??
    seasons.find((s) => s.status === "ACTIVE") ??
    seasons[0] ??
    null
  );
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getParticipants } from "@/lib/data/seasons";
import type { FixtureStatus } from "@/types/database";
import type { FixturePlayer, FixtureResult, FixtureRow } from "@/types/fixtures";

type Client = ReturnType<typeof createClient>;

export async function getFixtureCount(supabase: Client, seasonId: string): Promise<number> {
  const { count } = await supabase
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);
  return count ?? 0;
}

export async function getFixtureRows(supabase: Client, seasonId: string): Promise<FixtureRow[]> {
  const [{ data }, participants] = await Promise.all([
    supabase
      .from("fixtures")
      .select(
        "id, matchday, home_player_id, away_player_id, scheduled_date, status, match_results(home_score, away_score, recorded_at)"
      )
      .eq("season_id", seasonId)
      .order("matchday", { ascending: true })
      .order("scheduled_date", { ascending: true }),
    getParticipants(supabase, seasonId),
  ]);

  const players = new Map<string, FixturePlayer>(
    participants.map((p) => [p.user_id, { userId: p.user_id, username: p.username, team: p.team }])
  );
  const unknown = (id: string): FixturePlayer => ({ userId: id, username: "Unknown", team: null });

  type Raw = {
    id: string;
    matchday: number;
    home_player_id: string;
    away_player_id: string;
    scheduled_date: string;
    status: FixtureStatus;
    match_results: RawResult | RawResult[] | null;
  };
  type RawResult = { home_score: number; away_score: number; recorded_at: string };

  // fixture_id is UNIQUE on match_results, so PostgREST may return the result as an object or
  // as a one-item array depending on version. Accept both.
  const resultOf = (raw: Raw["match_results"]): FixtureResult | null => {
    const r = Array.isArray(raw) ? raw[0] : raw;
    return r ? { homeScore: r.home_score, awayScore: r.away_score, recordedAt: r.recorded_at } : null;
  };

  return ((data ?? []) as unknown as Raw[]).map((f) => ({
    id: f.id,
    matchday: f.matchday,
    scheduledDate: f.scheduled_date,
    status: f.status,
    home: players.get(f.home_player_id) ?? unknown(f.home_player_id),
    away: players.get(f.away_player_id) ?? unknown(f.away_player_id),
    result: resultOf(f.match_results),
  }));
}

export function groupByMatchday(rows: FixtureRow[]): { matchday: number; fixtures: FixtureRow[] }[] {
  const map = new Map<number, FixtureRow[]>();
  rows.forEach((r) => {
    const list = map.get(r.matchday) ?? [];
    list.push(r);
    map.set(r.matchday, list);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([matchday, fixtures]) => ({ matchday, fixtures }));
}

/** First matchday that still has an upcoming game on or after today. */
export function nextMatchday(rows: FixtureRow[], today: string): number | null {
  const open = rows
    .filter((r) => r.status === "UPCOMING" && r.scheduledDate >= today)
    .sort((a, b) => a.matchday - b.matchday);
  return open[0]?.matchday ?? null;
}

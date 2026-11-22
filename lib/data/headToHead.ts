import "server-only";
import { createClient } from "@/lib/supabase/server";
import { headToHead, type HeadToHead } from "@/lib/league/headToHead";

type Client = ReturnType<typeof createClient>;

export interface Meeting {
  id: string;
  seasonName: string;
  matchday: number;
  date: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
}

export interface H2HView {
  nameA: string;
  nameB: string;
  record: HeadToHead;
  meetings: Meeting[];
}

/** Everyone who has ever been in a season, for the player pickers. */
export async function getKnownPlayers(supabase: Client): Promise<{ id: string; username: string }[]> {
  const { data } = await supabase.from("season_participants").select("user_id, users(username)");
  type Raw = { user_id: string; users: { username: string } | { username: string }[] | null };
  const map = new Map<string, string>();
  ((data ?? []) as unknown as Raw[]).forEach((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    if (u) map.set(r.user_id, u.username);
  });
  return Array.from(map, ([id, username]) => ({ id, username })).sort((x, y) => x.username.localeCompare(y.username));
}

/** All-time record between two players, across every season. Both ids must be valid UUIDs. */
export async function getHeadToHead(supabase: Client, a: string, b: string, names: Map<string, string>): Promise<H2HView> {
  const { data } = await supabase
    .from("fixtures")
    .select(
      "id, matchday, scheduled_date, home_player_id, away_player_id, seasons(name), match_results(home_score, away_score)"
    )
    .or(
      `and(home_player_id.eq.${a},away_player_id.eq.${b}),and(home_player_id.eq.${b},away_player_id.eq.${a})`
    )
    .order("scheduled_date", { ascending: true })
    .order("matchday", { ascending: true });

  type Res = { home_score: number; away_score: number };
  type Raw = {
    id: string;
    matchday: number;
    scheduled_date: string;
    home_player_id: string;
    away_player_id: string;
    seasons: { name: string } | { name: string }[] | null;
    match_results: Res | Res[] | null;
  };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const meetings: Meeting[] = [];
  for (const f of (data ?? []) as unknown as Raw[]) {
    const r = one(f.match_results);
    if (!r) continue; // not played
    meetings.push({
      id: f.id,
      seasonName: one(f.seasons)?.name ?? "Season",
      matchday: f.matchday,
      date: f.scheduled_date,
      homeName: names.get(f.home_player_id) ?? "Unknown",
      awayName: names.get(f.away_player_id) ?? "Unknown",
      homeScore: r.home_score,
      awayScore: r.away_score,
    });
  }

  const raw = (data ?? []) as unknown as Raw[];
  const byId = new Map(raw.map((f) => [f.id, f]));
  const record = headToHead(
    a,
    b,
    meetings.map((m) => {
      const f = byId.get(m.id)!;
      return { id: m.id, homeId: f.home_player_id, awayId: f.away_player_id, homeScore: m.homeScore, awayScore: m.awayScore };
    })
  );

  return { nameA: names.get(a) ?? "Player A", nameB: names.get(b) ?? "Player B", record, meetings };
}

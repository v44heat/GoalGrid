import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Season, Team } from "@/types/database";
import type { ParticipantRow } from "@/types/league";

type Client = ReturnType<typeof createClient>;

export async function getSeason(supabase: Client, id: string): Promise<Season | null> {
  const { data } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, status, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Season | null) ?? null;
}

export async function getParticipants(supabase: Client, seasonId: string): Promise<ParticipantRow[]> {
  const { data } = await supabase
    .from("season_participants")
    .select(
      "id, user_id, team_id, users(username), teams(id, name, short_name, logo_url, created_at)"
    )
    .eq("season_id", seasonId);

  type Raw = {
    id: string;
    user_id: string;
    team_id: string | null;
    users: { username: string } | { username: string }[] | null;
    teams: Team | Team[] | null;
  };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  return ((data ?? []) as unknown as Raw[])
    .map((r) => ({
      id: r.id,
      user_id: r.user_id,
      team_id: r.team_id,
      username: one(r.users)?.username ?? "Unknown",
      team: one(r.teams),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function getTeams(supabase: Client): Promise<Team[]> {
  const { data } = await supabase
    .from("teams")
    .select("id, name, short_name, logo_url, created_at")
    .order("name", { ascending: true });
  return (data as Team[] | null) ?? [];
}

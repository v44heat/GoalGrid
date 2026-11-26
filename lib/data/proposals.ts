import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ApprovalItem, Proposal, ProposalStatus } from "@/types/proposals";

type Client = ReturnType<typeof createClient>;

interface RawProposal {
  id: string;
  fixture_id: string;
  submitted_by: string;
  home_score: number;
  away_score: number;
  status: ProposalStatus;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

const COLUMNS = "id, fixture_id, submitted_by, home_score, away_score, status, decision_note, created_at, decided_at";

async function usernames(supabase: Client, ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("users").select("id, username").in("id", unique);
  return new Map((data ?? []).map((u) => [u.id as string, u.username as string]));
}

function toProposal(r: RawProposal, names: Map<string, string>): Proposal {
  return {
    id: r.id,
    fixtureId: r.fixture_id,
    submittedBy: r.submitted_by,
    submittedByName: names.get(r.submitted_by) ?? "Unknown",
    homeScore: r.home_score,
    awayScore: r.away_score,
    status: r.status,
    decisionNote: r.decision_note,
    createdAt: r.created_at,
    decidedAt: r.decided_at,
  };
}

/** Proposals the signed-in player is allowed to see (their own, or about their matches). */
export async function getProposalsForFixtures(supabase: Client, fixtureIds: string[]): Promise<Proposal[]> {
  if (fixtureIds.length === 0) return [];
  const { data } = await supabase
    .from("result_proposals")
    .select(COLUMNS)
    .in("fixture_id", fixtureIds)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as RawProposal[];
  const names = await usernames(supabase, rows.map((r) => r.submitted_by));
  return rows.map((r) => toProposal(r, names));
}

/** The player's own recent submissions, any status. */
export async function getMyRecentProposals(supabase: Client, userId: string, limit = 10): Promise<Proposal[]> {
  const { data } = await supabase
    .from("result_proposals")
    .select(COLUMNS)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as RawProposal[];
  const names = await usernames(supabase, rows.map((r) => r.submitted_by));
  return rows.map((r) => toProposal(r, names));
}

export async function countPendingProposals(supabase: Client): Promise<number> {
  const { count } = await supabase
    .from("result_proposals")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");
  return count ?? 0;
}

/** Admin view: every waiting proposal with the match it is about. Oldest first. */
export async function getPendingApprovals(supabase: Client): Promise<ApprovalItem[]> {
  const { data } = await supabase
    .from("result_proposals")
    .select(COLUMNS)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as RawProposal[];
  if (rows.length === 0) return [];

  const { data: fx } = await supabase
    .from("fixtures")
    .select("id, matchday, scheduled_date, season_id, home_player_id, away_player_id")
    .in("id", rows.map((r) => r.fixture_id));
  type Fx = {
    id: string;
    matchday: number;
    scheduled_date: string;
    season_id: string;
    home_player_id: string;
    away_player_id: string;
  };
  const fixtures = new Map(((fx ?? []) as Fx[]).map((f) => [f.id, f]));

  const seasonIds = Array.from(new Set(Array.from(fixtures.values()).map((f) => f.season_id)));
  const { data: seasons } = await supabase.from("seasons").select("id, name").in("id", seasonIds);
  const seasonNames = new Map((seasons ?? []).map((s) => [s.id as string, s.name as string]));

  const names = await usernames(supabase, [
    ...rows.map((r) => r.submitted_by),
    ...Array.from(fixtures.values()).flatMap((f) => [f.home_player_id, f.away_player_id]),
  ]);

  return rows.flatMap((r) => {
    const f = fixtures.get(r.fixture_id);
    if (!f) return [];
    return [
      {
        ...toProposal(r, names),
        seasonName: seasonNames.get(f.season_id) ?? "Season",
        matchday: f.matchday,
        scheduledDate: f.scheduled_date,
        homeName: names.get(f.home_player_id) ?? "Unknown",
        awayName: names.get(f.away_player_id) ?? "Unknown",
      },
    ];
  });
}

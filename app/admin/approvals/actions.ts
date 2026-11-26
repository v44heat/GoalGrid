"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import type { ActionState } from "@/types/actions";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };
const validScore = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

function refresh() {
  ["/admin/approvals", "/admin", "/admin/results", "/admin/audit", "/account", "/standings", "/results", "/fixtures", "/players", "/"].forEach(
    (p) => revalidatePath(p)
  );
}

function explain(message: string): string {
  if (message.includes("PROPOSAL_NOT_PENDING")) {
    return "That score was already decided, withdrawn or replaced by a result you entered.";
  }
  if (message.includes("PROPOSAL_NOT_FOUND")) return "Score not found.";
  if (message.includes("SEASON_NOT_ACTIVE")) return "Results can only be recorded while the season is active.";
  if (message.includes("FIXTURE_CANCELLED")) return "This match is cancelled. Set it back to upcoming first.";
  if (message.includes("INVALID_SCORE")) return "Scores must be whole numbers from 0 to 99.";
  return "";
}

/** Approve a player's score. The admin may change the numbers first; the audit log keeps both. */
export async function approveProposalAction(
  proposalId: string,
  homeScore: number,
  awayScore: number
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(proposalId)) return { ok: false, error: "Invalid request." };
  if (!validScore(homeScore) || !validScore(awayScore)) {
    return { ok: false, error: "Scores must be whole numbers from 0 to 99." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("approve_result_proposal", {
    p_proposal_id: proposalId,
    p_home: homeScore,
    p_away: awayScore,
  });
  if (error) {
    const known = explain(error.message);
    if (known) return { ok: false, error: known };
    console.error("approveProposal failed:", error.message);
    return { ok: false, error: "Couldn't approve the score. Try again." };
  }

  refresh();
  return { ok: true, message: "Score approved and recorded." };
}

export async function rejectProposalAction(proposalId: string, note: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(proposalId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const { error } = await supabase.rpc("reject_result_proposal", {
    p_proposal_id: proposalId,
    p_note: typeof note === "string" ? note.slice(0, 300) : null,
  });
  if (error) {
    const known = explain(error.message);
    if (known) return { ok: false, error: known };
    console.error("rejectProposal failed:", error.message);
    return { ok: false, error: "Couldn't reject the score. Try again." };
  }

  refresh();
  return { ok: true, message: "Score rejected." };
}

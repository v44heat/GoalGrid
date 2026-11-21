"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import type { ActionState } from "@/types/actions";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };

function refresh() {
  ["/admin/results", "/admin/fixtures", "/standings", "/results", "/fixtures", "/players"].forEach((p) =>
    revalidatePath(p)
  );
  revalidatePath("/players/[id]", "page");
}

const validScore = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/** Records a result, or corrects an existing one (a fixture can only ever have one result). */
export async function saveResultAction(
  fixtureId: string,
  homeScore: number,
  awayScore: number
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(fixtureId)) return { ok: false, error: "Invalid request." };
  if (!validScore(homeScore) || !validScore(awayScore)) {
    return { ok: false, error: "Scores must be whole numbers from 0 to 99." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("record_match_result", {
    p_fixture_id: fixtureId,
    p_home: homeScore,
    p_away: awayScore,
  });

  if (error) {
    const m = error.message;
    if (m.includes("FIXTURE_NOT_FOUND")) return { ok: false, error: "Fixture not found." };
    if (m.includes("SEASON_NOT_ACTIVE")) {
      return { ok: false, error: "Results can only be recorded while the season is active." };
    }
    if (m.includes("FIXTURE_CANCELLED")) {
      return { ok: false, error: "This fixture is cancelled. Set it back to upcoming first." };
    }
    if (m.includes("INVALID_SCORE")) return { ok: false, error: "Scores must be whole numbers from 0 to 99." };
    console.error("saveResult failed:", m);
    return { ok: false, error: "Couldn't save the result. Try again." };
  }

  refresh();
  return { ok: true, message: data === "UPDATED" ? "Result updated." : "Result saved." };
}

/** Deletes a result. The fixture returns to upcoming and the table recalculates. */
export async function deleteResultAction(fixtureId: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(fixtureId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const { error } = await supabase.rpc("delete_match_result", { p_fixture_id: fixtureId });
  if (error) {
    const m = error.message;
    if (m.includes("RESULT_NOT_FOUND")) return { ok: false, error: "There's no result to delete." };
    if (m.includes("FIXTURE_NOT_FOUND")) return { ok: false, error: "Fixture not found." };
    if (m.includes("SEASON_NOT_ACTIVE")) {
      return { ok: false, error: "Results can only be changed while the season is active." };
    }
    console.error("deleteResult failed:", m);
    return { ok: false, error: "Couldn't delete the result. Try again." };
  }

  refresh();
  return { ok: true, message: "Result deleted." };
}

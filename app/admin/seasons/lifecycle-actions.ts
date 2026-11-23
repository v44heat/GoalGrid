"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { getSeason } from "@/lib/data/seasons";
import { UUID_RE } from "@/lib/validation/auth";
import type { ActionState } from "@/types/actions";
import type { SeasonStatus } from "@/types/database";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };

function refresh(seasonId: string) {
  [
    `/admin/seasons/${seasonId}`,
    "/admin/seasons",
    "/admin/results",
    "/admin/fixtures",
    "/",
    "/seasons",
    "/standings",
    "/results",
    "/fixtures",
    "/statistics",
    "/hall-of-fame",
  ].forEach((p) => revalidatePath(p));
  revalidatePath(`/seasons/${seasonId}`);
}

async function move(
  seasonId: string,
  from: SeasonStatus,
  to: SeasonStatus,
  done: (name: string) => string,
  wrongState: string
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const season = await getSeason(supabase, seasonId);
  if (!season) return { ok: false, error: "Season not found." };
  if (season.status !== from) return { ok: false, error: wrongState };

  // The .eq("status", from) makes this a compare-and-set: two admins clicking at once can't both win.
  const { data, error } = await supabase
    .from("seasons")
    .update({ status: to })
    .eq("id", seasonId)
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another season is already active. Complete it first." };
    }
    if (error.message.includes("INVALID_SEASON_TRANSITION")) {
      return { ok: false, error: wrongState };
    }
    console.error(`season ${from}->${to} failed:`, error.message);
    return { ok: false, error: "Couldn't update the season. Try again." };
  }
  if (!data) return { ok: false, error: wrongState };

  refresh(seasonId);
  return { ok: true, message: done(season.name) };
}

/** ACTIVE -> COMPLETED. Results lock, the champion is crowned, the season enters the Hall of Fame. */
export async function completeSeasonAction(seasonId: string): Promise<ActionState> {
  return move(seasonId, "ACTIVE", "COMPLETED", (n) => `${n} is complete.`, "Only an active season can be completed.");
}

/** COMPLETED -> ARCHIVED. */
export async function archiveSeasonAction(seasonId: string): Promise<ActionState> {
  return move(seasonId, "COMPLETED", "ARCHIVED", (n) => `${n} archived.`, "Only a completed season can be archived.");
}

/** COMPLETED -> ACTIVE: an escape hatch if a season was completed by mistake. */
export async function reopenSeasonAction(seasonId: string): Promise<ActionState> {
  return move(seasonId, "COMPLETED", "ACTIVE", (n) => `${n} is active again.`, "Only a completed season can be reopened.");
}

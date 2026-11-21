"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import { TEAM_SELECTION_STATUS } from "@/types/league";
import type { ActionState } from "@/types/actions";

/**
 * A player picks their own club. Players have no write access to the database,
 * so every rule is checked here and the write uses the service role afterwards.
 * The UNIQUE(season_id, team_id) constraint is the final guard against races.
 */
export async function selectTeamAction(
  seasonId: string,
  teamId: string
): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") {
    return { ok: false, error: "Log in to pick a team." };
  }
  if (!UUID_RE.test(seasonId) || !UUID_RE.test(teamId)) {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const db = createAdminClient();

    const { data: season } = await db
      .from("seasons")
      .select("status")
      .eq("id", seasonId)
      .maybeSingle();
    if (!season) return { ok: false, error: "Season not found." };
    if (season.status !== TEAM_SELECTION_STATUS) {
      return { ok: false, error: "Team selection is closed. Ask the admin to change your team." };
    }

    const { data: me } = await db
      .from("season_participants")
      .select("id")
      .eq("season_id", seasonId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!me) return { ok: false, error: "You're not a participant in this season." };

    const { data: team } = await db.from("teams").select("id, name").eq("id", teamId).maybeSingle();
    if (!team) return { ok: false, error: "That team doesn't exist." };

    const { data: taken } = await db
      .from("season_participants")
      .select("id, user_id")
      .eq("season_id", seasonId)
      .eq("team_id", teamId)
      .maybeSingle();
    if (taken && taken.user_id !== profile.id) {
      return { ok: false, error: `${team.name} has already been picked by another player.` };
    }

    const { error } = await db
      .from("season_participants")
      .update({ team_id: teamId })
      .eq("id", me.id);
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: `${team.name} was just picked by another player.` };
      }
      console.error("selectTeam failed:", error.message);
      return { ok: false, error: "Couldn't save your team. Try again." };
    }

    revalidatePath(`/seasons/${seasonId}`);
    revalidatePath(`/admin/seasons/${seasonId}`);
    return { ok: true, message: `You're playing as ${team.name}.` };
  } catch (err) {
    console.error("selectTeam failed:", err);
    return { ok: false, error: "Couldn't save your team. Try again." };
  }
}

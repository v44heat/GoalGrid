"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import { validateSeasonName } from "@/lib/validation/league";
import { isValidIsoDate } from "@/utils/dates";
import type { ActionState } from "@/types/actions";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };

export async function createSeasonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const userIds = Array.from(new Set(formData.getAll("participants").map(String)));

  const fieldErrors: Record<string, string> = {};
  const nErr = validateSeasonName(name);
  if (nErr) fieldErrors.name = nErr;
  if (!isValidIsoDate(startDate)) fieldErrors.start_date = "Pick a valid start date.";
  if (userIds.length < 2) fieldErrors.participants = "Select at least 2 players.";
  else if (!userIds.every((id) => UUID_RE.test(id))) fieldErrors.participants = "Invalid player selection.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  // The end date is always start + 29 days (a 30-day season); it is never taken from the form.
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_season_with_participants", {
    p_name: name,
    p_start: startDate,
    p_user_ids: userIds,
  });

  if (error || !data) {
    const msg = error?.message ?? "";
    if (msg.includes("TOO_FEW_PARTICIPANTS")) {
      return { ok: false, fieldErrors: { participants: "Select at least 2 players." } };
    }
    if (msg.includes("PARTICIPANT_NOT_APPROVED")) {
      return { ok: false, fieldErrors: { participants: "Only approved players can join a season." } };
    }
    console.error("createSeason failed:", msg);
    return { ok: false, error: "Couldn't create the season. Try again." };
  }

  revalidatePath("/seasons");
  revalidatePath("/admin/seasons");
  redirect(`/admin/seasons/${data as string}?created=1`);
}

async function loadSeasonStatus(
  supabase: ReturnType<typeof createClient>,
  seasonId: string
): Promise<string | null> {
  const { data } = await supabase.from("seasons").select("status").eq("id", seasonId).maybeSingle();
  return data?.status ?? null;
}

export async function addParticipantAction(
  seasonId: string,
  userId: string
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId) || !UUID_RE.test(userId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const status = await loadSeasonStatus(supabase, seasonId);
  if (!status) return { ok: false, error: "Season not found." };
  if (status !== "DRAFT") {
    return { ok: false, error: "Players can only be added while the season is a draft." };
  }

  const { data: user } = await supabase.from("users").select("status").eq("id", userId).maybeSingle();
  if (!user || user.status !== "APPROVED") {
    return { ok: false, error: "Only approved players can join a season." };
  }

  const { error } = await supabase
    .from("season_participants")
    .insert({ season_id: seasonId, user_id: userId });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That player is already in this season." };
    if (error.message.includes("FIXTURES_EXIST")) {
      return { ok: false, error: "Fixtures exist. Discard them before changing the players." };
    }
    console.error("addParticipant failed:", error.message);
    return { ok: false, error: "Couldn't add the player. Try again." };
  }

  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}`);
  return { ok: true, message: "Player added." };
}

export async function removeParticipantAction(
  seasonId: string,
  userId: string
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId) || !UUID_RE.test(userId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const status = await loadSeasonStatus(supabase, seasonId);
  if (!status) return { ok: false, error: "Season not found." };
  if (status !== "DRAFT") {
    return { ok: false, error: "Players can only be removed while the season is a draft." };
  }

  const { error } = await supabase
    .from("season_participants")
    .delete()
    .eq("season_id", seasonId)
    .eq("user_id", userId);
  if (error) {
    if (error.message.includes("FIXTURES_EXIST")) {
      return { ok: false, error: "Fixtures exist. Discard them before changing the players." };
    }
    console.error("removeParticipant failed:", error.message);
    return { ok: false, error: "Couldn't remove the player. Try again." };
  }

  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}`);
  return { ok: true, message: "Player removed." };
}

/** Admin override: set or reset (null) a participant's team. Allowed until the season is completed. */
export async function assignTeamAction(
  seasonId: string,
  userId: string,
  teamId: string | null
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (
    !UUID_RE.test(seasonId) ||
    !UUID_RE.test(userId) ||
    (teamId !== null && !UUID_RE.test(teamId))
  ) {
    return { ok: false, error: "Invalid request." };
  }

  const supabase = createClient();
  const status = await loadSeasonStatus(supabase, seasonId);
  if (!status) return { ok: false, error: "Season not found." };
  if (status === "COMPLETED" || status === "ARCHIVED") {
    return { ok: false, error: "This season is finished, so teams can't change." };
  }

  const { data, error } = await supabase
    .from("season_participants")
    .update({ team_id: teamId })
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another player in this season already has that team." };
    }
    console.error("assignTeam failed:", error.message);
    return { ok: false, error: "Couldn't change the team. Try again." };
  }
  if (!data) return { ok: false, error: "Participant not found." };

  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath(`/seasons/${seasonId}`);
  return { ok: true, message: teamId ? "Team assigned." : "Team reset." };
}

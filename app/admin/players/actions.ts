"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import type { ActionState } from "@/types/actions";
import type { UserStatus } from "@/types/database";

type PlayerAction = "approve" | "suspend" | "reactivate";

const TARGET_STATUS: Record<PlayerAction, UserStatus> = {
  approve: "APPROVED",
  suspend: "SUSPENDED",
  reactivate: "APPROVED",
};

const PAST_TENSE: Record<PlayerAction, string> = {
  approve: "approved",
  suspend: "suspended",
  reactivate: "reactivated",
};

export async function changePlayerStatus(
  userId: string,
  action: PlayerAction
): Promise<ActionState> {
  // Authorisation happens here, on the server, on every call.
  const admin = await getApprovedAdmin();
  if (!admin) return { ok: false, error: "You don't have permission to do that." };

  if (!UUID_RE.test(userId) || !(action in TARGET_STATUS)) {
    return { ok: false, error: "Invalid request." };
  }
  if (userId === admin.id) {
    return { ok: false, error: "You can't change your own account." };
  }

  // Uses the signed-in admin's own client, so Row Level Security enforces the rule too.
  const supabase = createClient();

  const { data: target } = await supabase
    .from("users")
    .select("id, username, role, status")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Player not found." };
  if (target.role === "ADMIN") {
    return { ok: false, error: "Admin accounts can't be changed here." };
  }

  const { data: updated, error } = await supabase
    .from("users")
    .update({ status: TARGET_STATUS[action] })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    if (error) console.error("changePlayerStatus failed:", error.message);
    return { ok: false, error: "Couldn't update the player. Try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/players");
  return { ok: true, message: `${target.username} ${PAST_TENSE[action]}.` };
}

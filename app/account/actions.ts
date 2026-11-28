"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { UUID_RE, validatePassword } from "@/lib/validation/auth";
import { AVATAR_MAX_BYTES, isJpeg } from "@/lib/avatar/process";
import { isDeleteConfirmed } from "@/lib/validation/account";
import type { ActionState } from "@/types/actions";

const LOGIN_FIRST: ActionState = { ok: false, error: "Log in to do that." };
const BUCKET = "avatars";

const validScore = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/**
 * A player proposes the score of one of THEIR matches. Nothing counts until an admin approves it.
 * The database enforces the same rules (row level security), so this is a friendly first line.
 */
export async function submitScoreAction(
  fixtureId: string,
  homeScore: number,
  awayScore: number
): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;
  if (!UUID_RE.test(fixtureId)) return { ok: false, error: "Invalid request." };
  if (!validScore(homeScore) || !validScore(awayScore)) {
    return { ok: false, error: "Scores must be whole numbers from 0 to 99." };
  }

  const supabase = createClient();
  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, status, season_id, home_player_id, away_player_id")
    .eq("id", fixtureId)
    .maybeSingle();
  if (!fixture) return { ok: false, error: "Match not found." };
  if (fixture.home_player_id !== profile.id && fixture.away_player_id !== profile.id) {
    return { ok: false, error: "You can only report your own matches." };
  }
  if (fixture.status === "PLAYED") return { ok: false, error: "This match already has a result." };
  if (fixture.status === "CANCELLED") return { ok: false, error: "This match was cancelled." };

  const { data: season } = await supabase.from("seasons").select("status").eq("id", fixture.season_id).maybeSingle();
  if (!season || season.status !== "ACTIVE") {
    return { ok: false, error: "Scores can only be reported while the season is active." };
  }

  const { error } = await supabase.from("result_proposals").insert({
    fixture_id: fixtureId,
    submitted_by: profile.id,
    home_score: homeScore,
    away_score: awayScore,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A score is already waiting for approval for this match." };
    }
    if (error.code === "42501" || /row-level security/i.test(error.message)) {
      return { ok: false, error: "You can't report a score for this match right now." };
    }
    console.error("submitScore failed:", error.message);
    return { ok: false, error: "Couldn't submit the score. Try again." };
  }

  revalidatePath("/account");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
  return { ok: true, message: "Score submitted. The admin will review it." };
}

/** Withdraw your own pending score so you can submit a corrected one. */
export async function cancelProposalAction(proposalId: string): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;
  if (!UUID_RE.test(proposalId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("result_proposals")
    .update({ status: "CANCELLED" })
    .eq("id", proposalId)
    .eq("submitted_by", profile.id)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("cancelProposal failed:", error.message);
    return { ok: false, error: "Couldn't withdraw the score. Try again." };
  }
  if (!data) return { ok: false, error: "That score is no longer waiting for approval." };

  revalidatePath("/account");
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
  return { ok: true, message: "Score withdrawn." };
}

/** Change your own password. Re-checks the current one, then signs out every other device. */
export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!current) fieldErrors.current = "Enter your current password.";
  const nErr = validatePassword(next);
  if (nErr) fieldErrors.next = nErr;
  else if (next === current) fieldErrors.next = "Choose a password you haven't used just now.";
  else if (next !== confirm) fieldErrors.confirm = "Passwords do not match.";
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return LOGIN_FIRST;

    // Anyone who finds an unlocked phone could otherwise change the password, so check the old one.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (reauthError) {
      return { ok: false, fieldErrors: { current: "That isn't your current password." } };
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      if (/different|same/i.test(error.message)) {
        return { ok: false, fieldErrors: { next: "Choose a password you haven't used just now." } };
      }
      console.error("changePassword failed:", error.message);
      return { ok: false, error: "Couldn't change your password. Try again." };
    }

    // Best effort: end every other session, keep this one.
    await supabase.auth.signOut({ scope: "others" });
  } catch (err) {
    console.error("changePassword failed:", err);
    return { ok: false, error: "Couldn't change your password. Try again." };
  }

  return { ok: true, message: "Password changed. Your other devices have been signed out." };
}

/** Upload a profile picture. The browser has already cropped it to a small square JPEG. */
export async function uploadAvatarAction(formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a picture first." };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "That picture is too large." };

  // Don't trust the label the browser attached: look at the actual bytes.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return { ok: false, error: "That isn't a valid picture." };

  const supabase = createClient();
  const path = `${profile.id}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (uploadError) {
    console.error("avatar upload failed:", uploadError.message);
    return { ok: false, error: "Couldn't upload the picture. Try again." };
  }

  const { error: saveError } = await supabase.rpc("set_my_avatar", { p_path: path });
  if (saveError) {
    console.error("avatar save failed:", saveError.message);
    await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan behind
    return { ok: false, error: "Couldn't save the picture. Try again." };
  }

  if (profile.avatar_path) await supabase.storage.from(BUCKET).remove([profile.avatar_path]); // tidy up the old one

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile picture updated." };
}

export async function removeAvatarAction(): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;

  const supabase = createClient();
  const { error } = await supabase.rpc("set_my_avatar", { p_path: null });
  if (error) {
    console.error("avatar remove failed:", error.message);
    return { ok: false, error: "Couldn't remove the picture. Try again." };
  }
  if (profile.avatar_path) await supabase.storage.from(BUCKET).remove([profile.avatar_path]);

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile picture removed." };
}

/**
 * Permanently delete the signed-in player's account.
 *
 * Order matters. Everything that can be checked is checked first (nothing has changed yet if one fails).
 * Then the login account is deleted; a database trigger erases the personal data in the SAME transaction,
 * so it either all happens or none of it does. See supabase/migrations/0008_account_deletion.sql.
 */
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "APPROVED") return LOGIN_FIRST;

  const password = String(formData.get("password") ?? "");
  const fieldErrors: Record<string, string> = {};
  if (!isDeleteConfirmed(formData.get("confirm"))) fieldErrors.confirm = "Type DELETE in capital letters to confirm.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return LOGIN_FIRST;

  // Deleting is permanent, so prove it is really you (an unlocked phone is not enough).
  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (reauthError) return { ok: false, fieldErrors: { password: "That password is not correct." } };

  try {
    const admin = createAdminClient();

    // The league must always keep at least one working admin. (The database enforces this too.)
    if (profile.role === "ADMIN") {
      const { count } = await admin
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "ADMIN")
        .eq("status", "APPROVED")
        .is("deleted_at", null)
        .neq("id", profile.id);
      if ((count ?? 0) === 0) {
        return {
          ok: false,
          error: "You are the only admin, so you cannot delete your account. Make another player an admin first.",
        };
      }
    }

    // Remove the picture files first: the personal data most worth erasing. Nothing else has changed yet.
    await supabase.rpc("set_my_avatar", { p_path: null });
    const { data: files } = await admin.storage.from(BUCKET).list(profile.id, { limit: 100 });
    if (files && files.length > 0) {
      await admin.storage.from(BUCKET).remove(files.map((f) => `${profile.id}/${f.name}`));
    }

    // The point of no return. The trigger erases the player in the same transaction.
    const { error: deleteError } = await admin.auth.admin.deleteUser(profile.id);
    if (deleteError) {
      console.error("deleteAccount failed:", deleteError.message);
      return { ok: false, error: "We could not delete your account, and nothing was changed. Try again." };
    }
  } catch (err) {
    console.error("deleteAccount failed:", err);
    return { ok: false, error: "We could not delete your account. Try again." };
  }

  // The session belongs to a user that no longer exists; clear the cookies and leave.
  try {
    await supabase.auth.signOut();
  } catch {
    // already gone
  }
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}

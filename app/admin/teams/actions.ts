"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { UUID_RE } from "@/lib/validation/auth";
import {
  LOGO_TYPES,
  validateLogoFile,
  validateShortName,
  validateTeamName,
} from "@/lib/validation/league";
import type { ActionState } from "@/types/actions";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };
const BUCKET = "team-logos";

function pickFile(formData: FormData): File | null {
  const f = formData.get("logo");
  return f instanceof File && f.size > 0 ? f : null;
}

async function uploadLogo(
  supabase: ReturnType<typeof createClient>,
  file: File
): Promise<{ url?: string; error?: string }> {
  const problem = validateLogoFile(file);
  if (problem) return { error: problem };

  const path = `${crypto.randomUUID()}.${LOGO_TYPES[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("logo upload failed:", error.message);
    return { error: "Couldn't upload the logo. Try again." };
  }
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function createTeamAction(formData: FormData): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;

  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("short_name") ?? "").trim().toUpperCase();
  const fieldErrors: Record<string, string> = {};
  const nErr = validateTeamName(name);
  if (nErr) fieldErrors.name = nErr;
  const sErr = validateShortName(shortName);
  if (sErr) fieldErrors.short_name = sErr;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const supabase = createClient();
  let logoUrl: string | null = null;
  const file = pickFile(formData);
  if (file) {
    const res = await uploadLogo(supabase, file);
    if (res.error) return { ok: false, fieldErrors: { logo: res.error } };
    logoUrl = res.url ?? null;
  }

  const { error } = await supabase
    .from("teams")
    .insert({ name, short_name: shortName, logo_url: logoUrl });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, fieldErrors: { name: "A team with that name already exists." } };
    }
    console.error("createTeam failed:", error.message);
    return { ok: false, error: "Couldn't add the team. Try again." };
  }

  revalidatePath("/admin/teams");
  return { ok: true, message: `${name} added.` };
}

export async function updateTeamAction(formData: FormData): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("short_name") ?? "").trim().toUpperCase();
  const removeLogo = formData.get("remove_logo") === "on";
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid request." };

  const fieldErrors: Record<string, string> = {};
  const nErr = validateTeamName(name);
  if (nErr) fieldErrors.name = nErr;
  const sErr = validateShortName(shortName);
  if (sErr) fieldErrors.short_name = sErr;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const supabase = createClient();
  const update: { name: string; short_name: string; logo_url?: string | null } = {
    name,
    short_name: shortName,
  };

  const file = pickFile(formData);
  if (file) {
    const res = await uploadLogo(supabase, file);
    if (res.error) return { ok: false, fieldErrors: { logo: res.error } };
    update.logo_url = res.url ?? null;
  } else if (removeLogo) {
    update.logo_url = null;
  }

  const { data, error } = await supabase
    .from("teams")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, fieldErrors: { name: "A team with that name already exists." } };
    }
    console.error("updateTeam failed:", error.message);
    return { ok: false, error: "Couldn't save the team. Try again." };
  }
  if (!data) return { ok: false, error: "Team not found." };

  revalidatePath("/admin/teams");
  revalidatePath("/seasons", "layout");
  return { ok: true, message: `${name} saved.` };
}

export async function deleteTeamAction(teamId: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(teamId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "This team is used in a season, so it can't be removed." };
    }
    console.error("deleteTeam failed:", error.message);
    return { ok: false, error: "Couldn't remove the team. Try again." };
  }

  revalidatePath("/admin/teams");
  return { ok: true, message: "Team removed." };
}

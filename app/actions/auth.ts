"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  safeNextPath,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/validation/auth";
import type { ActionState } from "@/types/actions";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

const MAX_PENDING_REGISTRATIONS = 30;

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = text(formData, "username");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  const uErr = validateUsername(username);
  if (uErr) fieldErrors.username = uErr;
  const eErr = validateEmail(email);
  if (eErr) fieldErrors.email = eErr;
  const pErr = validatePassword(password);
  if (pErr) fieldErrors.password = pErr;
  else if (password !== confirm) fieldErrors.confirm = "Passwords do not match.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  try {
    const admin = createAdminClient();

    // Anyone can reach this form, so cap the approval queue. A private league never needs
    // dozens of waiting accounts; if the cap is hit it is almost certainly spam.
    const { count: waiting } = await admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING");
    if ((waiting ?? 0) >= MAX_PENDING_REGISTRATIONS) {
      return {
        ok: false,
        error: "Registrations are paused because too many accounts are waiting. Ask the league admin.",
      };
    }

    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("username_lower", username.toLowerCase())
      .maybeSingle();
    if (existing) {
      return { ok: false, fieldErrors: { username: "That username is taken." } };
    }

    // email_confirm: true because the admin approval step is the real gate,
    // and it avoids depending on Supabase's limited free-tier email sending.
    // The database trigger forces role = PLAYER and status = PENDING.
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return {
          ok: false,
          fieldErrors: { email: "An account with this email already exists." },
        };
      }
      console.error("registerAction createUser failed:", error.message);
      return { ok: false, error: "We couldn't create your account. Try again." };
    }
  } catch (err) {
    console.error("registerAction failed:", err);
    return { ok: false, error: "We couldn't create your account. Try again." };
  }

  return {
    ok: true,
    message: "Account created. The league admin needs to approve it before you can log in.",
  };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = text(formData, "username");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!username || !password) {
    return { ok: false, error: "Enter your username and password." };
  }

  const invalid: ActionState = { ok: false, error: "Incorrect username or password." };
  let status: string;

  try {
    const admin = createAdminClient();

    // Usernames are what people type; Supabase Auth signs in with the email behind them.
    const { data: profile } = await admin
      .from("users")
      .select("id, status")
      .eq("username_lower", username.toLowerCase())
      .maybeSingle();
    if (!profile) return invalid;

    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (!email) return invalid;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return invalid;

    status = profile.status;
    if (status !== "APPROVED") {
      await supabase.auth.signOut();
      return {
        ok: false,
        error:
          status === "PENDING"
            ? "Your account is waiting for admin approval."
            : "Your account has been suspended. Ask the league admin.",
      };
    }
  } catch (err) {
    console.error("loginAction failed:", err);
    return { ok: false, error: "We couldn't log you in. Try again." };
  }

  redirect(next);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

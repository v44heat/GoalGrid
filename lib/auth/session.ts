import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/database";

const hasEnv = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

/** The signed-in user's profile row, or null. Cached per request. */
export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  if (!hasEnv()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, username, role, status, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return (data as UserProfile | null) ?? null;
});

/** For pages: redirects unless the visitor is signed in AND approved. */
export async function requireUser(): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "APPROVED") {
    redirect(`/login?reason=${profile.status.toLowerCase()}`);
  }
  return profile;
}

/** For pages: redirects unless the visitor is an approved admin. */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireUser();
  if (profile.role !== "ADMIN") redirect("/");
  return profile;
}

/** For server actions: returns the admin profile, or null (never redirects). */
export async function getApprovedAdmin(): Promise<UserProfile | null> {
  const profile = await getCurrentProfile();
  if (profile && profile.role === "ADMIN" && profile.status === "APPROVED") {
    return profile;
  }
  return null;
}

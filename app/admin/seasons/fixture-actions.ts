"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { getParticipants, getSeason } from "@/lib/data/seasons";
import { getFixtureCount } from "@/lib/data/fixtures";
import { generateFixtures, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/fixtures/generate";
import { UUID_RE } from "@/lib/validation/auth";
import { addDays } from "@/utils/dates";
import type { ActionState } from "@/types/actions";

const DENIED: ActionState = { ok: false, error: "You don't have permission to do that." };

function refresh(seasonId: string) {
  revalidatePath(`/admin/seasons/${seasonId}`);
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  revalidatePath("/seasons", "layout");
}

export async function generateFixturesAction(seasonId: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const season = await getSeason(supabase, seasonId);
  if (!season) return { ok: false, error: "Season not found." };
  if (season.status !== "DRAFT") {
    return { ok: false, error: "Fixtures can only be generated while the season is a draft." };
  }
  if ((await getFixtureCount(supabase, seasonId)) > 0) {
    return { ok: false, error: "Fixtures have already been generated for this season." };
  }

  // Same ordering as the preview (participants are sorted by username), so what you
  // reviewed is exactly what gets saved.
  const participants = await getParticipants(supabase, seasonId);
  if (participants.length < MIN_PLAYERS) {
    return { ok: false, error: "A season needs at least 2 players." };
  }
  if (participants.length > MAX_PLAYERS) {
    return { ok: false, error: `A 30-day season fits at most ${MAX_PLAYERS} players.` };
  }

  const payload = generateFixtures(participants.map((p) => p.user_id)).map((f) => ({
    matchday: f.matchday,
    home: f.home,
    away: f.away,
    scheduled_date: addDays(season.start_date, f.dayOffset),
  }));

  const { data, error } = await supabase.rpc("generate_season_fixtures", {
    p_season_id: seasonId,
    p_fixtures: payload,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("FIXTURES_EXIST") || msg.includes("unique_pairing_per_season")) {
      return { ok: false, error: "Fixtures have already been generated for this season." };
    }
    if (msg.includes("SEASON_NOT_DRAFT")) {
      return { ok: false, error: "Fixtures can only be generated while the season is a draft." };
    }
    if (msg.includes("TOO_FEW_PARTICIPANTS")) {
      return { ok: false, error: "A season needs at least 2 players." };
    }
    console.error("generateFixtures failed:", msg);
    return { ok: false, error: "Couldn't generate the fixtures. Try again." };
  }

  refresh(seasonId);
  await audit({ action: "fixtures.generate", entity: "fixture", seasonId, summary: `Generated ${data as number} fixtures`, details: { count: data as number } });
  return { ok: true, message: `${data as number} fixtures generated.` };
}

/** Throws the generated list away so players or dates can be changed. Draft seasons only. */
export async function discardFixturesAction(seasonId: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const season = await getSeason(supabase, seasonId);
  if (!season) return { ok: false, error: "Season not found." };
  if (season.status !== "DRAFT") {
    return { ok: false, error: "Fixtures can't be discarded once the season has started." };
  }

  const { error } = await supabase.from("fixtures").delete().eq("season_id", seasonId);
  if (error) {
    console.error("discardFixtures failed:", error.message);
    return { ok: false, error: "Couldn't discard the fixtures. Try again." };
  }

  refresh(seasonId);
  await audit({ action: "fixtures.discard", entity: "fixture", seasonId, summary: "Discarded all fixtures" });
  return { ok: true, message: "Fixtures discarded." };
}

export async function startSeasonAction(seasonId: string): Promise<ActionState> {
  if (!(await getApprovedAdmin())) return DENIED;
  if (!UUID_RE.test(seasonId)) return { ok: false, error: "Invalid request." };

  const supabase = createClient();
  const season = await getSeason(supabase, seasonId);
  if (!season) return { ok: false, error: "Season not found." };
  if (season.status !== "DRAFT") return { ok: false, error: "This season has already started." };

  if ((await getFixtureCount(supabase, seasonId)) === 0) {
    return { ok: false, error: "Generate the fixtures before starting the season." };
  }

  const participants = await getParticipants(supabase, seasonId);
  const without = participants.filter((p) => !p.team_id);
  if (without.length > 0) {
    return {
      ok: false,
      error: `Every player needs a team first. Still waiting on: ${without.map((p) => p.username).join(", ")}.`,
    };
  }

  const { data, error } = await supabase
    .from("seasons")
    .update({ status: "ACTIVE" })
    .eq("id", seasonId)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another season is already active. Complete it before starting this one." };
    }
    console.error("startSeason failed:", error.message);
    return { ok: false, error: "Couldn't start the season. Try again." };
  }
  if (!data) return { ok: false, error: "This season has already started." };

  refresh(seasonId);
  revalidatePath("/");
  await audit({
    action: "season.active",
    entity: "season",
    entityId: seasonId,
    summary: `${season.name} has started`,
    details: { from: "DRAFT", to: "ACTIVE" },
  });
  return { ok: true, message: `${season.name} has started.` };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApprovedAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { UUID_RE } from "@/lib/validation/auth";
import { isValidIsoDate } from "@/utils/dates";
import { ADMIN_FIXTURE_STATUSES } from "@/types/fixtures";
import type { ActionState } from "@/types/actions";
import type { FixtureStatus } from "@/types/database";

/** Reschedule a fixture and/or change its status (upcoming, postponed, cancelled). */
export async function updateFixtureAction(
  fixtureId: string,
  scheduledDate: string,
  status: string
): Promise<ActionState> {
  if (!(await getApprovedAdmin())) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  if (!UUID_RE.test(fixtureId)) return { ok: false, error: "Invalid request." };
  if (!isValidIsoDate(scheduledDate)) return { ok: false, error: "Pick a valid date." };
  if (!(ADMIN_FIXTURE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = createClient();
  const { data: fixture } = await supabase
    .from("fixtures")
    .select("id, season_id, status, scheduled_date, matchday, home_player_id, away_player_id")
    .eq("id", fixtureId)
    .maybeSingle();
  if (!fixture) return { ok: false, error: "Fixture not found." };
  if (fixture.status === "PLAYED") {
    return { ok: false, error: "This match has a result. Correct the result instead." };
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("start_date, end_date, status")
    .eq("id", fixture.season_id)
    .maybeSingle();
  if (!season) return { ok: false, error: "Season not found." };
  if (season.status === "COMPLETED" || season.status === "ARCHIVED") {
    return { ok: false, error: "This season is finished, so fixtures can't change." };
  }
  if (scheduledDate < season.start_date || scheduledDate > season.end_date) {
    return { ok: false, error: "The date must be inside the season." };
  }

  const { data, error } = await supabase
    .from("fixtures")
    .update({ scheduled_date: scheduledDate, status: status as FixtureStatus })
    .eq("id", fixtureId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("updateFixture failed:", error.message);
    return { ok: false, error: "Couldn't update the fixture. Try again." };
  }
  if (!data) return { ok: false, error: "Fixture not found." };

  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  const changes: string[] = [];
  if (fixture.scheduled_date !== scheduledDate) changes.push(`date ${fixture.scheduled_date} to ${scheduledDate}`);
  if (fixture.status !== status) changes.push(`status ${fixture.status.toLowerCase()} to ${status.toLowerCase()}`);
  if (changes.length > 0) {
    const { data: names } = await supabase
      .from("users")
      .select("id, username")
      .in("id", [fixture.home_player_id, fixture.away_player_id]);
    const name = (id: string) => names?.find((u) => u.id === id)?.username ?? "?";
    await audit({
      action: "fixture.update",
      entity: "fixture",
      entityId: fixtureId,
      seasonId: fixture.season_id,
      summary: `Matchday ${fixture.matchday} ${name(fixture.home_player_id)} vs ${name(fixture.away_player_id)}: ${changes.join(", ")}`,
      details: { old_date: fixture.scheduled_date, new_date: scheduledDate, old_status: fixture.status, new_status: status },
    });
  }
  return { ok: true, message: "Fixture updated." };
}

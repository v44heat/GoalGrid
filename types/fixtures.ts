import type { FixtureStatus, Team } from "@/types/database";

export interface FixturePlayer {
  userId: string;
  username: string;
  team: Team | null;
}

export interface FixtureRow {
  id: string;
  matchday: number;
  scheduledDate: string;
  status: FixtureStatus;
  home: FixturePlayer;
  away: FixturePlayer;
}

/** Editable statuses. PLAYED is set only by recording a result (Phase 5). */
export const ADMIN_FIXTURE_STATUSES = ["UPCOMING", "POSTPONED", "CANCELLED"] as const;

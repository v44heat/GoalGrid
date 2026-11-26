import type { FixtureStatus, Team } from "@/types/database";

export interface FixturePlayer {
  userId: string;
  username: string;
  avatarPath: string | null;
  team: Team | null;
}

export interface FixtureResult {
  homeScore: number;
  awayScore: number;
  recordedAt: string;
}

export interface FixtureRow {
  id: string;
  matchday: number;
  scheduledDate: string;
  status: FixtureStatus;
  home: FixturePlayer;
  away: FixturePlayer;
  /** null until a result is recorded */
  result: FixtureResult | null;
}

/** Editable statuses. PLAYED is set only by recording a result (Phase 5). */
export const ADMIN_FIXTURE_STATUSES = ["UPCOMING", "POSTPONED", "CANCELLED"] as const;

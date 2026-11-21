import type { Season, Team } from "@/types/database";

export interface ParticipantRow {
  id: string;
  user_id: string;
  team_id: string | null;
  username: string;
  team: Team | null;
}

export type SeasonWithCount = Season & { participant_count: number };

/** Selection is open only while a season is still a draft. */
export const TEAM_SELECTION_STATUS = "DRAFT" as const;

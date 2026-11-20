export type UserRole = "ADMIN" | "PLAYER";
export type UserStatus = "PENDING" | "APPROVED" | "SUSPENDED";
export type SeasonStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type FixtureStatus = "UPCOMING" | "PLAYED" | "POSTPONED" | "CANCELLED";

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  created_at: string;
}

export interface SeasonParticipant {
  id: string;
  season_id: string;
  user_id: string;
  team_id: string | null;
}

export interface Fixture {
  id: string;
  season_id: string;
  matchday: number;
  home_player_id: string;
  away_player_id: string;
  scheduled_date: string;
  status: FixtureStatus;
}

export interface MatchResult {
  id: string;
  fixture_id: string;
  home_score: number;
  away_score: number;
  recorded_at: string;
  updated_at: string;
}

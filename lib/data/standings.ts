import "server-only";
import { calculateStandings, type StandingRow, type StandingsMatch } from "@/lib/league/standings";
import type { Team } from "@/types/database";
import type { FixtureRow } from "@/types/fixtures";

export interface TableRow extends StandingRow {
  username: string;
  avatarPath: string | null;
  team: Team | null;
}

export interface SeasonTable {
  rows: TableRow[];
  /** Fixtures with a recorded result, oldest first. */
  played: FixtureRow[];
  playedCount: number;
  totalCount: number;
}

/**
 * Builds the league table from a season's fixtures and their results. Nothing here is
 * stored: every call recomputes from the results, so a corrected or deleted result is
 * reflected immediately.
 */
export function buildSeasonTable(fixtures: FixtureRow[]): SeasonTable {
  const players = new Map<string, { username: string; avatarPath: string | null; team: Team | null }>();
  fixtures.forEach((f) => {
    players.set(f.home.userId, { username: f.home.username, avatarPath: f.home.avatarPath, team: f.home.team });
    players.set(f.away.userId, { username: f.away.username, avatarPath: f.away.avatarPath, team: f.away.team });
  });

  const played = fixtures
    .filter((f) => f.result !== null)
    .sort(
      (a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate) ||
        a.matchday - b.matchday ||
        (a.result!.recordedAt).localeCompare(b.result!.recordedAt)
    );

  const matches: StandingsMatch[] = played.map((f) => ({
    homeId: f.home.userId,
    awayId: f.away.userId,
    homeScore: f.result!.homeScore,
    awayScore: f.result!.awayScore,
  }));

  const standings = calculateStandings(
    Array.from(players.entries()).map(([id, p]) => ({ id, name: p.username })),
    matches
  );

  return {
    rows: standings.map((s) => ({
      ...s,
      username: s.name,
      avatarPath: players.get(s.playerId)?.avatarPath ?? null,
      team: players.get(s.playerId)?.team ?? null,
    })),
    played,
    playedCount: played.length,
    totalCount: fixtures.length,
  };
}

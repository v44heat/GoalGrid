// Turns page data into the plain objects the client-side image renderers need.
import type { Team } from "@/types/database";
import type { FixtureRow } from "@/types/fixtures";
import type {
  FixturesImageData,
  MatchCardData,
  SummaryCardData,
  TableImageData,
  TeamArt,
} from "@/types/graphics";
import type { SeasonTable } from "@/lib/data/standings";

export function toTeamArt(t: Team | null): TeamArt | null {
  return t ? { name: t.name, shortName: t.short_name, logoUrl: t.logo_url } : null;
}

export function matchCardData(seasonName: string, f: FixtureRow): MatchCardData | null {
  if (!f.result) return null;
  return {
    seasonName,
    matchday: f.matchday,
    home: { player: f.home.username, team: toTeamArt(f.home.team) },
    away: { player: f.away.username, team: toTeamArt(f.away.team) },
    homeScore: f.result.homeScore,
    awayScore: f.result.awayScore,
    dateIso: f.scheduledDate,
  };
}

export function tableImageData(seasonName: string, table: SeasonTable, generatedOnIso: string): TableImageData {
  return {
    seasonName,
    generatedOnIso,
    anyPlayed: table.playedCount > 0,
    rows: table.rows.map((r) => ({
      position: r.position,
      tied: r.tied,
      player: r.username,
      team: toTeamArt(r.team),
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalDifference: r.goalDifference,
      points: r.points,
    })),
  };
}

export function fixturesImageData(seasonName: string, matchday: number, fixtures: FixtureRow[]): FixturesImageData {
  return {
    seasonName,
    matchday,
    fixtures: fixtures.map((f) => ({
      home: { player: f.home.username, team: toTeamArt(f.home.team) },
      away: { player: f.away.username, team: toTeamArt(f.away.team) },
      dateIso: f.scheduledDate,
      score: f.result ? `${f.result.homeScore} - ${f.result.awayScore}` : null,
      note: f.status === "POSTPONED" ? "POSTPONED" : f.status === "CANCELLED" ? "CANCELLED" : null,
    })),
  };
}

/**
 * The champion is the single player in first place. If nobody has played, or several players are
 * level on points, goal difference and goals scored, there is no single champion to put on a card.
 */
export function summaryData(seasonName: string, table: SeasonTable): SummaryCardData | null {
  if (table.playedCount === 0) return null;
  const first = table.rows.filter((r) => r.position === 1);
  if (first.length !== 1) return null;
  const c = first[0];
  return {
    seasonName,
    champion: {
      player: c.username,
      team: toTeamArt(c.team),
      played: c.played,
      won: c.won,
      drawn: c.drawn,
      lost: c.lost,
      goalsFor: c.goalsFor,
      points: c.points,
    },
    runnersUp: table.rows
      .filter((r) => r.position > 1)
      .slice(0, 2)
      .map((r) => ({ position: r.position, player: r.username, team: toTeamArt(r.team), points: r.points })),
  };
}

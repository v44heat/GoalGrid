import "server-only";
import { calculateStatistics, type SeasonStatistics } from "@/lib/league/statistics";
import type { SeasonTable } from "@/lib/data/standings";
import type { FixtureRow } from "@/types/fixtures";

export interface StatsView {
  stats: SeasonStatistics;
  names: Map<string, string>;
  matches: Map<string, FixtureRow>;
}

export function buildStatistics(fixtures: FixtureRow[], table: SeasonTable): StatsView {
  const stats = calculateStatistics(
    table.rows,
    table.played.map((f) => ({
      id: f.id,
      homeId: f.home.userId,
      awayId: f.away.userId,
      homeScore: f.result!.homeScore,
      awayScore: f.result!.awayScore,
    })),
    fixtures.length,
    fixtures.filter((f) => f.status === "CANCELLED").length
  );
  return {
    stats,
    names: new Map(table.rows.map((r) => [r.playerId, r.username])),
    matches: new Map(fixtures.map((f) => [f.id, f])),
  };
}

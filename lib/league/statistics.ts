// Pure season statistics. No imports on purpose (see scripts/verify-statistics.mjs).
// Everything is derived from standings rows and the played matches; nothing is stored.

export interface StatRow {
  playerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

/** Played matches in chronological order (the order drives the streaks). */
export interface StatMatch {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
}

/** A record and everyone who shares it. Ties are reported, never hidden. */
export interface Leader {
  value: number;
  playerIds: string[];
}

export interface SeasonStatistics {
  leader: Leader | null; // value = points
  topScorer: Leader | null; // most goals scored in total
  highestScoringPlayer: Leader | null; // best goals-per-match average
  mostWins: Leader | null;
  mostDraws: Leader | null;
  mostLosses: Leader | null;
  bestGoalDifference: Leader | null;
  bestDefense: Leader | null; // fewest goals conceded per match
  longestWinStreak: Leader | null;
  longestUnbeatenStreak: Leader | null;
  longestLosingStreak: Leader | null;
  highestScoringMatch: { value: number; matchIds: string[] } | null; // value = total goals
  totals: {
    totalMatches: number;
    matchesPlayed: number;
    matchesRemaining: number;
    totalGoals: number;
    averageGoalsPerMatch: number;
  };
}

function leadersBy(
  rows: StatRow[],
  valueOf: (r: StatRow) => number,
  mode: "max" | "min",
  allowZero: boolean
): Leader | null {
  const active = rows.filter((r) => r.played > 0);
  if (active.length === 0) return null;
  const values = active.map(valueOf);
  const best = mode === "max" ? Math.max(...values) : Math.min(...values);
  if (!allowZero && best === 0) return null; // e.g. "most wins: 0" is not a record worth showing
  return {
    value: best,
    playerIds: active.filter((r) => valueOf(r) === best).map((r) => r.playerId),
  };
}

/** Longest run of matches for one player where `counts` holds. */
export function longestRun(
  playerId: string,
  matches: StatMatch[],
  counts: (goalsFor: number, goalsAgainst: number) => boolean
): number {
  let best = 0;
  let current = 0;
  for (const m of matches) {
    let gf: number;
    let ga: number;
    if (m.homeId === playerId) {
      gf = m.homeScore;
      ga = m.awayScore;
    } else if (m.awayId === playerId) {
      gf = m.awayScore;
      ga = m.homeScore;
    } else continue;
    current = counts(gf, ga) ? current + 1 : 0;
    if (current > best) best = current;
  }
  return best;
}

function streakLeader(
  rows: StatRow[],
  matches: StatMatch[],
  counts: (gf: number, ga: number) => boolean
): Leader | null {
  const per = rows.map((r) => ({ id: r.playerId, run: longestRun(r.playerId, matches, counts) }));
  const best = Math.max(0, ...per.map((p) => p.run));
  if (best === 0) return null;
  return { value: best, playerIds: per.filter((p) => p.run === best).map((p) => p.id) };
}

export function calculateStatistics(
  rows: StatRow[],
  matches: StatMatch[],
  totalFixtures: number,
  cancelledFixtures: number
): SeasonStatistics {
  const anyPlayed = rows.some((r) => r.played > 0);

  const leaderRows = anyPlayed ? rows.filter((r) => r.position === 1) : [];
  const leader: Leader | null = leaderRows.length
    ? { value: leaderRows[0].points, playerIds: leaderRows.map((r) => r.playerId) }
    : null;

  let highest: SeasonStatistics["highestScoringMatch"] = null;
  for (const m of matches) {
    const total = m.homeScore + m.awayScore;
    if (!highest || total > highest.value) highest = { value: total, matchIds: [m.id] };
    else if (total === highest.value) highest.matchIds.push(m.id);
  }

  const totalMatches = Math.max(0, totalFixtures - cancelledFixtures);
  const totalGoals = matches.reduce((s, m) => s + m.homeScore + m.awayScore, 0);

  return {
    leader,
    topScorer: leadersBy(rows, (r) => r.goalsFor, "max", false),
    highestScoringPlayer: leadersBy(rows, (r) => r.goalsFor / r.played, "max", false),
    mostWins: leadersBy(rows, (r) => r.won, "max", false),
    mostDraws: leadersBy(rows, (r) => r.drawn, "max", false),
    mostLosses: leadersBy(rows, (r) => r.lost, "max", false),
    bestGoalDifference: leadersBy(rows, (r) => r.goalDifference, "max", true),
    bestDefense: leadersBy(rows, (r) => r.goalsAgainst / r.played, "min", true),
    longestWinStreak: streakLeader(rows, matches, (gf, ga) => gf > ga),
    longestUnbeatenStreak: streakLeader(rows, matches, (gf, ga) => gf >= ga),
    longestLosingStreak: streakLeader(rows, matches, (gf, ga) => gf < ga),
    highestScoringMatch: highest,
    totals: {
      totalMatches,
      matchesPlayed: matches.length,
      matchesRemaining: Math.max(0, totalMatches - matches.length),
      totalGoals,
      averageGoalsPerMatch: matches.length ? totalGoals / matches.length : 0,
    },
  };
}

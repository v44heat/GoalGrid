// Pure double round-robin generator. No imports on purpose, so it can be unit-checked
// with plain Node (see scripts/verify-fixtures.mjs).

export interface GeneratedFixture {
  matchday: number; // 1-based
  /** Days after the season's start date (0 = day 1). */
  dayOffset: number;
  home: string;
  away: string;
}

export const SEASON_DAYS = 30;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 14;

/**
 * Matchdays are spread from day 1 to day 28, leaving days 29 and 30 free as a
 * catch-up buffer for postponed games. For 10 matchdays this gives days 1, 4, 7 ... 28.
 */
const LAST_MATCHDAY_OFFSET = 27;

interface Pair {
  home: string;
  away: string;
}

/**
 * Circle method. With an odd number of players one player rests each round (a "bye").
 * Leg 1 plays every pairing once; leg 2 repeats the same rounds with home and away reversed.
 * The result is deterministic for a given input order, so a preview and the later
 * confirmed generation are always identical.
 */
export function generateFixtures(playerIds: string[]): GeneratedFixture[] {
  const ids = Array.from(new Set(playerIds));
  if (ids.length < MIN_PLAYERS) throw new Error("At least 2 players are needed.");
  if (ids.length > MAX_PLAYERS) throw new Error(`At most ${MAX_PLAYERS} players fit in a 30-day season.`);

  const slots: (string | null)[] = [...ids];
  if (slots.length % 2 === 1) slots.push(null); // bye
  const n = slots.length;

  const leg1: Pair[][] = [];
  let ring = [...slots];
  for (let r = 0; r < n - 1; r++) {
    const round: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate venues so nobody is stuck at home or away for long.
      const flip = (i === 0 ? r : r + i) % 2 === 1;
      round.push(flip ? { home: b, away: a } : { home: a, away: b });
    }
    leg1.push(round);
    // Keep ring[0] fixed and rotate everyone else one place.
    ring = [ring[0], ring[n - 1], ...ring.slice(1, n - 1)];
  }

  const leg2 = leg1.map((round) => round.map((p) => ({ home: p.away, away: p.home })));
  const rounds = [...leg1, ...leg2];
  const total = rounds.length;

  const out: GeneratedFixture[] = [];
  rounds.forEach((round, k) => {
    const dayOffset = total === 1 ? 0 : Math.round((k * LAST_MATCHDAY_OFFSET) / (total - 1));
    round.forEach((p) => out.push({ matchday: k + 1, dayOffset, home: p.home, away: p.away }));
  });
  return out;
}

export function summarise(fixtures: GeneratedFixture[]) {
  const matchdays = new Set(fixtures.map((f) => f.matchday)).size;
  return { matches: fixtures.length, matchdays };
}

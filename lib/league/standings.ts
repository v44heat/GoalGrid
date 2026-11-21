// Pure standings calculator. No imports on purpose, so it can be checked with plain Node
// (see scripts/verify-standings.mjs). Standings are NEVER stored: they are recomputed from
// the recorded results every time, so editing or deleting a result is always reflected.

export type FormResult = "W" | "D" | "L";

export interface StandingsPlayer {
  id: string;
  name: string;
}

/** A played match. Pass matches in chronological order: that order drives the form guide. */
export interface StandingsMatch {
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  playerId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Competition ranking: players level on every criterion share a position (1, 2, 2, 4). */
  position: number;
  tied: boolean;
  /** Most recent results, oldest first, e.g. ["W", "W", "D", "W", "L"]. */
  form: FormResult[];
}

export const DEFAULT_POINTS = { win: 3, draw: 1, loss: 0 } as const;
export const FORM_LENGTH = 5;

export function calculateStandings(
  players: StandingsPlayer[],
  matches: StandingsMatch[],
  points: { win: number; draw: number; loss: number } = DEFAULT_POINTS
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const p of players) {
    rows.set(p.id, {
      playerId: p.id,
      name: p.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
      tied: false,
      form: [],
    });
  }

  const apply = (row: StandingRow, gf: number, ga: number) => {
    row.played += 1;
    row.goalsFor += gf;
    row.goalsAgainst += ga;
    if (gf > ga) {
      row.won += 1;
      row.points += points.win;
      row.form.push("W");
    } else if (gf === ga) {
      row.drawn += 1;
      row.points += points.draw;
      row.form.push("D");
    } else {
      row.lost += 1;
      row.points += points.loss;
      row.form.push("L");
    }
  };

  for (const m of matches) {
    const home = rows.get(m.homeId);
    const away = rows.get(m.awayId);
    if (!home || !away) continue; // not a participant of this season
    apply(home, m.homeScore, m.awayScore);
    apply(away, m.awayScore, m.homeScore);
  }

  const list = Array.from(rows.values());
  for (const r of list) {
    r.goalDifference = r.goalsFor - r.goalsAgainst;
    r.form = r.form.slice(-FORM_LENGTH);
  }

  // Ranking: points, then goal difference, then goals scored. Name only orders the display
  // of players who are level on all three; it never breaks the tie.
  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name)
  );

  const level = (a: StandingRow, b: StandingRow) =>
    a.points === b.points && a.goalDifference === b.goalDifference && a.goalsFor === b.goalsFor;

  list.forEach((row, i) => {
    row.position = i > 0 && level(list[i - 1], row) ? list[i - 1].position : i + 1;
  });
  list.forEach((row) => {
    row.tied = list.filter((o) => o.position === row.position).length > 1;
  });

  return list;
}

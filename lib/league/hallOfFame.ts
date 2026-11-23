// Pure Hall of Fame builder. No imports on purpose (see scripts/verify-hall-of-fame.mjs).
// Everything is derived from each finished season's final standings; nothing is stored.

export interface HofRow {
  playerId: string;
  name: string;
  teamName: string | null;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface HofSeason {
  seasonId: string;
  seasonName: string;
  startDate: string;
  rows: HofRow[];
}

export interface HistoryEntry {
  seasonId: string;
  seasonName: string;
  startDate: string;
  /** Exactly one player in first place. */
  champion: { playerId: string; name: string; teamName: string | null; points: number } | null;
  /** Several players level in first place: no single champion, no title awarded. */
  sharedFirst: string[];
}

export interface TitleEntry {
  playerId: string;
  name: string;
  titles: number;
  seasons: string[];
}

export interface PlayerRecord {
  playerId: string;
  name: string;
  seasons: number;
  titles: number;
  bestFinish: number;
  bestFinishCount: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface HallOfFame {
  history: HistoryEntry[];
  titles: TitleEntry[];
  players: PlayerRecord[];
}

export function buildHallOfFame(seasons: HofSeason[]): HallOfFame {
  const history: HistoryEntry[] = [];
  const titles = new Map<string, TitleEntry>();
  const players = new Map<string, PlayerRecord>();

  // Newest first for display.
  const ordered = [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));

  for (const s of ordered) {
    const anyPlayed = s.rows.some((r) => r.played > 0);
    const first = anyPlayed ? s.rows.filter((r) => r.position === 1) : [];

    const entry: HistoryEntry = {
      seasonId: s.seasonId,
      seasonName: s.seasonName,
      startDate: s.startDate,
      champion: null,
      sharedFirst: [],
    };

    if (first.length === 1) {
      const c = first[0];
      entry.champion = { playerId: c.playerId, name: c.name, teamName: c.teamName, points: c.points };
      const t = titles.get(c.playerId) ?? { playerId: c.playerId, name: c.name, titles: 0, seasons: [] };
      t.titles += 1;
      t.seasons.push(s.seasonName);
      titles.set(c.playerId, t);
    } else if (first.length > 1) {
      entry.sharedFirst = first.map((r) => r.name);
    }
    history.push(entry);

    if (!anyPlayed) continue; // a season with no matches says nothing about anyone

    for (const r of s.rows) {
      const p =
        players.get(r.playerId) ??
        ({
          playerId: r.playerId,
          name: r.name,
          seasons: 0,
          titles: 0,
          bestFinish: Number.POSITIVE_INFINITY,
          bestFinishCount: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
        } as PlayerRecord);

      p.seasons += 1;
      p.played += r.played;
      p.won += r.won;
      p.drawn += r.drawn;
      p.lost += r.lost;
      p.goalsFor += r.goalsFor;
      p.goalsAgainst += r.goalsAgainst;
      p.points += r.points;
      if (r.position < p.bestFinish) {
        p.bestFinish = r.position;
        p.bestFinishCount = 1;
      } else if (r.position === p.bestFinish) {
        p.bestFinishCount += 1;
      }
      players.set(r.playerId, p);
    }
  }

  for (const [id, t] of titles) {
    const p = players.get(id);
    if (p) p.titles = t.titles;
  }

  return {
    history,
    titles: Array.from(titles.values()).sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name)),
    players: Array.from(players.values()).sort(
      (a, b) =>
        b.titles - a.titles ||
        a.bestFinish - b.bestFinish ||
        b.points - a.points ||
        a.name.localeCompare(b.name)
    ),
  };
}

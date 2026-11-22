// Pure head-to-head record between two players. No imports on purpose.

export interface H2HMatch {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
}

export interface H2HMeeting {
  id: string;
  /** Goals from the point of view of players A and B, whoever was at home. */
  aGoals: number;
  bGoals: number;
  winner: "A" | "B" | "D";
}

export interface HeadToHead {
  played: number;
  aWins: number;
  bWins: number;
  draws: number;
  aGoals: number;
  bGoals: number;
  meetings: H2HMeeting[];
}

/** Only matches between exactly these two players count. Input order is preserved. */
export function headToHead(a: string, b: string, matches: H2HMatch[]): HeadToHead {
  const out: HeadToHead = { played: 0, aWins: 0, bWins: 0, draws: 0, aGoals: 0, bGoals: 0, meetings: [] };
  if (a === b) return out;

  for (const m of matches) {
    let aGoals: number;
    let bGoals: number;
    if (m.homeId === a && m.awayId === b) {
      aGoals = m.homeScore;
      bGoals = m.awayScore;
    } else if (m.homeId === b && m.awayId === a) {
      aGoals = m.awayScore;
      bGoals = m.homeScore;
    } else continue;

    out.played += 1;
    out.aGoals += aGoals;
    out.bGoals += bGoals;
    const winner = aGoals > bGoals ? "A" : aGoals < bGoals ? "B" : "D";
    if (winner === "A") out.aWins += 1;
    else if (winner === "B") out.bWins += 1;
    else out.draws += 1;
    out.meetings.push({ id: m.id, aGoals, bGoals, winner });
  }
  return out;
}

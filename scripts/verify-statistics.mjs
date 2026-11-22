// Run with: npm run verify:statistics   (needs Node 22.6+)
import { calculateStandings } from "../lib/league/standings.ts";
import { calculateStatistics, longestRun } from "../lib/league/statistics.ts";
import { headToHead } from "../lib/league/headToHead.ts";

let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
};
const P = (...n) => n.map((x) => ({ id: x, name: x }));
let nextId = 0;
const M = (h, a, hs, as) => ({ id: `m${nextId++}`, homeId: h, awayId: a, homeScore: hs, awayScore: as });
const stats = (ids, matches, total = matches.length, cancelled = 0) =>
  calculateStatistics(calculateStandings(P(...ids), matches), matches, total, cancelled);

// --- A small hand-checked season ---
{
  // Chronological. V = Vincy, K = Kevin, B = Brian
  const matches = [
    M("V", "K", 4, 2), // V win
    M("B", "V", 1, 1), // draw
    M("K", "B", 0, 3), // B win
    M("V", "B", 2, 0), // V win
    M("K", "V", 0, 1), // V win
    M("B", "K", 5, 1), // B win
  ];
  const s = stats(["V", "K", "B"], matches, 6);

  // V: W D W W -> 10pts; B: D W W ... computed independently below
  check(s.leader && s.leader.playerIds.join() === "V" && s.leader.value === 10, `leader ${JSON.stringify(s.leader)}`);
  check(s.topScorer.value === 9 && s.topScorer.playerIds.join() === "B", `top scorer ${JSON.stringify(s.topScorer)}`);
  check(s.mostWins.value === 3 && s.mostWins.playerIds.join() === "V", "most wins V=3");
  check(s.mostDraws.value === 1 && s.mostDraws.playerIds.length === 2, "draws: V and B tie on 1 and are both reported");
  check(s.mostLosses.value === 4 && s.mostLosses.playerIds.join() === "K", "K lost 4? K played 4: L L L L");
  // V: W D W W, so the draw resets the run and V's longest win streak is 2. B's best is 1 (D W L W).
  check(s.longestWinStreak.value === 2 && s.longestWinStreak.playerIds.join() === "V", `win streak ${JSON.stringify(s.longestWinStreak)}`);
  check(s.longestUnbeatenStreak.value === 4 && s.longestUnbeatenStreak.playerIds.join() === "V", "V unbeaten 4 (W D W W)");
  check(s.longestLosingStreak.value === 4 && s.longestLosingStreak.playerIds.join() === "K", "K lost 4 in a row");
  check(s.highestScoringMatch.value === 6 && s.highestScoringMatch.matchIds.length === 2, "two matches with 6 goals (V 4-2 K, B 5-1 K)");
  check(s.totals.totalGoals === 4 + 2 + 1 + 1 + 0 + 3 + 2 + 0 + 0 + 1 + 5 + 1, "total goals");
  check(s.totals.matchesPlayed === 6 && s.totals.matchesRemaining === 0 && Math.abs(s.totals.averageGoalsPerMatch - 20 / 6) < 1e-9, "season totals");
  // V: GF 8 GA 3 = +5. B: GF 9 GA 4 = +5. Level, so both are reported.
  check(s.bestGoalDifference.value === 5 && s.bestGoalDifference.playerIds.slice().sort().join() === "B,V", `best GD ${JSON.stringify(s.bestGoalDifference)}`);
}

// --- Remaining / cancelled accounting ---
{
  const matches = [M("A", "B", 1, 0), M("B", "A", 2, 2)];
  const s = stats(["A", "B"], matches, 10, 2);
  check(s.totals.totalMatches === 8, "cancelled fixtures are not counted as matches");
  check(s.totals.matchesPlayed === 2 && s.totals.matchesRemaining === 6, "remaining = total - played");
}

// --- Nothing played yet: no leaders, no records ---
{
  const s = stats(["A", "B", "C"], [], 6);
  check(s.leader === null && s.topScorer === null && s.bestDefense === null && s.highestScoringMatch === null, "empty season has no records");
  check(s.longestWinStreak === null, "no streaks yet");
  check(s.totals.averageGoalsPerMatch === 0 && s.totals.matchesRemaining === 6, "empty totals");
}

// --- Streak behaviour ---
{
  const mk = (res) => res.map(([a, b]) => M("P", "Q", a, b));
  check(longestRun("P", mk([[1, 0], [2, 0], [0, 0], [3, 1], [1, 0], [4, 0]]), (f, a) => f > a) === 3, "win streak resets after a draw: 3");
  check(longestRun("P", mk([[1, 0], [2, 0], [0, 0], [3, 1], [1, 0], [4, 0]]), (f, a) => f >= a) === 6, "unbeaten counts wins and draws: 6");
  check(longestRun("P", mk([[0, 1], [0, 1], [2, 2], [0, 1]]), (f, a) => f < a) === 2, "losing streak");
  // matches not involving P are ignored and do not break a streak
  const withOthers = [M("P", "Q", 1, 0), M("X", "Y", 0, 5), M("P", "Q", 2, 0)];
  check(longestRun("P", withOthers, (f, a) => f > a) === 2, "other players' matches do not break the streak");
}

// --- Ties are reported for every record holder ---
{
  const s = stats(["A", "B", "C"], [M("A", "C", 2, 0), M("B", "C", 2, 0)], 3);
  check(s.topScorer.playerIds.length === 2 && s.topScorer.value === 2, "A and B tie as top scorer");
  check(s.mostLosses.playerIds.join() === "C", "C most losses");
}

// --- Best defence is per match, so fewer games don't unfairly win ---
{
  // A: played 1, conceded 0 (0.0/match). B: played 2, conceded 1 (0.5/match)
  const s = stats(["A", "B", "C"], [M("A", "C", 1, 0), M("B", "C", 1, 1), M("C", "B", 0, 0)], 3);
  const a = s.bestDefense;
  check(a.value === 0 && a.playerIds.includes("A"), `best defence ${JSON.stringify(a)}`);
}

// --- Head to head ---
{
  const ms = [
    M("V", "K", 4, 2), // V
    M("K", "V", 1, 1), // D
    M("V", "B", 9, 0), // not V-K
    M("K", "V", 3, 0), // K
    M("V", "K", 2, 0), // V
  ];
  const h = headToHead("V", "K", ms);
  check(h.played === 4 && h.aWins === 2 && h.bWins === 1 && h.draws === 1, `h2h record ${JSON.stringify(h)}`);
  check(h.aGoals === 4 + 1 + 0 + 2 && h.bGoals === 2 + 1 + 3 + 0, "h2h goals oriented per player");
  const flipped = headToHead("K", "V", ms);
  check(flipped.aWins === 1 && flipped.bWins === 2 && flipped.aGoals === h.bGoals, "swapping players swaps the record");
  check(h.meetings.map((m) => m.winner).join("") === "ADBA", "meetings keep order and winners");
  check(headToHead("V", "V", ms).played === 0, "a player has no record against themselves");
}

// --- Property test: streaks never exceed matches played; sums line up ---
{
  let seed = 99;
  const rnd = (n) => ((seed = (seed * 1664525 + 1013904223) % 4294967296) % n);
  for (let t = 0; t < 150; t++) {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const ms = [];
    for (const h of ids) for (const a of ids) if (h !== a) ms.push(M(h, a, rnd(6), rnd(6)));
    const s = stats(ids, ms, 30);
    check(s.longestUnbeatenStreak.value >= s.longestWinStreak.value, "unbeaten >= win streak");
    check(s.longestWinStreak.value <= 10 && s.longestLosingStreak.value <= 10, "streak <= 10 matches");
    check(s.totals.matchesPlayed === 30 && s.totals.matchesRemaining === 0, "30 played, 0 remaining");
    const rows = calculateStandings(P(...ids), ms);
    check(rows.reduce((x, r) => x + r.goalsFor, 0) === s.totals.totalGoals, "goals add up");
    // brute-force top scorer
    const gf = Object.fromEntries(ids.map((i) => [i, 0]));
    ms.forEach((m) => { gf[m.homeId] += m.homeScore; gf[m.awayId] += m.awayScore; });
    const max = Math.max(...Object.values(gf));
    check(s.topScorer.value === max && s.topScorer.playerIds.every((i) => gf[i] === max), "top scorer matches brute force");
  }
}

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All statistics checks passed.");

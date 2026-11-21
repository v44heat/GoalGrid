// Run with: npm run verify:standings   (needs Node 22.6+)
import { calculateStandings } from "../lib/league/standings.ts";

let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
};
const P = (...names) => names.map((n) => ({ id: n, name: n }));
const get = (rows, id) => rows.find((r) => r.playerId === id);

// --- Spec example: Vincy 4-2 Kevin ---
{
  const rows = calculateStandings(P("Vincy", "Kevin"), [
    { homeId: "Vincy", awayId: "Kevin", homeScore: 4, awayScore: 2 },
  ]);
  const v = get(rows, "Vincy");
  const k = get(rows, "Kevin");
  check(v.played === 1 && v.won === 1 && v.goalsFor === 4 && v.goalsAgainst === 2 && v.goalDifference === 2 && v.points === 3, "Vincy after 4-2");
  check(k.played === 1 && k.lost === 1 && k.goalsFor === 2 && k.goalsAgainst === 4 && k.goalDifference === -2 && k.points === 0, "Kevin after 4-2");
  check(rows[0].playerId === "Vincy", "Vincy leads");
}

// --- Spec example: draw 2-2 ---
{
  const rows = calculateStandings(P("Vincy", "Kevin"), [
    { homeId: "Vincy", awayId: "Kevin", homeScore: 2, awayScore: 2 },
  ]);
  for (const r of rows) check(r.played === 1 && r.drawn === 1 && r.goalsFor === 2 && r.goalsAgainst === 2 && r.points === 1, `${r.name} after 2-2`);
  check(rows[0].position === 1 && rows[1].position === 1 && rows[0].tied && rows[1].tied, "2-2 leaves both tied on position 1");
}

// --- Spec example: result edited 2-1 -> 3-3 recalculates ---
{
  const before = calculateStandings(P("Vincy", "Kevin"), [{ homeId: "Vincy", awayId: "Kevin", homeScore: 2, awayScore: 1 }]);
  const after = calculateStandings(P("Vincy", "Kevin"), [{ homeId: "Vincy", awayId: "Kevin", homeScore: 3, awayScore: 3 }]);
  check(get(before, "Vincy").points === 3 && get(before, "Kevin").points === 0, "before edit");
  check(get(after, "Vincy").points === 1 && get(after, "Kevin").points === 1 && get(after, "Vincy").goalsFor === 3, "after edit to 3-3");
  // Deleting the result: back to zero.
  const none = calculateStandings(P("Vincy", "Kevin"), []);
  check(none.every((r) => r.played === 0 && r.points === 0), "deleted result removes all stats");
}

// --- Ranking: points, then GD, then goals scored; positions 1,2,2,4 ---
{
  // A: 3pts GD+3 GF3 | B: 3pts GD+1 GF4 | C: 3pts GD+1 GF4 (tied with B) | D: 0pts
  const rows = calculateStandings(P("A", "B", "C", "D"), [
    { homeId: "A", awayId: "D", homeScore: 3, awayScore: 0 },
    { homeId: "B", awayId: "D", homeScore: 4, awayScore: 3 },
    { homeId: "C", awayId: "D", homeScore: 4, awayScore: 3 },
  ]);
  check(rows.map((r) => r.position).join() === "1,2,2,4", `positions ${rows.map((r) => r.position)}`);
  check(rows[0].playerId === "A", "A first on goal difference");
  check(get(rows, "B").tied && get(rows, "C").tied && !get(rows, "A").tied && !get(rows, "D").tied, "tied flags");

  // Goals scored breaks a points + GD tie
  const gf = calculateStandings(P("X", "Y", "Z", "W"), [
    { homeId: "X", awayId: "Z", homeScore: 5, awayScore: 4 }, // X: +1, GF5
    { homeId: "Y", awayId: "W", homeScore: 1, awayScore: 0 }, // Y: +1, GF1
  ]);
  check(gf[0].playerId === "X" && gf[1].playerId === "Y" && gf[0].position === 1 && gf[1].position === 2, "goals scored is the third tie-break");
}

// --- Form: last 5, oldest first ---
{
  const seq = [[1, 0], [0, 1], [2, 2], [3, 0], [1, 0], [0, 4], [2, 0]]; // from P's view: W L D W W L W
  const matches = seq.map(([a, b]) => ({ homeId: "P", awayId: "Q", homeScore: a, awayScore: b }));
  const rows = calculateStandings(P("P", "Q"), matches);
  check(get(rows, "P").form.join("") === "DWWLW", `form was ${get(rows, "P").form.join("")}`);
  check(get(rows, "Q").form.join("") === "DLLWL", `Q form was ${get(rows, "Q").form.join("")}`);
}

// --- Players with no matches still appear; unknown players are ignored ---
{
  const rows = calculateStandings(P("A", "B", "C"), [
    { homeId: "A", awayId: "B", homeScore: 1, awayScore: 0 },
    { homeId: "A", awayId: "GHOST", homeScore: 9, awayScore: 0 },
  ]);
  check(rows.length === 3, "all participants listed");
  check(get(rows, "C").played === 0, "C has no matches");
  check(get(rows, "A").played === 1 && get(rows, "A").goalsFor === 1, "match with non-participant ignored");
}

// --- Property test: a full random 6-player double round robin (30 matches) ---
{
  let seed = 12345;
  const rnd = (n) => ((seed = (seed * 1664525 + 1013904223) % 4294967296) % n);
  for (let trial = 0; trial < 200; trial++) {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const matches = [];
    for (const h of ids) for (const a of ids) if (h !== a) matches.push({ homeId: h, awayId: a, homeScore: rnd(6), awayScore: rnd(6) });
    const rows = calculateStandings(P(...ids), matches);

    const draws = matches.filter((m) => m.homeScore === m.awayScore).length;
    const decisive = matches.length - draws;
    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);

    check(rows.every((r) => r.played === 10), "everyone played 10");
    check(sum("played") === 60, "60 appearances in 30 matches");
    check(sum("goalsFor") === sum("goalsAgainst"), "league-wide GF equals GA");
    check(sum("goalDifference") === 0, "league-wide GD sums to zero");
    check(sum("points") === decisive * 3 + draws * 2, "points total");
    check(rows.every((r) => r.won + r.drawn + r.lost === r.played), "W+D+L = P");
    check(rows.every((r) => r.points === r.won * 3 + r.drawn), "points = 3W + D");
    check(rows.every((r) => r.goalDifference === r.goalsFor - r.goalsAgainst), "GD = GF - GA");
    check(rows.every((r, i) => i === 0 || rows[i - 1].points > r.points || (rows[i - 1].points === r.points && rows[i - 1].goalDifference >= r.goalDifference)), "sorted by points then GD");
  }
}

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All standings checks passed.");

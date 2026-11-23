// Run with: npm run verify:hall   (needs Node 22.6+)
import { calculateStandings } from "../lib/league/standings.ts";
import { buildHallOfFame } from "../lib/league/hallOfFame.ts";

let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
};
const P = (...n) => n.map((x) => ({ id: x, name: x }));
const M = (h, a, hs, as) => ({ homeId: h, awayId: a, homeScore: hs, awayScore: as });

/** Final standings for a season, shaped the way the data layer hands them over. */
function season(id, name, startDate, players, matches, teams = {}) {
  const rows = calculateStandings(P(...players), matches).map((r) => ({
    playerId: r.playerId,
    name: r.name,
    teamName: teams[r.playerId] ?? null,
    position: r.position,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    points: r.points,
  }));
  return { seasonId: id, seasonName: name, startDate, rows };
}

// Season 1: Vincy champion. Season 2: Kevin champion. Season 3: Vincy champion again.
const s1 = season("s1", "Season 1", "2026-12-01", ["Vincy", "Kevin", "Brian"], [
  M("Vincy", "Kevin", 3, 1), M("Kevin", "Vincy", 0, 2), M("Vincy", "Brian", 2, 0),
  M("Brian", "Vincy", 1, 1), M("Kevin", "Brian", 1, 1), M("Brian", "Kevin", 0, 4),
], { Vincy: "Barcelona", Kevin: "Liverpool", Brian: "Real Madrid" });
const s2 = season("s2", "Season 2", "2027-01-05", ["Vincy", "Kevin", "Brian"], [
  M("Kevin", "Vincy", 2, 0), M("Vincy", "Kevin", 1, 1), M("Kevin", "Brian", 5, 0),
  M("Brian", "Kevin", 0, 1), M("Vincy", "Brian", 1, 0), M("Brian", "Vincy", 2, 2),
], { Vincy: "Arsenal", Kevin: "Liverpool", Brian: "Chelsea" });
const s3 = season("s3", "Season 3", "2027-02-09", ["Vincy", "Kevin"], [
  M("Vincy", "Kevin", 2, 0), M("Kevin", "Vincy", 1, 3),
], { Vincy: "Barcelona", Kevin: "Liverpool" });

const hof = buildHallOfFame([s2, s1, s3]); // deliberately out of order

check(hof.history.map((h) => h.seasonName).join() === "Season 3,Season 2,Season 1", "history is newest first");
check(hof.history[2].champion.name === "Vincy" && hof.history[2].champion.teamName === "Barcelona", "season 1 champion + team");
check(hof.history[1].champion.name === "Kevin" && hof.history[1].champion.points === 10 /* W D W W */, `season 2 champion Kevin ${JSON.stringify(hof.history[1].champion)}`);
check(hof.history[0].champion.name === "Vincy", "season 3 champion Vincy");

check(hof.titles[0].name === "Vincy" && hof.titles[0].titles === 2, "Vincy has 2 titles");
check(hof.titles[1].name === "Kevin" && hof.titles[1].titles === 1, "Kevin has 1 title");
check(!hof.titles.some((t) => t.name === "Brian"), "Brian has no titles and is not listed");

const kevin = hof.players.find((p) => p.name === "Kevin");
const brian = hof.players.find((p) => p.name === "Brian");
check(kevin.seasons === 3 && kevin.titles === 1, "Kevin: 3 seasons, 1 title");
check(kevin.bestFinish === 1 && kevin.bestFinishCount === 1, "Kevin best finish 1st once");
check(brian.seasons === 2 && brian.titles === 0, "Brian: 2 seasons, 0 titles");
check(brian.bestFinish === 3 && brian.bestFinishCount === 2, `Brian best finish 3rd twice: ${brian.bestFinish}/${brian.bestFinishCount}`);
check(hof.players[0].name === "Vincy", "all-time list led by most titles");

// Totals add up across seasons for one player (independent sum).
const sum = (k) => [s1, s2, s3].flatMap((s) => s.rows).filter((r) => r.name === "Kevin").reduce((a, r) => a + r[k], 0);
for (const k of ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "points"]) {
  check(kevin[k] === sum(k), `Kevin ${k}: ${kevin[k]} vs ${sum(k)}`);
}

// A tie for first is NOT a champion and awards no title.
{
  const tied = season("t", "Tied", "2027-03-01", ["A", "B"], [M("A", "B", 1, 1), M("B", "A", 2, 2)]);
  const h = buildHallOfFame([tied]);
  check(h.history[0].champion === null && h.history[0].sharedFirst.sort().join() === "A,B", "tie for first: shared, no champion");
  check(h.titles.length === 0, "no titles awarded for a shared first place");
}

// A season with no matches counts for nothing.
{
  const empty = season("e", "Empty", "2027-04-01", ["A", "B"], []);
  const h = buildHallOfFame([empty]);
  check(h.history.length === 1 && h.history[0].champion === null && h.history[0].sharedFirst.length === 0, "empty season has no champion");
  check(h.players.length === 0, "empty season adds no player records");
}

check(buildHallOfFame([]).history.length === 0, "no seasons -> empty hall");

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All Hall of Fame checks passed.");

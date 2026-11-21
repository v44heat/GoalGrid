// Run with: npm run verify:fixtures   (needs Node 22.6+)
import { generateFixtures, MAX_PLAYERS } from "../lib/fixtures/generate.ts";

let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
};

for (let n = 2; n <= MAX_PLAYERS; n++) {
  const ids = Array.from({ length: n }, (_, i) => `p${i + 1}`);
  const fx = generateFixtures(ids);
  const tag = `n=${n}`;

  check(fx.length === n * (n - 1), `${tag}: expected ${n * (n - 1)} matches, got ${fx.length}`);

  // Every ordered pairing (home, away) exactly once => each pair meets twice, venues reversed.
  const seen = new Set();
  for (const f of fx) {
    check(f.home !== f.away, `${tag}: player plays themselves`);
    const key = `${f.home}>${f.away}`;
    check(!seen.has(key), `${tag}: duplicate ${key}`);
    seen.add(key);
  }
  for (const a of ids) for (const b of ids) if (a !== b) check(seen.has(`${a}>${b}`), `${tag}: missing ${a}>${b}`);

  // Each player at most once per matchday; exactly once when n is even.
  const byDay = new Map();
  for (const f of fx) {
    if (!byDay.has(f.matchday)) byDay.set(f.matchday, []);
    byDay.get(f.matchday).push(f);
  }
  const expectedDays = n % 2 === 0 ? 2 * (n - 1) : 2 * n;
  check(byDay.size === expectedDays, `${tag}: expected ${expectedDays} matchdays, got ${byDay.size}`);
  for (const [md, list] of byDay) {
    const players = list.flatMap((f) => [f.home, f.away]);
    check(new Set(players).size === players.length, `${tag}: matchday ${md} repeats a player`);
    if (n % 2 === 0) check(list.length === n / 2, `${tag}: matchday ${md} has ${list.length} matches`);
  }

  // Dates: start on day 1, never past day 28, never going backwards.
  const offsets = [...byDay.keys()].sort((a, b) => a - b).map((md) => byDay.get(md)[0].dayOffset);
  check(offsets[0] === 0, `${tag}: first matchday is not day 1`);
  if (offsets.length > 1) check(offsets[offsets.length - 1] === 27, `${tag}: last matchday is not day 28`);
  check(offsets.every((o, i) => i === 0 || o >= offsets[i - 1]), `${tag}: dates go backwards`);

  // Home/away balance
  const home = Object.fromEntries(ids.map((i) => [i, 0]));
  const away = Object.fromEntries(ids.map((i) => [i, 0]));
  fx.forEach((f) => {
    home[f.home]++;
    away[f.away]++;
  });
  const worst = Math.max(...ids.map((i) => Math.abs(home[i] - away[i])));
  console.log(`${tag}: ${fx.length} matches, ${byDay.size} matchdays, worst home/away gap ${worst}`);
}

// The spec example: 6 players
const six = generateFixtures(["a", "b", "c", "d", "e", "f"]);
const days = [...new Set(six.map((f) => f.dayOffset))].map((o) => o + 1);
check(six.length === 30, "6 players: 30 matches");
check(days.join(",") === "1,4,7,10,13,16,19,22,25,28", `6 players: days ${days.join(",")}`);

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All fixture checks passed.");

import { Swords } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { getHeadToHead, getKnownPlayers } from "@/lib/data/headToHead";
import { UUID_RE } from "@/lib/validation/auth";
import { formatDate } from "@/utils/dates";

export const metadata = { title: "Head-to-head" };
export const dynamic = "force-dynamic";

const select =
  "h-11 w-full rounded-lg border border-turf-600 bg-turf-900 px-3 text-base text-chalk " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-grass";

export default async function HeadToHeadPage({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const supabase = createClient();
  const players = await getKnownPlayers(supabase);
  const names = new Map(players.map((p) => [p.id, p.username]));

  const a = searchParams.a && UUID_RE.test(searchParams.a) && names.has(searchParams.a) ? searchParams.a : "";
  const b = searchParams.b && UUID_RE.test(searchParams.b) && names.has(searchParams.b) ? searchParams.b : "";
  const same = a !== "" && a === b;
  const view = a && b && !same ? await getHeadToHead(supabase, a, b, names) : null;

  return (
    <>
      <PageHeader title="Head-to-head" description="All-time record between two players, across every season." />

      {/* Plain GET form: works without JavaScript and gives a shareable link. */}
      <form method="get" className="mb-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="a" className="mb-1.5 block text-sm font-medium">Player 1</label>
          <select id="a" name="a" defaultValue={a} className={select} required>
            <option value="" disabled>Choose a player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b" className="mb-1.5 block text-sm font-medium">Player 2</label>
          <select id="b" name="b" defaultValue={b} className={select} required>
            <option value="" disabled>Choose a player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Compare</Button>
      </form>

      {players.length < 2 ? (
        <EmptyState icon={Swords} title="Not enough players" description="Two players need to have joined a season first." />
      ) : same ? (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          Pick two different players.
        </p>
      ) : !view ? (
        <EmptyState icon={Swords} title="Pick two players" description="Choose who to compare and press Compare." />
      ) : (
        <>
          <Card className="text-center">
            <p className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
              {view.nameA.toUpperCase()} <span className="text-chalk-faint">vs</span> {view.nameB.toUpperCase()}
            </p>
            <p className="mt-2 text-chalk-dim">
              Matches played: <span className="tabular font-semibold text-chalk">{view.record.played}</span>
            </p>
          </Card>

          {view.record.played === 0 ? (
            <p className="mt-6 text-chalk-dim">These two haven&apos;t played each other yet.</p>
          ) : (
            <>
              <div
                role="img"
                aria-label={`${view.nameA} ${view.record.aWins} wins, ${view.record.draws} draws, ${view.nameB} ${view.record.bWins} wins`}
                className="mt-6 flex h-3 overflow-hidden rounded-full bg-turf-700"
              >
                <div className="bg-grass" style={{ width: `${(view.record.aWins / view.record.played) * 100}%` }} />
                <div className="bg-chalk-faint" style={{ width: `${(view.record.draws / view.record.played) * 100}%` }} />
                <div className="bg-gold" style={{ width: `${(view.record.bWins / view.record.played) * 100}%` }} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  [`${view.nameA} wins`, view.record.aWins],
                  ["Draws", view.record.draws],
                  [`${view.nameB} wins`, view.record.bWins],
                  [`${view.nameA} goals`, view.record.aGoals],
                  [`${view.nameB} goals`, view.record.bGoals],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-turf-700 bg-turf-800/60 px-4 py-3">
                    <dt className="truncate text-sm text-chalk-dim">{label}</dt>
                    <dd className="tabular font-display text-3xl font-bold">{value}</dd>
                  </div>
                ))}
              </dl>

              <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Previous meetings</h2>
              <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
                {view.meetings
                  .slice()
                  .reverse()
                  .map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <p>
                        {m.homeName}{" "}
                        <span className="tabular font-display text-xl font-bold">
                          {m.homeScore} - {m.awayScore}
                        </span>{" "}
                        {m.awayName}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-chalk-dim">
                        <Badge>{m.seasonName}</Badge>
                        MD {m.matchday} · {formatDate(m.date)}
                      </p>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

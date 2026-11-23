import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getHallOfFame } from "@/lib/data/hallOfFame";
import { cn } from "@/utils/cn";

export const metadata = { title: "Hall of Fame" };
export const dynamic = "force-dynamic";

const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
};

export default async function HallOfFamePage() {
  const hall = await getHallOfFame(createClient());

  if (hall.history.length === 0) {
    return (
      <>
        <PageHeader title="Hall of Fame" />
        <EmptyState
          icon={Trophy}
          title="No champions yet"
          description="Seasons appear here once they've been completed."
        />
      </>
    );
  }

  const hideSm = "hidden sm:table-cell";

  return (
    <>
      <PageHeader title="Hall of Fame" description="Every completed season, and who won it." />

      <h2 className="mb-3 font-display text-2xl font-semibold">Champions</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {hall.history.map((h) => (
          <li key={h.seasonId}>
            <Link href={`/seasons/${h.seasonId}`} className="block">
              <Card className={cn("transition-colors hover:border-gold/60", h.champion && "border-gold/30")}>
                <p className="text-sm text-chalk-dim">{h.seasonName}</p>
                {h.champion ? (
                  <>
                    <p className="mt-1 flex items-center gap-2 font-display text-3xl font-bold">
                      <Trophy className="h-6 w-6 shrink-0 text-gold" aria-hidden />
                      {h.champion.name}
                    </p>
                    <p className="text-chalk-dim">
                      {h.champion.teamName ?? "No team"} ·{" "}
                      <span className="tabular">{h.champion.points}</span> points
                    </p>
                  </>
                ) : h.sharedFirst.length > 0 ? (
                  <p className="mt-1 text-chalk-dim">Shared first place: {h.sharedFirst.join(", ")}</p>
                ) : (
                  <p className="mt-1 text-chalk-dim">No matches were played.</p>
                )}
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {hall.titles.length > 0 && (
        <>
          <h2 className="mb-3 mt-12 font-display text-2xl font-semibold">Titles</h2>
          <ol className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
            {hall.titles.map((t) => (
              <li key={t.playerId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/players/${t.playerId}`} className="font-medium hover:text-grass">
                    {t.name}
                  </Link>
                  <p className="truncate text-sm text-chalk-faint">{t.seasons.join(", ")}</p>
                </div>
                <p className="flex shrink-0 items-center gap-1.5 font-display text-3xl font-bold text-gold">
                  <Medal className="h-5 w-5" aria-hidden />
                  <span className="tabular">{t.titles}</span>
                </p>
              </li>
            ))}
          </ol>
        </>
      )}

      {hall.players.length > 0 && (
        <>
          <h2 className="mb-3 mt-12 font-display text-2xl font-semibold">All-time records</h2>
          <div className="overflow-hidden rounded-xl border border-turf-700 bg-turf-800/70">
            <table className="w-full text-sm">
              <caption className="sr-only">All-time player records across completed seasons</caption>
              <thead>
                <tr className="border-b border-turf-700 text-xs uppercase tracking-wide text-chalk-faint">
                  <th scope="col" className="px-3 py-3 text-left font-medium">Player</th>
                  <th scope="col" className="px-2 py-3 text-center font-medium">Titles</th>
                  <th scope="col" className="px-2 py-3 text-center font-medium">Best</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>Seasons</th>
                  <th scope="col" className="px-2 py-3 text-center font-medium">P</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>W</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>D</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>L</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>GF</th>
                  <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideSm)}>GA</th>
                  <th scope="col" className="px-3 py-3 text-center font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {hall.players.map((p) => (
                  <tr key={p.playerId} className="border-b border-turf-700/60 last:border-0">
                    <td className="px-3 py-3 font-medium">
                      <Link href={`/players/${p.playerId}`} className="hover:text-grass">
                        {p.name}
                      </Link>
                    </td>
                    <td className="tabular px-2 text-center font-display text-xl font-bold text-gold">{p.titles || "-"}</td>
                    <td className="tabular px-2 text-center">
                      {ordinal(p.bestFinish)}
                      {p.bestFinishCount > 1 && <span className="text-chalk-faint"> ×{p.bestFinishCount}</span>}
                    </td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.seasons}</td>
                    <td className="tabular px-2 text-center">{p.played}</td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.won}</td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.drawn}</td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.lost}</td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.goalsFor}</td>
                    <td className={cn("tabular px-2 text-center", hideSm)}>{p.goalsAgainst}</td>
                    <td className="tabular px-3 text-center font-display text-xl font-bold">{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

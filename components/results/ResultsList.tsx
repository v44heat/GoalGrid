import { Side } from "@/components/fixtures/FixtureList";
import { MatchCardButton } from "@/components/graphics/ImageButtons";
import { groupByMatchday } from "@/lib/data/fixtures";
import { matchCardData } from "@/lib/data/graphics";
import { formatDate } from "@/utils/dates";
import type { FixtureRow } from "@/types/fixtures";

/** Played matches grouped by matchday, latest matchday first. Rows must all have results. */
export function ResultsList({ rows, seasonName }: { rows: FixtureRow[]; seasonName: string }) {
  const groups = groupByMatchday(rows).reverse();

  return (
    <div className="space-y-6">
      {groups.map(({ matchday, fixtures }) => (
        <section
          key={matchday}
          aria-labelledby={`res-md-${matchday}`}
          className="overflow-hidden rounded-xl border border-turf-700 bg-turf-800/70"
        >
          <h2
            id={`res-md-${matchday}`}
            className="border-b border-turf-700 px-4 py-3 font-display text-2xl font-semibold"
          >
            Matchday {matchday}
          </h2>
          <ul className="divide-y divide-turf-700">
            {fixtures.map((f) => (
              <li key={f.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
                <Side player={f.home} align="right" />
                <div className="flex min-w-[5.5rem] flex-col items-center text-center">
                  <span className="tabular font-display text-3xl font-bold">
                    {f.result!.homeScore} - {f.result!.awayScore}
                  </span>
                  <span className="text-xs text-chalk-faint">{formatDate(f.scheduledDate)}</span>
                  {matchCardData(seasonName, f) && (
                    <span className="mt-1">
                      <MatchCardButton data={matchCardData(seasonName, f)!} iconOnly />
                    </span>
                  )}
                </div>
                <Side player={f.away} align="left" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import { formatDate } from "@/utils/dates";

export interface PreviewMatch {
  matchday: number;
  date: string;
  home: string;
  away: string;
}

/** Read-only list shown before the admin confirms generation. */
export function FixturePreview({ matches }: { matches: PreviewMatch[] }) {
  const days = new Map<number, PreviewMatch[]>();
  matches.forEach((m) => days.set(m.matchday, [...(days.get(m.matchday) ?? []), m]));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from(days.entries()).map(([md, list]) => (
        <div key={md} className="rounded-lg border border-turf-700 bg-turf-900/50 p-3">
          <p className="mb-2 flex justify-between text-sm">
            <span className="font-medium">Matchday {md}</span>
            <span className="text-chalk-faint">{formatDate(list[0].date)}</span>
          </p>
          <ul className="space-y-1 text-sm text-chalk-dim">
            {list.map((m) => (
              <li key={`${m.home}-${m.away}`}>
                {m.home} <span className="text-chalk-faint">vs</span> {m.away}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

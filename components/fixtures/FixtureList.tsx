import { Badge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { FixturesImageButton } from "@/components/graphics/ImageButtons";
import { groupByMatchday } from "@/lib/data/fixtures";
import { fixturesImageData } from "@/lib/data/graphics";
import { formatDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import type { FixturePlayer, FixtureRow } from "@/types/fixtures";

export function Side({ player, align }: { player: FixturePlayer; align: "left" | "right" }) {
  const logo = player.team ? (
    <TeamLogo
      name={player.team.name}
      shortName={player.team.short_name}
      logoUrl={player.team.logo_url}
      className="h-9 w-9 shrink-0 text-sm"
    />
  ) : null;
  const text = (
    <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <p className="truncate font-medium">{player.username}</p>
      {player.team && <p className="truncate text-xs text-chalk-faint">{player.team.name}</p>}
    </div>
  );
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "justify-end")}>
      {align === "right" ? (
        <>
          {text}
          {logo}
        </>
      ) : (
        <>
          {logo}
          {text}
        </>
      )}
    </div>
  );
}

export function FixtureList({
  rows,
  today,
  nextMatchday,
  seasonName,
}: {
  rows: FixtureRow[];
  today: string;
  nextMatchday: number | null;
  seasonName: string;
}) {
  const groups = groupByMatchday(rows);

  return (
    <div className="space-y-6">
      {groups.map(({ matchday, fixtures }) => {
        const headerDate = fixtures.map((f) => f.scheduledDate).sort()[0];
        const isNext = matchday === nextMatchday;
        return (
          <section
            key={matchday}
            aria-labelledby={`md-${matchday}`}
            className={cn(
              "overflow-hidden rounded-xl border bg-turf-800/70",
              isNext ? "border-grass/60 shadow-glow" : "border-turf-700"
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-turf-700 px-4 py-3">
              <h2 id={`md-${matchday}`} className="font-display text-2xl font-semibold">
                Matchday {matchday}
              </h2>
              <div className="flex items-center gap-2 text-sm text-chalk-dim">
                {isNext && <Badge tone="success">Next up</Badge>}
                {headerDate === today && <Badge tone="warning">Today</Badge>}
                {formatDate(headerDate)}
                <FixturesImageButton data={fixturesImageData(seasonName, matchday, fixtures)} iconOnly />
              </div>
            </header>
            <ul className="divide-y divide-turf-700">
              {fixtures.map((f) => (
                <li key={f.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
                  <Side player={f.home} align="right" />
                  <div className="flex w-16 flex-col items-center text-center">
                    {f.result ? (
                      <span className="tabular font-display text-2xl font-bold">
                        {f.result.homeScore} - {f.result.awayScore}
                      </span>
                    ) : (
                      <span className="font-display text-lg text-chalk-faint">vs</span>
                    )}
                    {f.status !== "UPCOMING" && f.status !== "PLAYED" && (
                      <Badge tone="warning" className="mt-0.5">
                        {f.status.toLowerCase()}
                      </Badge>
                    )}
                    {f.scheduledDate !== headerDate && (
                      <span className="mt-0.5 text-xs text-chalk-faint">{formatDate(f.scheduledDate)}</span>
                    )}
                  </div>
                  <Side player={f.away} align="left" />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

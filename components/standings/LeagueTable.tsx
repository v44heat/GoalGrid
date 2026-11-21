import Link from "next/link";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { FormChips } from "@/components/standings/FormChips";
import type { TableRow } from "@/lib/data/standings";
import { cn } from "@/utils/cn";

// Small screens keep POS, player, P, GD and PTS. W/D/L and GF/GA appear from `sm`, form from `md`.
const hideOnSmall = "hidden sm:table-cell";

function Gd({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular",
        value > 0 && "text-grass",
        value < 0 && "text-[#ff7b80]",
        value === 0 && "text-chalk-dim"
      )}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

export function LeagueTable({
  rows,
  seasonId,
  currentUserId,
  anyPlayed,
}: {
  rows: TableRow[];
  seasonId: string;
  currentUserId?: string;
  anyPlayed: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-turf-700 bg-turf-800/70">
      <table className="w-full text-sm">
        <caption className="sr-only">League table</caption>
        <thead>
          <tr className="border-b border-turf-700 text-xs uppercase tracking-wide text-chalk-faint">
            <th scope="col" className="w-10 py-3 pl-3 text-left font-medium">Pos</th>
            <th scope="col" className="px-2 py-3 text-left font-medium">Player</th>
            <th scope="col" className="px-2 py-3 text-center font-medium">P</th>
            <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideOnSmall)}>W</th>
            <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideOnSmall)}>D</th>
            <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideOnSmall)}>L</th>
            <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideOnSmall)}>GF</th>
            <th scope="col" className={cn("px-2 py-3 text-center font-medium", hideOnSmall)}>GA</th>
            <th scope="col" className="px-2 py-3 text-center font-medium">GD</th>
            <th scope="col" className="px-2 py-3 pr-3 text-center font-medium">Pts</th>
            <th scope="col" className="hidden px-3 py-3 text-left font-medium md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const leader = anyPlayed && r.position === 1;
            const me = r.playerId === currentUserId;
            return (
              <tr
                key={r.playerId}
                className={cn(
                  "border-b border-turf-700/60 last:border-0",
                  leader && "bg-gold/[0.07]",
                  me && "bg-grass/10"
                )}
              >
                <td className={cn("py-3 pl-3", leader && "border-l-2 border-gold")}>
                  <span
                    title={r.tied && anyPlayed ? "Level on points, goal difference and goals scored" : undefined}
                    className={cn("tabular font-display text-xl font-bold", leader ? "text-gold" : "text-chalk-dim")}
                  >
                    {r.position}
                    {r.tied && anyPlayed ? "=" : ""}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <Link
                    href={`/players/${r.playerId}?season=${seasonId}`}
                    className="flex min-w-0 items-center gap-2 hover:text-grass"
                  >
                    {r.team ? (
                      <TeamLogo
                        name={r.team.name}
                        shortName={r.team.short_name}
                        logoUrl={r.team.logo_url}
                        className="h-8 w-8 shrink-0 text-xs"
                      />
                    ) : (
                      <span aria-hidden className="h-8 w-8 shrink-0 rounded-full border border-dashed border-turf-600" />
                    )}
                    <span className="min-w-0">
                      <span className={cn("block truncate", leader ? "font-semibold" : "font-medium")}>
                        {r.username}
                        {me && <span className="ml-1.5 text-xs font-normal text-grass">you</span>}
                      </span>
                      <span className="block truncate text-xs text-chalk-faint">{r.team?.name ?? "No team"}</span>
                    </span>
                  </Link>
                </td>
                <td className="tabular px-2 text-center">{r.played}</td>
                <td className={cn("tabular px-2 text-center", hideOnSmall)}>{r.won}</td>
                <td className={cn("tabular px-2 text-center", hideOnSmall)}>{r.drawn}</td>
                <td className={cn("tabular px-2 text-center", hideOnSmall)}>{r.lost}</td>
                <td className={cn("tabular px-2 text-center", hideOnSmall)}>{r.goalsFor}</td>
                <td className={cn("tabular px-2 text-center", hideOnSmall)}>{r.goalsAgainst}</td>
                <td className="px-2 text-center"><Gd value={r.goalDifference} /></td>
                <td className="tabular px-2 pr-3 text-center font-display text-xl font-bold">{r.points}</td>
                <td className="hidden px-3 md:table-cell"><FormChips form={r.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

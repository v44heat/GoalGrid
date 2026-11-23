import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getFixtureRows } from "@/lib/data/fixtures";
import { buildSeasonTable } from "@/lib/data/standings";
import { buildHallOfFame, type HallOfFame } from "@/lib/league/hallOfFame";

type Client = ReturnType<typeof createClient>;

/** Built from the final standings of every completed or archived season. Nothing is stored. */
export async function getHallOfFame(supabase: Client): Promise<HallOfFame> {
  const { data } = await supabase
    .from("seasons")
    .select("id, name, start_date")
    .in("status", ["COMPLETED", "ARCHIVED"])
    .order("start_date", { ascending: false });

  const seasons = await Promise.all(
    (data ?? []).map(async (s) => {
      const table = buildSeasonTable(await getFixtureRows(supabase, s.id));
      return {
        seasonId: s.id as string,
        seasonName: s.name as string,
        startDate: s.start_date as string,
        rows: table.rows.map((r) => ({
          playerId: r.playerId,
          name: r.username,
          teamName: r.team?.name ?? null,
          position: r.position,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          points: r.points,
        })),
      };
    })
  );

  return buildHallOfFame(seasons);
}

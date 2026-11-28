import Link from "next/link";
import { CalendarPlus, UserCheck, Users, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getFixtureRows } from "@/lib/data/fixtures";
import { countPendingProposals } from "@/lib/data/proposals";
import { buildSeasonTable } from "@/lib/data/standings";
import { formatDate } from "@/utils/dates";
import type { Season } from "@/types/database";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const count = async (status: string) => {
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", status)
      .is("deleted_at", null);
    return count ?? 0;
  };

  const [pending, approved, suspended, { data: seasonRows }] = await Promise.all([
    count("PENDING"),
    count("APPROVED"),
    count("SUSPENDED"),
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false }),
  ]);

  const waitingScores = await countPendingProposals(supabase);

  const seasons = (seasonRows ?? []) as Season[];
  // The season you are most likely working on: the active one, else the newest draft, else the newest.
  const current =
    seasons.find((s) => s.status === "ACTIVE") ?? seasons.find((s) => s.status === "DRAFT") ?? seasons[0] ?? null;

  let participants = 0;
  let played = 0;
  let remaining = 0;
  let total = 0;
  let leaders: string[] = [];
  let leaderPoints = 0;
  let recent: { id: string; text: string }[] = [];

  if (current) {
    const [{ count: pc }, fixtures] = await Promise.all([
      supabase
        .from("season_participants")
        .select("*", { count: "exact", head: true })
        .eq("season_id", current.id),
      getFixtureRows(supabase, current.id),
    ]);
    participants = pc ?? 0;

    const table = buildSeasonTable(fixtures);
    const cancelled = fixtures.filter((f) => f.status === "CANCELLED").length;
    total = fixtures.length - cancelled;
    played = table.playedCount;
    remaining = Math.max(0, total - played);
    if (played > 0) {
      const first = table.rows.filter((r) => r.position === 1);
      leaders = first.map((r) => r.username);
      leaderPoints = first[0]?.points ?? 0;
    }
    recent = table.played
      .slice()
      .reverse()
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        text: `${f.home.username} ${f.result!.homeScore} - ${f.result!.awayScore} ${f.away.username}`,
      }));
  }

  const playerStats = [
    { label: "Waiting for approval", value: pending, icon: Users, highlight: pending > 0 },
    { label: "Approved players", value: approved, icon: UserCheck, highlight: false },
    { label: "Suspended", value: suspended, icon: UserX, highlight: false },
  ];

  const seasonStats: [string, string | number][] = [
    ["Participants", participants],
    ["Matches played", played],
    ["Matches remaining", remaining],
    ["Current leader", leaders.length ? `${leaders.join(" & ")} (${leaderPoints})` : "-"],
  ];

  return (
    <>
      <PageHeader title="Admin dashboard" />

      <h2 className="mb-3 font-display text-2xl font-semibold">Players</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {playerStats.map(({ label, value, icon: Icon, highlight }) => (
          <Card key={label} className={highlight ? "border-gold/50" : undefined}>
            <Icon className="h-5 w-5 text-chalk-faint" aria-hidden />
            <p className="tabular mt-3 font-display text-5xl font-bold">{value}</p>
            <p className="text-sm text-chalk-dim">{label}</p>
          </Card>
        ))}
      </div>
      {pending > 0 && (
        <p className="mt-4">
          <Link href="/admin/players" className="text-grass underline-offset-2 hover:underline">
            Review {pending} pending {pending === 1 ? "registration" : "registrations"}
          </Link>
        </p>
      )}
      {waitingScores > 0 && (
        <p className="mt-2">
          <Link href="/admin/approvals" className="text-gold underline-offset-2 hover:underline">
            {waitingScores} {waitingScores === 1 ? "score is" : "scores are"} waiting for your approval
          </Link>
        </p>
      )}

      <h2 className="mb-3 mt-10 font-display text-2xl font-semibold">Current season</h2>
      {!current ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-chalk-dim">No seasons yet.</p>
          <Link href="/admin/seasons/new">
            <Button>
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Create the first season
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-display text-3xl font-semibold">
                {current.name} <SeasonStatusBadge status={current.status} />
              </p>
              <p className="text-sm text-chalk-dim">
                {formatDate(current.start_date)} to {formatDate(current.end_date)}
              </p>
            </div>
            <Link href={`/admin/seasons/${current.id}`}>
              <Button variant="secondary">Manage season</Button>
            </Link>
          </Card>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {seasonStats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-turf-700 bg-turf-800/60 px-4 py-3">
                <dt className="text-sm text-chalk-dim">{label}</dt>
                <dd className="tabular truncate font-display text-3xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mb-3 mt-8 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-semibold">Recent results</h3>
            <Link href="/admin/results" className="text-sm text-grass underline-offset-2 hover:underline">
              Enter results
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-chalk-dim">
              {total === 0
                ? "No fixtures yet. Generate them from the season page."
                : "No results recorded yet."}
            </p>
          ) : (
            <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
              {recent.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  {r.text}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

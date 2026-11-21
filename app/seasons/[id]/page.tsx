import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SeasonStatusBadge } from "@/components/seasons/SeasonStatusBadge";
import { TeamPicker } from "@/components/seasons/TeamPicker";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getParticipants, getSeason, getTeams } from "@/lib/data/seasons";
import { UUID_RE } from "@/lib/validation/auth";
import { formatDate } from "@/utils/dates";
import { TEAM_SELECTION_STATUS } from "@/types/league";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return { title: "Season" };
  const season = await getSeason(createClient(), params.id);
  return { title: season?.name ?? "Season" };
}

export default async function SeasonPage({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const season = await getSeason(supabase, params.id);
  if (!season) notFound();

  const [participants, teams, profile] = await Promise.all([
    getParticipants(supabase, season.id),
    getTeams(supabase),
    getCurrentProfile(),
  ]);

  const me = profile?.status === "APPROVED" ? profile : null;
  const mine = me ? participants.find((p) => p.user_id === me.id) : undefined;
  const selectionOpen = season.status === TEAM_SELECTION_STATUS;

  const takenBy: Record<string, { userId: string; username: string }> = {};
  participants.forEach((p) => {
    if (p.team_id) takenBy[p.team_id] = { userId: p.user_id, username: p.username };
  });

  return (
    <>
      <PageHeader
        title={season.name}
        description={`${formatDate(season.start_date)} to ${formatDate(season.end_date)}`}
        actions={<SeasonStatusBadge status={season.status} />}
      />

      <h2 className="mb-3 font-display text-2xl font-semibold">Players ({participants.length})</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <li key={p.id}>
            <Card className="flex items-center gap-3 py-3">
              {p.team ? (
                <TeamLogo name={p.team.name} shortName={p.team.short_name} logoUrl={p.team.logo_url} />
              ) : (
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-turf-600 text-chalk-faint"
                >
                  ?
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{p.username}</p>
                <p className="truncate text-sm text-chalk-dim">{p.team?.name ?? "No team yet"}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <section className="mt-12" aria-labelledby="team-heading">
        <h2 id="team-heading" className="mb-3 font-display text-2xl font-semibold">
          Choose your team
        </h2>

        {!me ? (
          <Card>
            <p className="text-chalk-dim">Log in to pick a team if you're playing in this season.</p>
            <Link href={`/login?next=/seasons/${season.id}`} className="mt-4 inline-block">
              <Button variant="secondary">Log in</Button>
            </Link>
          </Card>
        ) : !mine ? (
          <Card>
            <p className="text-chalk-dim">You're not playing in this season.</p>
          </Card>
        ) : !selectionOpen ? (
          <Card>
            <p className="text-chalk-dim">
              {mine.team
                ? `Team selection is closed. You're playing as ${mine.team.name}.`
                : "Team selection is closed. Ask the admin to assign you a team."}
            </p>
          </Card>
        ) : teams.length === 0 ? (
          <Card>
            <p className="text-chalk-dim">No teams are available yet. The admin needs to add some.</p>
          </Card>
        ) : (
          <TeamPicker
            seasonId={season.id}
            teams={teams}
            takenBy={takenBy}
            myTeamId={mine.team_id}
            myUserId={me.id}
          />
        )}
      </section>
    </>
  );
}

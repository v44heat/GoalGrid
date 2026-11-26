import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AvatarUploader } from "@/components/account/AvatarUploader";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { SubmitScoreForm } from "@/components/account/SubmitScoreForm";
import { CancelProposalButton } from "@/components/account/CancelProposalButton";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getFixtureRows } from "@/lib/data/fixtures";
import { getMyRecentProposals, getProposalsForFixtures } from "@/lib/data/proposals";
import { formatDate } from "@/utils/dates";
import type { ProposalStatus } from "@/types/proposals";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

const TONE: Record<ProposalStatus, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  SUPERSEDED: "neutral",
};
const LABEL: Record<ProposalStatus, string> = {
  PENDING: "waiting",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "withdrawn",
  SUPERSEDED: "replaced",
};

export default async function AccountPage() {
  const profile = await requireUser();
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The active season, and my matches in it that still need a result.
  const { data: active } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("status", "ACTIVE")
    .maybeSingle();

  const toReport = active
    ? (await getFixtureRows(supabase, active.id))
        .filter(
          (f) =>
            (f.home.userId === profile.id || f.away.userId === profile.id) &&
            f.result === null &&
            (f.status === "UPCOMING" || f.status === "POSTPONED")
        )
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.matchday - b.matchday)
        .slice(0, 8)
    : [];

  const [proposals, history] = await Promise.all([
    getProposalsForFixtures(supabase, toReport.map((f) => f.id)),
    getMyRecentProposals(supabase, profile.id, 8),
  ]);
  const waitingFor = new Map(proposals.filter((p) => p.status === "PENDING").map((p) => [p.fixtureId, p]));

  return (
    <>
      <PageHeader title="My account" description={user?.email ?? undefined} />

      <Card className="mb-10">
        <AvatarUploader username={profile.username} avatarPath={profile.avatar_path} />
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-chalk-dim">Username</dt>
            <dd className="font-medium">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-chalk-dim">Member since</dt>
            <dd className="font-medium">{formatDate(profile.created_at.slice(0, 10))}</dd>
          </div>
          <div>
            <dt className="text-chalk-dim">Account</dt>
            <dd className="font-medium">{profile.role === "ADMIN" ? "Admin" : "Player"}</dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="report-heading" className="mb-10">
        <h2 id="report-heading" className="mb-1 font-display text-2xl font-semibold">
          Report a score
        </h2>
        <p className="mb-3 text-sm text-chalk-dim">
          Played a match? Enter the final score and the admin will check it before it counts.
          {active ? ` Season: ${active.name}.` : ""}
        </p>

        {toReport.length === 0 ? (
          <Card>
            <p className="text-chalk-dim">
              {active
                ? "You have no matches waiting for a score."
                : "There is no active season right now."}
            </p>
          </Card>
        ) : (
          <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
            {toReport.map((f) => {
              const waiting = waitingFor.get(f.id);
              return (
                <li key={f.id} className="px-4 py-4">
                  <p className="font-medium">
                    {f.home.username} <span className="text-chalk-faint">vs</span> {f.away.username}
                  </p>
                  <p className="mb-3 text-sm text-chalk-dim">
                    Matchday {f.matchday} · {formatDate(f.scheduledDate)}
                  </p>
                  {waiting ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone="warning">waiting for admin</Badge>
                      <span className="text-sm">
                        {waiting.submittedByName} reported {waiting.homeScore} - {waiting.awayScore}
                      </span>
                      {waiting.submittedBy === profile.id && <CancelProposalButton proposalId={waiting.id} />}
                    </div>
                  ) : (
                    <SubmitScoreForm fixtureId={f.id} homeName={f.home.username} awayName={f.away.username} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-heading" className="mb-10">
        <h2 id="history-heading" className="mb-3 font-display text-2xl font-semibold">
          My submissions
        </h2>
        {history.length === 0 ? (
          <Card className="flex items-center gap-3 text-chalk-dim">
            <Inbox className="h-5 w-5" aria-hidden />
            Scores you submit will appear here with the admin decision.
          </Card>
        ) : (
          <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="tabular font-medium">
                    {p.homeScore} - {p.awayScore}
                  </p>
                  {p.decisionNote && <p className="text-sm text-chalk-dim">{p.decisionNote}</p>}
                </div>
                <div className="flex items-center gap-3 text-sm text-chalk-faint">
                  {formatDate(p.createdAt.slice(0, 10))}
                  <Badge tone={TONE[p.status]}>{LABEL[p.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="password-heading">
        <h2 id="password-heading" className="mb-3 font-display text-2xl font-semibold">
          Change password
        </h2>
        <Card>
          <ChangePasswordForm />
        </Card>
      </section>
    </>
  );
}

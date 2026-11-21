"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { selectTeamAction } from "@/app/seasons/actions";
import { cn } from "@/utils/cn";
import type { Team } from "@/types/database";

export function TeamPicker({
  seasonId,
  teams,
  takenBy,
  myTeamId,
  myUserId,
}: {
  seasonId: string;
  teams: Team[];
  /** teamId -> { userId, username } for every team already picked in this season */
  takenBy: Record<string, { userId: string; username: string }>;
  myTeamId: string | null;
  myUserId: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<string | null>(null);

  function confirm() {
    if (!choice) return;
    startTransition(async () => {
      const res = await selectTeamAction(seasonId, choice);
      if (res.ok) {
        toast("success", res.message ?? "Team selected.");
        setChoice(null);
      } else {
        toast("error", res.error ?? "Something went wrong.");
      }
      router.refresh(); // shows teams other players picked in the meantime
    });
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {teams.map((t) => {
          const owner = takenBy[t.id];
          const mine = owner?.userId === myUserId;
          const locked = Boolean(owner) && !mine;
          const picked = choice === t.id;

          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={locked || pending}
                aria-pressed={picked}
                onClick={() => setChoice(t.id)}
                className={cn(
                  "relative flex h-full w-full flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grass",
                  locked && "cursor-not-allowed border-turf-700 bg-turf-900/50 opacity-60",
                  !locked && !picked && !mine && "border-turf-600 bg-turf-800 hover:border-grass/60",
                  mine && !picked && "border-grass/60 bg-grass/10",
                  picked && "border-grass bg-grass/20 shadow-glow"
                )}
              >
                {locked && <Lock className="absolute right-3 top-3 h-4 w-4 text-chalk-faint" aria-hidden />}
                {(mine || picked) && !locked && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-grass" aria-hidden />
                )}
                <TeamLogo name={t.name} shortName={t.short_name} logoUrl={t.logo_url} className="h-14 w-14" />
                <span className="font-medium leading-tight">{t.name}</span>
                <span className="text-xs text-chalk-dim">
                  {locked ? `Selected by ${owner.username}` : mine ? "Your team" : "Available"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={confirm} loading={pending} disabled={!choice || choice === myTeamId}>
          Confirm team
        </Button>
        {!choice && <p className="text-sm text-chalk-dim">Pick an available team, then confirm.</p>}
      </div>
    </div>
  );
}

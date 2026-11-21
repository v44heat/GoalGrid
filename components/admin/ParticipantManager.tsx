"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  addParticipantAction,
  assignTeamAction,
  removeParticipantAction,
} from "@/app/admin/seasons/actions";
import type { Team } from "@/types/database";
import type { ParticipantRow } from "@/types/league";

export function ParticipantManager({
  seasonId,
  isDraft,
  canEditTeams,
  participants,
  teams,
  addable,
}: {
  seasonId: string;
  isDraft: boolean;
  canEditTeams: boolean;
  participants: ParticipantRow[];
  teams: Team[];
  addable: { id: string; username: string }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<ParticipantRow | null>(null);
  const [toAdd, setToAdd] = useState("");

  const takenBy = new Map<string, string>();
  participants.forEach((p) => p.team_id && takenBy.set(p.team_id, p.user_id));

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast("success", res.message ?? "Saved.");
        router.refresh();
      } else {
        toast("error", res.error ?? "Something went wrong.");
        router.refresh(); // resets any dropdown back to the saved value
      }
    });
  }

  return (
    <>
      <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
        {participants.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="font-medium">{p.username}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`team-${p.id}`}>
                Team for {p.username}
              </label>
              <select
                id={`team-${p.id}`}
                disabled={!canEditTeams || pending}
                value={p.team_id ?? ""}
                onChange={(e) =>
                  run(() => assignTeamAction(seasonId, p.user_id, e.target.value || null))
                }
                className="h-10 rounded-lg border border-turf-600 bg-turf-900 px-3 text-sm disabled:opacity-60"
              >
                <option value="">No team</option>
                {teams.map((t) => {
                  const owner = takenBy.get(t.id);
                  const takenByOther = owner !== undefined && owner !== p.user_id;
                  return (
                    <option key={t.id} value={t.id} disabled={takenByOther}>
                      {t.name}
                      {takenByOther ? " (taken)" : ""}
                    </option>
                  );
                })}
              </select>
              {isDraft && (
                <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} disabled={pending}>
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isDraft && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="add-player">
            Add a player
          </label>
          <select
            id="add-player"
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
            className="h-10 rounded-lg border border-turf-600 bg-turf-900 px-3 text-sm"
          >
            <option value="">{addable.length ? "Add a player…" : "No other approved players"}</option>
            {addable.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!toAdd}
            loading={pending}
            onClick={() => {
              const id = toAdd;
              setToAdd("");
              run(() => addParticipantAction(seasonId, id));
            }}
          >
            Add player
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.username ?? "player"}?`}
        description="They'll be taken out of this season and their team becomes available again."
        confirmLabel="Remove"
        loading={pending}
        onConfirm={() => {
          if (!removing) return;
          const userId = removing.user_id;
          setRemoving(null);
          run(() => removeParticipantAction(seasonId, userId));
        }}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  discardFixturesAction,
  generateFixturesAction,
  startSeasonAction,
} from "@/app/admin/seasons/fixture-actions";
import type { ActionState } from "@/types/actions";

type Dialog = "discard" | "start" | null;

export function SeasonControls({
  seasonId,
  seasonName,
  isDraft,
  fixtureCount,
  canGenerate,
  playersWithoutTeam,
}: {
  seasonId: string;
  seasonName: string;
  isDraft: boolean;
  fixtureCount: number;
  canGenerate: boolean;
  playersWithoutTeam: string[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);

  function run(fn: () => Promise<ActionState>) {
    startTransition(async () => {
      const res = await fn();
      setDialog(null);
      toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
      router.refresh();
    });
  }

  if (!isDraft) return null;

  if (fixtureCount === 0) {
    return (
      <Button
        loading={pending}
        disabled={!canGenerate}
        onClick={() => run(() => generateFixturesAction(seasonId))}
      >
        Confirm and generate fixtures
      </Button>
    );
  }

  const blocked = playersWithoutTeam.length > 0;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDialog("start")} disabled={blocked || pending}>
          Start season
        </Button>
        <Button variant="secondary" onClick={() => setDialog("discard")} disabled={pending}>
          Discard fixtures
        </Button>
      </div>
      {blocked && (
        <p className="mt-3 text-sm text-gold">
          Waiting for a team from: {playersWithoutTeam.join(", ")}. Starting needs every player to have one.
        </p>
      )}

      <ConfirmDialog
        open={dialog === "start"}
        title={`Start ${seasonName}?`}
        description="Players will no longer be able to pick teams, and the player list is locked."
        confirmLabel="Start season"
        loading={pending}
        onConfirm={() => run(() => startSeasonAction(seasonId))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "discard"}
        title="Discard all fixtures?"
        description="The generated list is deleted so you can change players. You can generate a new one afterwards."
        confirmLabel="Discard"
        loading={pending}
        onConfirm={() => run(() => discardFixturesAction(seasonId))}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

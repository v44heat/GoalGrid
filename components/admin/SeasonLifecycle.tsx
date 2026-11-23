"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  archiveSeasonAction,
  completeSeasonAction,
  reopenSeasonAction,
} from "@/app/admin/seasons/lifecycle-actions";
import type { ActionState } from "@/types/actions";
import type { SeasonStatus } from "@/types/database";

type Dialog = "complete" | "archive" | "reopen" | null;

export function SeasonLifecycle({
  seasonId,
  seasonName,
  status,
  unplayed,
}: {
  seasonId: string;
  seasonName: string;
  status: SeasonStatus;
  /** fixtures that are still upcoming or postponed */
  unplayed: number;
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

  if (status === "DRAFT") return null;

  if (status === "ARCHIVED") {
    return <p className="text-chalk-dim">This season is archived. It stays in the Hall of Fame and is read-only.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {status === "ACTIVE" && (
          <Button onClick={() => setDialog("complete")} disabled={pending}>
            Complete season
          </Button>
        )}
        {status === "COMPLETED" && (
          <>
            <Button onClick={() => setDialog("archive")} disabled={pending}>
              Archive season
            </Button>
            <Button variant="ghost" onClick={() => setDialog("reopen")} disabled={pending}>
              Reopen season
            </Button>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-chalk-faint">
        {status === "ACTIVE"
          ? "Completing locks results and teams and crowns the champion."
          : "Results and teams are locked. Reopen only if it was completed by mistake."}
      </p>

      <ConfirmDialog
        open={dialog === "complete"}
        title={`Complete ${seasonName}?`}
        description={
          unplayed > 0
            ? `${unplayed} ${unplayed === 1 ? "match has" : "matches have"} no result and will not count. Results lock and the champion is decided from the current table.`
            : "All matches have results. Results lock and the champion is decided."
        }
        confirmLabel="Complete season"
        loading={pending}
        onConfirm={() => run(() => completeSeasonAction(seasonId))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "archive"}
        title={`Archive ${seasonName}?`}
        description="It moves to the archive and can no longer be reopened. It stays in the Hall of Fame."
        confirmLabel="Archive"
        loading={pending}
        onConfirm={() => run(() => archiveSeasonAction(seasonId))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "reopen"}
        title={`Reopen ${seasonName}?`}
        description="Results can be edited again and the season leaves the Hall of Fame until you complete it again."
        confirmLabel="Reopen"
        loading={pending}
        onConfirm={() => run(() => reopenSeasonAction(seasonId))}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

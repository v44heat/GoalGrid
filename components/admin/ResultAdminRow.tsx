"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteResultAction, saveResultAction } from "@/app/admin/results/actions";
import type { FixtureRow } from "@/types/fixtures";

const scoreInput =
  "tabular h-10 w-14 rounded-lg border border-turf-600 bg-turf-900 text-center text-lg font-semibold " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-grass disabled:opacity-60";

export function ResultAdminRow({ fixture, editable }: { fixture: FixtureRow; editable: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const saved = fixture.result;
  const [home, setHome] = useState(saved ? String(saved.homeScore) : "");
  const [away, setAway] = useState(saved ? String(saved.awayScore) : "");

  const valid = (v: string) => /^\d{1,2}$/.test(v);
  const complete = valid(home) && valid(away);
  const dirty = saved ? home !== String(saved.homeScore) || away !== String(saved.awayScore) : home !== "" || away !== "";

  function done(res: { ok: boolean; message?: string; error?: string }, onFail?: () => void) {
    if (res.ok) {
      toast("success", res.message ?? "Saved.");
    } else {
      toast("error", res.error ?? "Something went wrong.");
      onFail?.();
    }
    router.refresh();
  }

  function save() {
    startTransition(async () => {
      done(await saveResultAction(fixture.id, Number(home), Number(away)), () => {
        setHome(saved ? String(saved.homeScore) : "");
        setAway(saved ? String(saved.awayScore) : "");
      });
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteResultAction(fixture.id);
      setConfirming(false);
      if (res.ok) {
        setHome("");
        setAway("");
      }
      done(res);
    });
  }

  const cancelled = fixture.status === "CANCELLED";
  const names = `${fixture.home.username} vs ${fixture.away.username}`;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="grid min-w-[14rem] flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate text-right font-medium">{fixture.home.username}</p>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`h-${fixture.id}`}>{`${fixture.home.username} goals`}</label>
          <input
            id={`h-${fixture.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={home}
            disabled={!editable || cancelled || pending}
            onChange={(e) => setHome(e.target.value)}
            className={scoreInput}
          />
          <span aria-hidden className="text-chalk-faint">-</span>
          <label className="sr-only" htmlFor={`a-${fixture.id}`}>{`${fixture.away.username} goals`}</label>
          <input
            id={`a-${fixture.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={away}
            disabled={!editable || cancelled || pending}
            onChange={(e) => setAway(e.target.value)}
            className={scoreInput}
          />
        </div>
        <p className="truncate font-medium">{fixture.away.username}</p>
      </div>

      <div className="flex items-center gap-2">
        {cancelled ? (
          <span className="text-sm text-gold">Cancelled</span>
        ) : (
          <>
            <Button
              size="sm"
              variant={saved ? "secondary" : "primary"}
              disabled={!editable || !dirty || !complete}
              loading={pending}
              onClick={save}
            >
              {saved ? "Update" : "Save"}
            </Button>
            {saved && (
              <Button size="sm" variant="ghost" disabled={!editable || pending} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this result?"
        description={`${names} goes back to upcoming and the league table recalculates without it.`}
        confirmLabel="Delete result"
        loading={pending}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </li>
  );
}

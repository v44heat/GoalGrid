"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { approveProposalAction, rejectProposalAction } from "@/app/admin/approvals/actions";
import { formatDate } from "@/utils/dates";
import type { ApprovalItem } from "@/types/proposals";

const box =
  "tabular h-10 w-14 rounded-lg border border-turf-600 bg-turf-900 text-center text-lg font-semibold " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-grass disabled:opacity-60";

export function ApprovalRow({ item }: { item: ApprovalItem }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [home, setHome] = useState(String(item.homeScore));
  const [away, setAway] = useState(String(item.awayScore));
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const valid = (v: string) => /^\d{1,2}$/.test(v);
  const changed = home !== String(item.homeScore) || away !== String(item.awayScore);

  function done(res: { ok: boolean; message?: string; error?: string }) {
    toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
    router.refresh();
  }

  return (
    <li className="px-4 py-4">
      <p className="text-sm text-chalk-dim">
        {item.seasonName} · Matchday {item.matchday} · {formatDate(item.scheduledDate)}
      </p>
      <p className="mt-0.5 text-sm text-chalk-faint">
        Submitted by <span className="text-chalk">{item.submittedByName}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="min-w-[5rem] text-right font-medium">{item.homeName}</span>
        <label className="sr-only" htmlFor={`ah-${item.id}`}>{`${item.homeName} goals`}</label>
        <input
          id={`ah-${item.id}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={home}
          disabled={pending}
          onChange={(e) => setHome(e.target.value)}
          className={box}
        />
        <span aria-hidden className="text-chalk-faint">
          -
        </span>
        <label className="sr-only" htmlFor={`aa-${item.id}`}>{`${item.awayName} goals`}</label>
        <input
          id={`aa-${item.id}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={away}
          disabled={pending}
          onChange={(e) => setAway(e.target.value)}
          className={box}
        />
        <span className="min-w-[5rem] font-medium">{item.awayName}</span>
      </div>

      {changed && (
        <p className="mt-2 text-sm text-gold">
          You changed the score from {item.homeScore}-{item.awayScore}. The audit log will record both.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          loading={pending}
          disabled={!valid(home) || !valid(away) || rejecting}
          onClick={() => startTransition(async () => done(await approveProposalAction(item.id, Number(home), Number(away))))}
        >
          {changed ? "Approve with changes" : "Approve"}
        </Button>
        {!rejecting && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(true)}>
            Reject
          </Button>
        )}
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`note-${item.id}`}>
            Reason for rejecting (optional)
          </label>
          <input
            id={`note-${item.id}`}
            type="text"
            maxLength={300}
            value={note}
            placeholder="Reason (optional)"
            onChange={(e) => setNote(e.target.value)}
            className="h-10 min-w-[12rem] flex-1 rounded-lg border border-turf-600 bg-turf-900 px-3 text-sm"
          />
          <Button
            size="sm"
            variant="danger"
            loading={pending}
            onClick={() => startTransition(async () => done(await rejectProposalAction(item.id, note)))}
          >
            Confirm reject
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}

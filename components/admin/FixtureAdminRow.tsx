"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateFixtureAction } from "@/app/admin/fixtures/actions";
import { ADMIN_FIXTURE_STATUSES, type FixtureRow } from "@/types/fixtures";

export function FixtureAdminRow({
  fixture,
  minDate,
  maxDate,
}: {
  fixture: FixtureRow;
  minDate: string;
  maxDate: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(fixture.scheduledDate);
  const [status, setStatus] = useState<string>(fixture.status);

  const played = fixture.status === "PLAYED";
  const dirty = date !== fixture.scheduledDate || status !== fixture.status;

  function save() {
    startTransition(async () => {
      const res = await updateFixtureAction(fixture.id, date, status);
      if (res.ok) {
        toast("success", res.message ?? "Saved.");
      } else {
        toast("error", res.error ?? "Something went wrong.");
        setDate(fixture.scheduledDate);
        setStatus(fixture.status);
      }
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="min-w-[10rem] font-medium">
        {fixture.home.username} <span className="text-chalk-faint">vs</span> {fixture.away.username}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`date-${fixture.id}`}>
          Date for {fixture.home.username} vs {fixture.away.username}
        </label>
        <input
          id={`date-${fixture.id}`}
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          disabled={played || pending}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-lg border border-turf-600 bg-turf-900 px-3 text-sm disabled:opacity-60"
        />
        <label className="sr-only" htmlFor={`status-${fixture.id}`}>
          Status
        </label>
        {played ? (
          <span className="px-2 text-sm text-grass">Played</span>
        ) : (
          <select
            id={`status-${fixture.id}`}
            value={status}
            disabled={pending}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-turf-600 bg-turf-900 px-3 text-sm"
          >
            {ADMIN_FIXTURE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        )}
        {!played && (
          <Button size="sm" variant="secondary" disabled={!dirty} loading={pending} onClick={save}>
            Save
          </Button>
        )}
      </div>
    </li>
  );
}

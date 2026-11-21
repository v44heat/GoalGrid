"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createSeasonAction } from "@/app/admin/seasons/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialActionState } from "@/types/actions";
import { addDays, formatDate, isValidIsoDate } from "@/utils/dates";
import { cn } from "@/utils/cn";

export function SeasonForm({ players }: { players: { id: string; username: string }[] }) {
  const [state, formAction] = useFormState(createSeasonAction, initialActionState);
  const [start, setStart] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fe = state.fieldErrors ?? {};

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = players.length > 0 && selected.size === players.length;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-card/50 bg-card/10 px-4 py-3 text-sm text-[#ff9a9e]">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Season name" name="name" placeholder="E-Football Season 1" error={fe.name} required />
        </div>
        <Input
          label="Start date"
          name="start_date"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          error={fe.start_date}
          required
        />
        <div>
          <p className="mb-1.5 text-sm font-medium">End date</p>
          <p className="flex h-11 items-center rounded-lg border border-turf-700 bg-turf-900/50 px-3 text-chalk-dim">
            {isValidIsoDate(start) ? formatDate(addDays(start, 29)) : "Set automatically"}
          </p>
          <p className="mt-1.5 text-sm text-chalk-faint">A season always lasts 30 days.</p>
        </div>
      </div>

      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="text-sm font-medium">Participants</legend>
          {players.length > 0 && (
            <button
              type="button"
              className="text-sm text-grass hover:underline"
              onClick={() => setSelected(allSelected ? new Set() : new Set(players.map((p) => p.id)))}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          )}
        </div>

        {players.length === 0 ? (
          <p className="rounded-lg border border-dashed border-turf-600 px-4 py-6 text-center text-sm text-chalk-dim">
            No approved players yet. Approve registrations on the Players page first.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <li key={p.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3",
                    selected.has(p.id) ? "border-grass bg-grass/10" : "border-turf-600 hover:bg-turf-800"
                  )}
                >
                  <input
                    type="checkbox"
                    name="participants"
                    value={p.id}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 accent-[#3fdc7f]"
                  />
                  {p.username}
                </label>
              </li>
            ))}
          </ul>
        )}
        {fe.participants && <p className="mt-2 text-sm text-[#ff7b80]">{fe.participants}</p>}
        <p className="mt-2 text-sm text-chalk-faint">{selected.size} selected. At least 2 are needed.</p>
      </fieldset>

      <SubmitButton>Create season</SubmitButton>
    </form>
  );
}

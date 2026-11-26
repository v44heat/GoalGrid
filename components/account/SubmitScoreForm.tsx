"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { submitScoreAction } from "@/app/account/actions";

const box =
  "tabular h-10 w-14 rounded-lg border border-turf-600 bg-turf-900 text-center text-lg font-semibold " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-grass disabled:opacity-60";

export function SubmitScoreForm({
  fixtureId,
  homeName,
  awayName,
}: {
  fixtureId: string;
  homeName: string;
  awayName: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  const valid = (v: string) => /^\d{1,2}$/.test(v);

  function submit() {
    startTransition(async () => {
      const res = await submitScoreAction(fixtureId, Number(home), Number(away));
      toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
      if (res.ok) {
        setHome("");
        setAway("");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`sh-${fixtureId}`}>{`${homeName} goals`}</label>
      <input
        id={`sh-${fixtureId}`}
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
      <label className="sr-only" htmlFor={`sa-${fixtureId}`}>{`${awayName} goals`}</label>
      <input
        id={`sa-${fixtureId}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={away}
        disabled={pending}
        onChange={(e) => setAway(e.target.value)}
        className={box}
      />
      <Button size="sm" loading={pending} disabled={!valid(home) || !valid(away)} onClick={submit}>
        Submit score
      </Button>
    </div>
  );
}

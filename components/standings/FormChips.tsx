import { cn } from "@/utils/cn";
import type { FormResult } from "@/lib/league/standings";

const STYLE: Record<FormResult, string> = {
  W: "bg-grass text-turf-950",
  D: "bg-chalk-faint/40 text-chalk",
  L: "bg-card text-white",
};

/** Last results, oldest to newest. Letters carry the meaning, so colour is never the only cue. */
export function FormChips({ form }: { form: FormResult[] }) {
  if (form.length === 0) return <span className="text-chalk-faint">-</span>;
  return (
    <span role="img" aria-label={`Form: ${form.join(", ")}`} className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold",
            STYLE[r]
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

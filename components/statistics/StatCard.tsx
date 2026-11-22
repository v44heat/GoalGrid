import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function StatCard({
  title,
  value,
  holders,
  caption,
}: {
  title: string;
  /** The record itself, e.g. "9 goals". Null when nobody holds it yet. */
  value: ReactNode | null;
  holders?: string;
  caption?: string;
}) {
  return (
    <Card className="flex flex-col">
      <h3 className="text-sm font-medium text-chalk-dim">{title}</h3>
      {value === null ? (
        <p className="mt-3 font-display text-3xl font-semibold text-chalk-faint">-</p>
      ) : (
        <>
          <p className="tabular mt-2 font-display text-4xl font-bold text-grass">{value}</p>
          {holders && <p className="mt-1 font-medium">{holders}</p>}
        </>
      )}
      {caption && <p className="mt-auto pt-3 text-xs text-chalk-faint">{caption}</p>}
    </Card>
  );
}

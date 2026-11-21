import Link from "next/link";
import { cn } from "@/utils/cn";
import type { Season } from "@/types/database";

/** Chips for switching season. Renders nothing when there is only one. */
export function SeasonSwitcher({
  seasons,
  currentId,
  basePath,
}: {
  seasons: Pick<Season, "id" | "name">[];
  currentId: string;
  basePath: string;
}) {
  if (seasons.length < 2) return null;
  return (
    <nav aria-label="Season" className="mb-6 flex flex-wrap gap-2">
      {seasons.map((s) => (
        <Link
          key={s.id}
          href={`${basePath}?season=${s.id}`}
          aria-current={s.id === currentId ? "page" : undefined}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm",
            s.id === currentId
              ? "border-grass bg-grass/10 text-grass"
              : "border-turf-600 text-chalk-dim hover:text-chalk"
          )}
        >
          {s.name}
        </Link>
      ))}
    </nav>
  );
}

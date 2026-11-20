import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-turf-600 px-6 py-14 text-center">
      <Icon className="mb-4 h-10 w-10 text-chalk-faint" aria-hidden />
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-chalk-dim">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

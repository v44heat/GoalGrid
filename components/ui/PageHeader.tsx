import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-2 text-chalk-dim">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

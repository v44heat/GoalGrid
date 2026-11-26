import Link from "next/link";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/utils/cn";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;
const TIMEZONE = "Africa/Nairobi";

const FILTERS = [
  { value: "", label: "All" },
  { value: "result", label: "Results" },
  { value: "player", label: "Players" },
  { value: "season", label: "Seasons" },
  { value: "participant", label: "Participants" },
  { value: "fixture", label: "Fixtures" },
  { value: "team", label: "Teams" },
] as const;
const ENTITY_VALUES = FILTERS.map((f) => f.value).filter(Boolean) as string[];

interface Row {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TIMEZONE });

export default async function AuditLogPage({ searchParams }: { searchParams: { type?: string; page?: string } }) {
  const type = ENTITY_VALUES.includes(searchParams.type ?? "") ? (searchParams.type as string) : "";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createClient();
  let query = supabase
    .from("admin_actions")
    .select("id, actor_name, action, entity_type, summary, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (type) query = query.eq("entity_type", type);

  const { data, count } = await query;
  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number, t = type) => {
    const q = new URLSearchParams();
    if (t) q.set("type", t);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin action, with who did it and when. Entries cannot be edited or deleted from the app."
      />

      <nav aria-label="Filter" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={href(1, f.value)}
            aria-current={f.value === type ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              f.value === type
                ? "border-grass bg-grass/10 text-grass"
                : "border-turf-600 text-chalk-dim hover:text-chalk"
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No entries yet"
          description="Actions such as approving players, recording results and starting seasons will be listed here."
        />
      ) : (
        <>
          <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 font-medium">{r.summary}</p>
                  <p className="shrink-0 text-xs text-chalk-faint">{when.format(new Date(r.created_at))}</p>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-chalk-dim">
                  <span>
                    by <span className="text-chalk">{r.actor_name}</span>
                  </span>
                  <Badge>{r.action}</Badge>
                </p>
                {Object.keys(r.details ?? {}).length > 0 && (
                  <details className="mt-1 text-xs text-chalk-faint">
                    <summary className="cursor-pointer">Details</summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-turf-900 p-2">
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-chalk-dim">
              Page {page} of {lastPage} · {total} {total === 1 ? "entry" : "entries"}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={href(page - 1)}>
                  <Button variant="secondary" size="sm">
                    Newer
                  </Button>
                </Link>
              )}
              {page < lastPage && (
                <Link href={href(page + 1)}>
                  <Button variant="secondary" size="sm">
                    Older
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

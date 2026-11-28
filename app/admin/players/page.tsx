import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { PlayerActions } from "@/components/admin/PlayerActions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile, UserStatus } from "@/types/database";

export const metadata = { title: "Players" };
export const dynamic = "force-dynamic";

const ORDER: Record<UserStatus, number> = { PENDING: 0, APPROVED: 1, SUSPENDED: 2 };
const TONE = { PENDING: "warning", APPROVED: "success", SUSPENDED: "danger" } as const;

export default async function AdminPlayersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("id, username, role, status, avatar_path, created_at, updated_at")
    .is("deleted_at", null) // accounts people deleted are kept only as anonymous history, never listed here
    .order("created_at", { ascending: true });
  const users = ((data ?? []) as UserProfile[]).sort(
    (a, b) => ORDER[a.status] - ORDER[b.status]
  );

  // Emails live in Supabase Auth and are only readable with the service role.
  // The admin layout has already verified the caller is an admin.
  const emails = new Map<string, string>();
  try {
    const { data: list } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
    list?.users.forEach((u) => u.email && emails.set(u.id, u.email));
  } catch (err) {
    console.error("listUsers failed:", err);
  }

  return (
    <>
      <PageHeader title="Players" description="Approve new registrations and manage access." />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No players yet"
          description="Registrations appear here for approval."
        />
      ) : (
        <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.username} path={u.avatar_path} size={40} />
                <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{u.username}</span>
                  {u.role === "ADMIN" && <Badge>Admin</Badge>}
                  <Badge tone={TONE[u.status]}>{u.status.toLowerCase()}</Badge>
                </p>
                <p className="truncate text-sm text-chalk-dim">
                  {emails.get(u.id) ?? "No email"}
                  <span className="text-chalk-faint">
                    {" "}
                    · joined {new Date(u.created_at).toLocaleDateString("en-GB")}
                  </span>
                </p>
                </div>
              </div>
              {u.role !== "ADMIN" && (
                <div className="flex gap-2">
                  <PlayerActions userId={u.id} username={u.username} status={u.status} hasAvatar={Boolean(u.avatar_path)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";
import { createClient } from "@/lib/supabase/server";
import { countPendingProposals } from "@/lib/data/proposals";

// Server-side role check for every /admin page, independent of the middleware.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const waiting = await countPendingProposals(createClient());
  return (
    <>
      <AdminNav waitingScores={waiting} />
      {children}
    </>
  );
}

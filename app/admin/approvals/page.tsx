import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApprovalRow } from "@/components/admin/ApprovalRow";
import { createClient } from "@/lib/supabase/server";
import { getPendingApprovals } from "@/lib/data/proposals";

export const metadata = { title: "Score approvals" };
export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  const items = await getPendingApprovals(createClient());

  return (
    <>
      <PageHeader
        title="Score approvals"
        description="Scores players have reported. Approve them as they are, or correct the numbers first."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing waiting"
          description="When a player reports a score it shows up here. You can still enter any result yourself under Results."
        />
      ) : (
        <ul className="divide-y divide-turf-700 rounded-xl border border-turf-700 bg-turf-800/70">
          {items.map((item) => (
            <ApprovalRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}

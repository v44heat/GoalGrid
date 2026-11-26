"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cancelProposalAction } from "@/app/account/actions";

export function CancelProposalButton({ proposalId }: { proposalId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelProposalAction(proposalId);
          toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
          router.refresh();
        })
      }
    >
      Withdraw
    </Button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { changePlayerStatus, removePlayerAvatarAction } from "@/app/admin/players/actions";
import type { UserStatus } from "@/types/database";

export function PlayerActions({
  userId,
  username,
  status,
  hasAvatar = false,
}: {
  userId: string;
  username: string;
  status: UserStatus;
  hasAvatar?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(action: "approve" | "suspend" | "reactivate") {
    startTransition(async () => {
      const result = await changePlayerStatus(userId, action);
      setConfirming(false);
      if (result.ok) {
        toast("success", result.message ?? "Saved.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Something went wrong.");
      }
    });
  }

  function removePicture() {
    startTransition(async () => {
      const result = await removePlayerAvatarAction(userId);
      toast(result.ok ? "success" : "error", (result.ok ? result.message : result.error) ?? "Done.");
      router.refresh();
    });
  }

  return (
    <>
      {hasAvatar && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={removePicture}>
          Remove photo
        </Button>
      )}
      {status === "PENDING" && (
        <Button size="sm" loading={pending} onClick={() => run("approve")}>
          Approve
        </Button>
      )}
      {status === "APPROVED" && (
        <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
          Suspend
        </Button>
      )}
      {status === "SUSPENDED" && (
        <Button size="sm" variant="secondary" loading={pending} onClick={() => run("reactivate")}>
          Reactivate
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Suspend ${username}?`}
        description="They won't be able to log in until you reactivate them. Their past results stay in the league."
        confirmLabel="Suspend"
        loading={pending}
        onConfirm={() => run("suspend")}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

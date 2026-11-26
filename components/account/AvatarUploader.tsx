"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { removeAvatarAction, uploadAvatarAction } from "@/app/account/actions";
import { photoToAvatarBlob } from "@/lib/avatar/resize";

export function AvatarUploader({ username, avatarPath }: { username: string; avatarPath: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preparing, setPreparing] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    try {
      const blob = await photoToAvatarBlob(file);
      const data = new FormData();
      data.append("avatar", blob, "avatar.jpg");
      startTransition(async () => {
        const res = await uploadAvatarAction(data);
        toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
        router.refresh();
      });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Couldn't process that picture.");
    } finally {
      setPreparing(false);
      if (input.current) input.current.value = ""; // allow choosing the same file again
    }
  }

  function remove() {
    startTransition(async () => {
      const res = await removeAvatarAction();
      toast(res.ok ? "success" : "error", (res.ok ? res.message : res.error) ?? "Done.");
      router.refresh();
    });
  }

  const busy = pending || preparing;

  return (
    <div className="flex items-center gap-4">
      <Avatar name={username} path={avatarPath} size={88} />
      <div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}>
            {avatarPath ? "Change photo" : "Add photo"}
          </Button>
          {avatarPath && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-chalk-faint">Any photo works. It is cropped to a square and shrunk for you.</p>
        <label className="sr-only" htmlFor="avatar-file">
          Choose a profile picture
        </label>
        <input
          ref={input}
          id="avatar-file"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

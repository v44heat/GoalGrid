"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { TeamLogo } from "@/components/teams/TeamLogo";
import { deleteTeamAction, updateTeamAction } from "@/app/admin/teams/actions";
import type { Team } from "@/types/database";

export function TeamRow({ team }: { team: Team }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTeamAction(data);
      if (res.ok) {
        setErrors({});
        setEditing(false);
        toast("success", res.message ?? "Saved.");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        if (res.error) toast("error", res.error);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteTeamAction(team.id);
      setConfirming(false);
      if (res.ok) {
        toast("success", res.message ?? "Removed.");
        router.refresh();
      } else {
        toast("error", res.error ?? "Something went wrong.");
      }
    });
  }

  if (editing) {
    return (
      <li className="px-4 py-4">
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2" noValidate>
          <input type="hidden" name="id" value={team.id} />
          <Input label="Team name" name="name" defaultValue={team.name} error={errors.name} required />
          <Input
            label="Short name"
            name="short_name"
            defaultValue={team.short_name}
            maxLength={4}
            error={errors.short_name}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Replace logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              error={errors.logo}
              className="!h-auto !py-2 file:mr-3 file:rounded-md file:border-0 file:bg-turf-600 file:px-3 file:py-1.5 file:text-chalk"
            />
            {team.logo_url && (
              <label className="mt-2 flex items-center gap-2 text-sm text-chalk-dim">
                <input type="checkbox" name="remove_logo" className="h-4 w-4 accent-[#3fdc7f]" />
                Remove current logo
              </label>
            )}
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <TeamLogo name={team.name} shortName={team.short_name} logoUrl={team.logo_url} />
        <div>
          <p className="font-medium">{team.name}</p>
          <p className="text-sm text-chalk-faint">{team.short_name}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          Remove
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Remove ${team.name}?`}
        description="Teams already used in a season can't be removed."
        confirmLabel="Remove"
        loading={pending}
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      />
    </li>
  );
}

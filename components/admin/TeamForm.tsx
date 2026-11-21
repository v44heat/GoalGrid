"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createTeamAction } from "@/app/admin/teams/actions";

export function TeamForm() {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const res = await createTeamAction(data);
      if (res.ok) {
        setErrors({});
        form.reset();
        toast("success", res.message ?? "Team added.");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        if (res.error) toast("error", res.error);
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-turf-700 bg-turf-800/70 p-5 sm:grid-cols-2"
      noValidate
    >
      <Input label="Team name" name="name" error={errors.name} required />
      <Input
        label="Short name"
        name="short_name"
        maxLength={4}
        hint="2 to 4 letters, like BAR."
        error={errors.short_name}
        required
      />
      <div className="sm:col-span-2">
        <Input
          label="Logo (optional)"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hint="PNG, JPG or WebP, up to 1 MB. A square image on a transparent background works best."
          error={errors.logo}
          className="!h-auto !py-2 file:mr-3 file:rounded-md file:border-0 file:bg-turf-600 file:px-3 file:py-1.5 file:text-chalk"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Add team
        </Button>
      </div>
    </form>
  );
}

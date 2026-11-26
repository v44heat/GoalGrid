"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { changePasswordAction } from "@/app/account/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useToast } from "@/components/ui/Toast";
import { initialActionState } from "@/types/actions";

export function ChangePasswordForm() {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(changePasswordAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  // Clear the typed passwords after a successful change.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast("success", state.message ?? "Password changed.");
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-card/50 bg-card/10 px-4 py-3 text-sm text-[#ff9a9e]">
          {state.error}
        </p>
      )}
      <Input
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        error={fe.current}
        required
      />
      <Input
        label="New password"
        name="next"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={fe.next}
        required
      />
      <Input
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialActionState } from "@/types/actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction] = useFormState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {notice && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          {notice}
        </p>
      )}
      {state.error && (
        <p role="alert" className="rounded-lg border border-card/50 bg-card/10 px-4 py-3 text-sm text-[#ff9a9e]">
          {state.error}
        </p>
      )}

      <Input label="Username" name="username" autoComplete="username" autoCapitalize="none" required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />

      <SubmitButton className="w-full">Log in</SubmitButton>

      <p className="text-center text-sm text-chalk-dim">
        New here?{" "}
        <Link href="/register" className="text-grass underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

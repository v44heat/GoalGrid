"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { initialActionState } from "@/types/actions";

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialActionState);

  if (state.ok) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-grass" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-semibold">You&apos;re registered</h2>
        <p className="mt-2 text-chalk-dim">{state.message}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button variant="secondary">Go to log in</Button>
        </Link>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-card/50 bg-card/10 px-4 py-3 text-sm text-[#ff9a9e]">
          {state.error}
        </p>
      )}

      <Input
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        hint="This is what you log in with and what other players see."
        error={fe.username}
        required
      />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        hint="Only the league admin can see it."
        error={fe.email}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={fe.password}
        required
      />
      <Input
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={fe.confirm}
        required
      />

      <SubmitButton className="w-full">Create account</SubmitButton>

      <p className="text-center text-sm text-chalk-dim">
        Already registered?{" "}
        <Link href="/login" className="text-grass underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

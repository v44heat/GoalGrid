"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { deleteAccountAction } from "@/app/account/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialActionState } from "@/types/actions";

export function DeleteAccountSection({
  hasHistory,
  inOngoingSeason,
  isAdmin,
}: {
  /** the player has taken part in at least one season */
  hasHistory: boolean;
  /** one of those seasons is still a draft or running */
  inOngoingSeason: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(deleteAccountAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <section aria-labelledby="delete-heading" className="mt-10">
      <h2 id="delete-heading" className="mb-3 font-display text-2xl font-semibold text-[#ff7b80]">
        Delete account
      </h2>

      <div className="rounded-xl border border-card/40 bg-card/5 p-5">
        {!open ? (
          <>
            <p className="max-w-xl text-chalk-dim">
              Permanently delete your account and personal data. This cannot be undone.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
              Delete my account
            </Button>
          </>
        ) : (
          <form action={formAction} className="max-w-md space-y-4" noValidate>
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-5 w-5 shrink-0 text-card" aria-hidden />
              This is permanent. Please read before you continue.
            </p>

            <div className="space-y-3 text-sm text-chalk-dim">
              <p>
                <span className="font-medium text-chalk">Erased for good:</span> your login, email address, password,
                profile picture and username. Your username becomes free for someone else to register.
              </p>
              {hasHistory ? (
                <p>
                  <span className="font-medium text-chalk">Kept, anonymously:</span> the matches you played stay in the
                  league records so everyone else&apos;s results, tables and past champions remain correct. They will
                  show as &quot;Deleted player&quot; with nothing linking back to you.
                </p>
              ) : (
                <p>
                  <span className="font-medium text-chalk">Nothing is kept:</span> you have not played in a season, so
                  nothing about you will remain.
                </p>
              )}
              {inOngoingSeason && (
                <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold">
                  You are in a season that is not finished. Your remaining matches will not be played. The admin will
                  be told so they can cancel them.
                </p>
              )}
              {isAdmin && (
                <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-gold">
                  You are an admin. You can only delete your account if another admin exists.
                </p>
              )}
            </div>

            {state.error && (
              <p role="alert" className="rounded-lg border border-card/50 bg-card/10 px-4 py-3 text-sm text-[#ff9a9e]">
                {state.error}
              </p>
            )}

            <Input
              label="Your password"
              name="password"
              type="password"
              autoComplete="current-password"
              error={fe.password}
              required
            />
            <Input
              label="Type DELETE to confirm"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              error={fe.confirm}
              required
            />

            <div className="flex flex-wrap gap-3">
              <SubmitButton variant="danger">Delete my account permanently</SubmitButton>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

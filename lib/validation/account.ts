// No imports on purpose (see scripts/verify-account.mjs).

export const DELETE_CONFIRM_WORD = "DELETE";

/** The player must type the word DELETE in capitals, so a stray tap cannot delete an account. */
export function isDeleteConfirmed(input: unknown): boolean {
  return typeof input === "string" && input.trim() === DELETE_CONFIRM_WORD;
}

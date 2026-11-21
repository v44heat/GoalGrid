/** Shared result shape for server actions used with forms and buttons. */
export interface ActionState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export const initialActionState: ActionState = { ok: false };

"use client";

import { useActionState, useTransition, type FormEvent } from "react";

// Like useActionState, but submits via onSubmit so React does not reset the
// form fields after the action: on a validation error the user keeps what they typed.
// The form also gets `action={formAction}`: submitted before the page has
// loaded its scripts (slow mobile network), it still reaches the server action
// instead of reloading the page and losing what was typed.
export function useFormAction<S>(action: (prev: Awaited<S>, form: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, actionPending] = useActionState(action, initial);
  const [submitting, startTransition] = useTransition();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }
  return [state, onSubmit, actionPending || submitting, dispatch] as const;
}

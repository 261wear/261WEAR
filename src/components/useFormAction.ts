"use client";

import { useActionState, useTransition, type FormEvent } from "react";

// Like useActionState, but submits via onSubmit so React does not reset the
// form fields after the action: on a validation error the user keeps what they typed.
export function useFormAction<S>(action: (prev: Awaited<S>, form: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, actionPending] = useActionState(action, initial);
  const [submitting, startTransition] = useTransition();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }
  return [state, onSubmit, actionPending || submitting] as const;
}

"use client";

import { useFormAction } from "@/components/useFormAction";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { login } from "../actions";

export function LoginForm() {
  const [state, onSubmit, pending, formAction] = useFormAction(login, undefined);
  return (
    <form action={formAction} onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" className="input" autoFocus required />
      </div>
      <FormMessage error={state?.error} />
      <Button type="submit" pending={pending} pendingLabel="Connexion…" className="btn-dark w-full">Se connecter</Button>
    </form>
  );
}

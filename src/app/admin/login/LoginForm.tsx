"use client";

import { useFormAction } from "@/components/useFormAction";
import { login } from "../actions";

export function LoginForm() {
  const [state, onSubmit, pending] = useFormAction(login, undefined);
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" className="input" autoFocus required />
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-dark w-full" disabled={pending}>Se connecter</button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { Button } from "./ui/Button";

export function ErrorView({ error, retry, homeHref }: { error: Error & { digest?: string }; retry: () => void; homeHref: string }) {
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-5xl">Oups.</p>
      <p className="mt-3 text-black/70">Un problème est survenu pendant le chargement. Vérifie ta connexion puis réessaie.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Code : {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Button pending={pending} pendingLabel="Nouvel essai…" onClick={() => startTransition(() => retry())}>
          Réessayer
        </Button>
        <Link href={homeHref} className="btn-ghost">Retour</Link>
      </div>
    </div>
  );
}

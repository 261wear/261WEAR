"use client";

import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { uploadImage } from "./upload";

// Uploads files one by one, with "2/3" progress and one placeholder tile per
// pending file, so the grid does not jump when images arrive.
export function useUploads(folder: "products" | "proofs", onUploaded: (url: string) => Promise<void> | void) {
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  function upload(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError("");
    setProgress({ done: 0, total: list.length });
    startTransition(async () => {
      try {
        for (const [i, file] of list.entries()) {
          await onUploaded(await uploadImage(file, folder));
          setProgress({ done: i + 1, total: list.length });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setProgress(null);
      }
    });
  }

  const remaining = progress ? progress.total - progress.done : 0;
  return { upload, pending, progress, remaining, error };
}

export function PendingTiles({ count, className }: { count: number; className: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className={`flex items-center justify-center rounded-lg bg-black/[0.07] text-black/40 motion-safe:animate-pulse ${className}`}>
          <Spinner className="h-5 w-5" />
        </div>
      ))}
    </>
  );
}

export function UploadTile({
  label,
  className,
  pending,
  progress,
  onFiles,
}: {
  label: string;
  className: string;
  pending: boolean;
  progress: { done: number; total: number } | null;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      aria-busy={pending || undefined}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-xs ${
        pending ? "cursor-wait border-black/10 text-black/40" : "cursor-pointer border-black/20 text-muted hover:border-black"
      } ${className}`}
    >
      {pending ? <Spinner className="h-5 w-5" /> : <span className="text-2xl leading-none">+</span>}
      <span aria-live="polite">{pending && progress ? `Envoi ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : label}</span>
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

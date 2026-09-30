// Inline form feedback, announced to screen readers.
export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        {ok}
      </p>
    );
  }
  return null;
}

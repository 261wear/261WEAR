import { LoadingRegion, Skeleton } from "./ui/Skeleton";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <LoadingRegion label="Chargement…" className="mx-auto max-w-3xl px-4 py-12">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <Skeleton className="mt-8 h-48 w-full rounded-2xl" />
    </LoadingRegion>
  );
}

export function TableSkeleton({ rows = 6, title = true }: { rows?: number; title?: boolean }) {
  return (
    <LoadingRegion label="Chargement…">
      {title && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>
      )}
      <div className="card mt-6 divide-y divide-black/5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-12 w-12 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function FormSkeleton() {
  return (
    <LoadingRegion label="Chargement…">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 mb-6 h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card space-y-5 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="card space-y-5 p-5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}

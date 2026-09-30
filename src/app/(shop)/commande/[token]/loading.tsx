import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Chargement de ta commande…" className="mx-auto max-w-3xl px-4 py-10">
      <Skeleton className="h-10 w-72" />
      <div className="card mt-6 flex gap-4 p-4">
        <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="card mt-6 p-5">
        <Skeleton className="h-5 w-32" />
        <div className="mt-5 space-y-5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-44" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

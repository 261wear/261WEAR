import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Chargement du modèle…" className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-12 w-3/4" />
        <Skeleton className="mt-5 h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-5 h-16 w-full rounded-2xl" />
        <Skeleton className="mt-8 h-3 w-24" />
        <div className="mt-2 flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-12" />)}
        </div>
        <Skeleton className="mt-6 h-11 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
        <Skeleton className="mt-6 h-14 w-full rounded-full" />
      </div>
    </LoadingRegion>
  );
}

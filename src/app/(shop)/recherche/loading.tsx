import { ProductGridSkeleton } from "@/components/Skeletons";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="Recherche…" className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-2 h-4 w-32" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-3 lg:block">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
        <ProductGridSkeleton count={6} />
      </div>
    </LoadingRegion>
  );
}

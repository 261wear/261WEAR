import { ProductGridSkeleton } from "@/components/Skeletons";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

// Same shape as the home page: dark hero, then the product grid.
export default function Loading() {
  return (
    <LoadingRegion label="Chargement du drop…">
      <section className="bg-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:items-center">
          <div>
            <Skeleton dark className="h-4 w-32" />
            <Skeleton dark className="mt-5 h-28 w-4/5 sm:h-36" />
            <Skeleton dark className="mt-6 h-5 w-full max-w-md" />
            <Skeleton dark className="mt-2 h-5 w-2/3 max-w-md" />
            <div className="mt-8 flex gap-3">
              <Skeleton dark className="h-12 w-36 rounded-full" />
              <Skeleton dark className="h-12 w-48 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <Skeleton dark key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-11 w-40" />
        <ProductGridSkeleton />
      </section>
    </LoadingRegion>
  );
}

import { ProductGridSkeleton } from "@/components/Skeletons";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

// Same shape as the home page: dark hero (title, buttons, 3 tiles), then the product grid.
export default function Loading() {
  return (
    <LoadingRegion label="Chargement du drop…">
      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-28 sm:pb-16">
          <Skeleton dark className="h-4 w-32" />
          <Skeleton dark className="mt-5 h-32 w-4/5 max-w-xl sm:h-48" />
          <div className="mt-10 flex flex-wrap gap-3">
            <Skeleton dark className="h-13 w-40 rounded-full" />
            <Skeleton dark className="h-13 w-52 rounded-full" />
          </div>
          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3 sm:mt-16 sm:gap-4">
            {[0, 1, 2].map((i) => <Skeleton dark key={i} className="h-36 rounded-2xl" />)}
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

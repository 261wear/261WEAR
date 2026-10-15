"use client";

import { useEffect, useState } from "react";
import type { CardProduct } from "@/lib/card";
import { sample } from "@/lib/shuffle";
import { ProductCard } from "./ProductCard";

// Grid of `count` pairs drawn from `pool`, drawn again each time the page opens.
// The page itself stays cached (no database read per visitor): the server picks
// a new pool once a day, the browser picks the pairs shown. Without JavaScript,
// the first `count` of the pool show (already in random order).
export function ShuffledGrid({ pool, count, className }: { pool: CardProduct[]; count: number; className?: string }) {
  const [shown, setShown] = useState(() => pool.slice(0, count));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the draw must differ from the server render, so it runs after hydration
    setShown(sample(pool, count));
  }, [pool, count]);
  return (
    <div className={className}>
      {shown.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

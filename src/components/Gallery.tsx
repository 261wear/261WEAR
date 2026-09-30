"use client";

import { useState } from "react";
import { Img } from "./ui/Img";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="font-display flex aspect-square items-center justify-center rounded-2xl bg-white text-6xl text-black/10">261</div>;
  }
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl bg-white">
        <Img key={images[active]} src={images[active]} alt={alt} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
              className={`aspect-square overflow-hidden rounded-lg border-2 bg-white ${i === active ? "border-ink" : "border-transparent"}`}
            >
              <Img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

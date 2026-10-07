"use client";

import { useEffect, useRef, useState } from "react";
import { miniUrl, photoSrcSet } from "@/lib/images";
import { Img } from "./ui/Img";

// Product photo gallery: swipe (native scroll-snap), arrows, dots, a "2 / 5"
// counter, keyboard arrows and light thumbnails. Only the first photo loads
// eagerly; the others load as they come into view.
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Photo we are animating to: while set, intermediate scroll positions are
  // ignored (no flickering counter, and arrows pressed mid-animation start
  // from the photo being shown, not from one passed on the way).
  const target = useRef<number | null>(null);
  const count = images.length;
  // Photos downloaded so far: the one shown and the next. The others wait until
  // the customer gets close, so the first photo loads alone on mobile data
  // (lazy loading alone fetches every photo of a horizontal carousel).
  const [reach, setReach] = useState(1);
  if (active + 1 > reach) setReach(active + 1);

  // Follow the scroll position (swipe, arrows, thumbnails all scroll the track).
  useEffect(() => {
    const el = track.current;
    if (!el || count < 2) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        if (target.current !== null) {
          if (i === target.current) target.current = null;
          return;
        }
        setActive(i);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const next = (i + count) % count;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Already there: no scroll event will come to clear the target.
    target.current = Math.round(el.scrollLeft / el.clientWidth) === next ? null : next;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setActive(next);
  }
  // Swipe by hand: forget any pending programmatic target.
  const release = () => {
    target.current = null;
  };

  if (!count) {
    return <div className="font-display flex aspect-square items-center justify-center bg-white text-6xl text-black/10 md:rounded-2xl">261</div>;
  }

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label={`Photos de ${alt}`}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
      }}
    >
      <div className="group relative">
        <div
          ref={track}
          tabIndex={0}
          onPointerDown={release}
          onTouchStart={release}
          onWheel={release}
          aria-label="Photos du produit, utilise les flèches pour naviguer"
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-white md:rounded-2xl [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <div
              key={src}
              className="h-full w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="photo"
              aria-label={`${i + 1} sur ${count}`}
            >
              <Img
                src={i <= reach ? src : undefined}
                srcSet={i <= reach ? photoSrcSet(src) : undefined}
                // Full width on phones, half of the 72rem page from md up.
                sizes="(min-width: 768px) 576px, 100vw"
                alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                draggable={false}
                // Whole pair visible, never cropped: supplier photos are often landscape.
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </div>

        {/* Logo bottom right on every photo, as on the brand's posts. */}
        <span aria-hidden="true" className="font-display pointer-events-none absolute right-3 bottom-3 rounded-md bg-ink/85 px-2 py-1 text-xs leading-none text-white">
          261<span className="text-accent">°</span> WEAR
        </span>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Photo précédente"
              className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-ink shadow-md transition hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Photo suivante"
              className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-ink shadow-md transition hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              ›
            </button>
            <span className="absolute top-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white tabular-nums" aria-live="polite">
              {active + 1} / {count}
            </span>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
              {images.map((src, i) => (
                <span key={src} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Choisir une photo">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              onClick={() => go(i)}
              aria-label={`Photo ${i + 1}`}
              aria-selected={i === active}
              className={`aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition sm:w-20 ${i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <Img src={miniUrl(src)} fallback={src} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

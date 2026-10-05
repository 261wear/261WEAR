"use client";

import { useLayoutEffect, useRef } from "react";

// Timings from common design-system guidance (Material motion, loading
// indicator patterns): wait before showing so fast pages never flash it, then
// keep it long enough to be read, and leave with a short fade.
const SHOW_DELAY_MS = 300; // keep in sync with .brand-loader in globals.css
const MIN_VISIBLE_MS = 800; // one full "° 2 6 1" reveal
const FADE_OUT_MS = 250;

const DIGIT_DELAYS = [0.18, 0.32, 0.46];

// Brand loading mark shown in the middle of the screen while a page streams in:
// the citron "°" pops first, then 2, 6, 1 rise one by one, and the mark loops.
// The markup and animation are plain CSS, so it also shows before hydration.
export function BrandLoader() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    return () => {
      // The page arrived. If the mark was on screen, keep a copy until it has
      // been visible long enough, then fade it out, instead of cutting it.
      const fadeIn = el.getAnimations?.()[0];
      const elapsed = typeof fadeIn?.currentTime === "number" ? fadeIn.currentTime : performance.now() - start;
      const visibleFor = elapsed - SHOW_DELAY_MS;
      if (visibleFor <= 0) return;
      const copy = el.cloneNode(true) as HTMLDivElement;
      copy.classList.add("brand-loader-hold");
      // Restart each animation where the original was, so the copy does not jump.
      copy.querySelectorAll<HTMLElement>(".brand-loader-digit, .brand-loader-degree").forEach((node) => {
        const delay = parseFloat(node.style.animationDelay || "0");
        node.style.animationDelay = `${delay - elapsed / 1000}s`;
      });
      document.body.appendChild(copy);
      window.setTimeout(() => {
        copy.classList.add("brand-loader-out");
        window.setTimeout(() => copy.remove(), FADE_OUT_MS);
      }, Math.max(0, MIN_VISIBLE_MS - visibleFor));
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="brand-loader pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      <div className="brand-loader-mark font-display flex items-start rounded-2xl bg-ink px-6 py-4 text-5xl leading-none text-white shadow-[0_12px_40px_rgba(11,11,12,0.35)]">
        {["2", "6", "1"].map((digit, i) => (
          <span key={digit} className="brand-loader-mask">
            <span className="brand-loader-digit" style={{ animationDelay: `${DIGIT_DELAYS[i]}s` }}>
              {digit}
            </span>
          </span>
        ))}
        <span className="brand-loader-degree text-accent" style={{ animationDelay: "0s" }}>°</span>
      </div>
    </div>
  );
}

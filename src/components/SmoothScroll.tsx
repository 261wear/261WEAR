"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

// Défilement fluide (Lenis) sur la boutique. Désactivé quand le visiteur a demandé
// moins d'animations ; les ancres (#drop) glissent aussi.
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: true });
    let frame = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
  return null;
}

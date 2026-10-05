"use client";

import { useEffect, useState } from "react";

// Mobile only: keeps the price and the order button in reach while the
// customer scrolls through the photos. Hidden once the order form is visible.
export function StickyBuyBar({ price, label }: { price: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const form = document.getElementById("commander");
    if (!form) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0 });
    io.observe(form);
    return () => io.disconnect();
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-4 text-white pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] backdrop-blur transition-transform md:hidden ${show ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/60">{label}</p>
          <p className="text-lg leading-tight font-bold text-accent">{price}</p>
        </div>
        <a href="#commander" tabIndex={show ? 0 : -1} className="btn-accent shrink-0">Choisir ma pointure</a>
      </div>
    </div>
  );
}

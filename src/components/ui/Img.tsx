"use client";

import { useEffect, useRef, useState } from "react";

// <img> with a pulsing placeholder (its own background) until loaded.
// `fallback`: used once if `src` fails (e.g. an old photo without thumbnail).
export function Img({
  className = "",
  alt,
  src,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string; fallback?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  // No working source left: hide the browser's broken-image icon and alt text
  // so the placeholder behind (the "261" mark on cards) shows instead.
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrent(src);
    setLoaded(false);
    setFailed(false);
  }
  useEffect(() => {
    // The image may have finished before React hydrated: its load/error event
    // was missed. complete + width 0 means it failed (e.g. missing thumbnail).
    const img = ref.current;
    if (!img?.complete) return;
    const frame = requestAnimationFrame(() => {
      if (img.naturalWidth > 0) setLoaded(true);
      else if (fallback && current !== fallback) setCurrent(fallback);
      else setFailed(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [current, fallback]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      src={current}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
      className={`${failed ? "invisible" : loaded ? "" : "bg-black/[0.07] motion-safe:animate-pulse"} ${className}`}
      {...rest}
    />
  );
}

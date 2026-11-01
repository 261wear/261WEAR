"use client";

import { useEffect, useRef, useState } from "react";

function shapeOf(img: HTMLImageElement) {
  const ratio = img.naturalWidth / img.naturalHeight;
  return ratio < 0.9 ? "portrait" : ratio > 1.15 ? "landscape" : "square";
}

// <img> with a pulsing placeholder (its own background) until loaded.
// `fallback`: used once if `src` fails (e.g. an old photo without thumbnail).
// Once loaded it carries data-shape="portrait" | "landscape" | "square", so the
// caller can frame each supplier's photo format (Tailwind `data-[shape=…]:`).
export function Img({
  className = "",
  alt,
  src,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string; fallback?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [shape, setShape] = useState<string>();
  // No working source left: hide the browser's broken-image icon and alt text
  // so the background behind (the plain card tone on product cards) shows instead.
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setCurrent(src);
    setLoaded(false);
    setShape(undefined);
    setFailed(false);
  }
  useEffect(() => {
    // The image may have finished before React hydrated: its load/error event
    // was missed. complete + width 0 means it failed (e.g. missing thumbnail).
    const img = ref.current;
    if (!img?.complete) return;
    const frame = requestAnimationFrame(() => {
      if (img.naturalWidth > 0) {
        setShape(shapeOf(img));
        setLoaded(true);
      }
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
      data-shape={shape}
      onLoad={(e) => {
        setShape(shapeOf(e.currentTarget));
        setLoaded(true);
      }}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
      className={`${failed ? "invisible" : loaded ? "" : "bg-black/[0.07] motion-safe:animate-pulse"} ${className}`}
      {...rest}
    />
  );
}

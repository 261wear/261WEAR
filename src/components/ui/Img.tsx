"use client";

import { useEffect, useRef, useState } from "react";

// <img> that shows a pulsing placeholder (its own background) until loaded.
// The parent sets the size (aspect-ratio) so nothing shifts when it appears.
export function Img({ className = "", alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Image may already be in cache and complete before hydration.
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, []);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      className={`${loaded ? "" : "bg-black/[0.07] motion-safe:animate-pulse"} ${className}`}
      {...rest}
    />
  );
}

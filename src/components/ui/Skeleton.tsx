import { BrandLoader } from "../BrandLoader";

// Placeholder block shown while content streams in. Sized by the caller so
// the final content replaces it without layout shift.
export function Skeleton({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg motion-safe:animate-pulse ${dark ? "bg-white/10" : "bg-black/[0.07]"} ${className}`}
    />
  );
}

// Wrapper announcing the loading state to screen readers once. The skeleton
// keeps the page's shape (no layout shift); the brand mark shows in the middle
// of the screen when loading lasts.
export function LoadingRegion({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
      <BrandLoader />
    </div>
  );
}

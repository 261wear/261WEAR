import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-display -my-2 inline-block py-2 text-2xl leading-none ${className}`} aria-label="261 WEAR">
      261<span className="text-accent">°</span> WEAR
    </Link>
  );
}

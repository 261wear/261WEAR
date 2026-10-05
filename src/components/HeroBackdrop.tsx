import { szwegoUrl, thumbUrl } from "@/lib/images";

const COLUMNS = 5;
// Only a few distinct photos: the wall repeats them, so each is downloaded once
// (browser cache) however many tiles show it. Keeps the home page light on
// slow mobile data and on the image bandwidth quotas.
export const HERO_PHOTOS = 12;
// Long enough for one half of a column to cover the hero at any point of the loop.
const PER_COLUMN = 10;

// Decorative wall of catalogue photos behind the home hero: tilted columns
// scrolling up and down in a loop (each column holds its tiles twice so the
// -50% translation wraps seamlessly). Purely visual, hidden from screen readers.
export function HeroBackdrop({ photos }: { photos: string[] }) {
  if (!photos.length) return null;
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    Array.from({ length: PER_COLUMN }, (_, i) => photos[(c + i * COLUMNS) % photos.length]),
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/4 left-1/2 flex w-[130%] origin-top -translate-x-1/2 -rotate-12 gap-3 sm:w-[115%] sm:gap-4 md:left-[64%] md:w-[80%]">
        {columns.map((tiles, c) => (
          // Phones show 3 columns: hidden ones never load their lazy images.
          <div
            key={c}
            className={`hero-col flex-1 ${c % 2 ? "hero-col-down" : "hero-col-up"} ${c > 2 ? "hidden sm:block" : ""}`}
            style={{ animationDuration: `${70 + c * 9}s` }}
          >
            {[...tiles, ...tiles].map((src, i) => (
              <div
                key={i}
                className={`mb-3 aspect-square overflow-hidden rounded-2xl bg-white sm:mb-4 ${(c + i) % 7 === 3 ? "ring-2 ring-accent" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={szwegoUrl(thumbUrl(src), 300, 70)} alt="" loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-contain grayscale" />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Darken the wall so the headline stays readable, stronger on the text side. */}
      <div className="absolute inset-0 bg-ink/75 md:bg-transparent md:bg-gradient-to-r md:from-ink md:from-30% md:via-ink/80 md:to-ink/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/70" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />
    </div>
  );
}

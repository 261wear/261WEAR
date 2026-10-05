// Brand loading mark shown in the middle of the screen while a page streams in:
// the citron "°" pops first, then 2, 6, 1 rise one by one, and the mark loops.
// It fades in only after a short delay (see .brand-loader in globals.css), like
// large shops do: fast navigations never flash it, slow ones get feedback.
// Pure CSS, no JavaScript: it shows even before the page is interactive.
export function BrandLoader() {
  return (
    <div aria-hidden="true" className="brand-loader pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      <div className="font-display flex items-start rounded-2xl bg-ink px-6 py-4 text-5xl leading-none text-white shadow-[0_12px_40px_rgba(11,11,12,0.35)]">
        {["2", "6", "1"].map((digit, i) => (
          <span key={digit} className="brand-loader-mask">
            <span className="brand-loader-digit" style={{ animationDelay: `${0.14 + i * 0.12}s` }}>
              {digit}
            </span>
          </span>
        ))}
        <span className="brand-loader-degree text-accent">°</span>
      </div>
    </div>
  );
}

// Framing of a product photo inside a square card (shop grid, Studio picker).
// The card behind it must be `relative isolate overflow-hidden bg-card`, and the
// <Img> sets data-shape once the photo has loaded.
// Landscape supplier photos (3:2, near-white backdrop): zoomed in so the pair
// fills the square, multiplied so the white melts into the card tone, and faded
// at the top and bottom edges (no visible seam, supplier "Size" caption softened).
// The mask stops are relative to the unscaled 3:2 photo box.
// Portrait studio photos (3:4, grey backdrop, AK CHAUSSURE): cropped to the
// square around the pair, which sits in the lower half, so the caption at the
// very bottom falls outside; lightened and warmed so the grey matches the chalk cards.
export const CARD_PHOTO =
  "h-full w-full scale-[1.25] object-contain mix-blend-multiply transition duration-500 [mask-image:linear-gradient(transparent_16%,black_27%,black_73%,transparent_84%)] group-hover:scale-[1.32] data-[shape=portrait]:scale-[1.1] data-[shape=portrait]:object-cover data-[shape=portrait]:object-[50%_52%] data-[shape=portrait]:brightness-[1.2] data-[shape=portrait]:sepia-[.1] data-[shape=portrait]:[mask-image:none] data-[shape=portrait]:group-hover:scale-[1.16]";

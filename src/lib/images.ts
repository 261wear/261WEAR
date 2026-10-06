// Product photos are stored in two sizes: the full image (max 1600 px) and a
// light thumbnail (max 600 px) next to it, named "<same name>-t.jpg".
// Lists and grids use the thumbnail; the product page uses the full image.

const OWN = /(products-\d+-[a-f0-9]+)\.(jpg|png|webp|gif)$/;

// Photos of supplier catalogues imported in bulk stay on the supplier's image
// server (szwego, Tencent COS), which resizes on the fly from URL parameters.
const SZWEGO = /^(https:\/\/xcimg\.szwego\.com\/[^?#]+)(\?.*)?$/;

export function szwegoUrl(url: string, maxSide: number, quality: number) {
  const m = url.match(SZWEGO);
  return m ? `${m[1]}?imageMogr2/auto-orient/thumbnail/${maxSide}x${maxSide}%3E/quality/${quality}/format/jpg` : url;
}

// A photo uploaded from the back-office (as opposed to a pasted / supplier link).
export function isOwnUpload(url: string) {
  return OWN.test(url);
}

export function thumbUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (SZWEGO.test(url)) return szwegoUrl(url, 600, 80);
  return OWN.test(url) ? url.replace(OWN, "$1-t.jpg") : url;
}

// Several widths of a supplier photo for <img srcset>: a phone downloads about
// 1000 px instead of 1600 px (~3× lighter) and big screens keep full quality.
// Only for supplier photos, which the image server resizes on demand; our own
// uploads exist in two fixed sizes only, and an old one may lack its thumbnail.
export function photoSrcSet(url: string): string | undefined {
  if (!SZWEGO.test(url)) return undefined;
  return [600, 1000, 1600].map((w) => `${szwegoUrl(url, w, w < 1600 ? 82 : 88)} ${w}w`).join(", ");
}

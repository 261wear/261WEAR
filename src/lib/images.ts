// Product photos are stored in two sizes: the full image (max 1600 px) and a
// light thumbnail (max 600 px) next to it, named "<same name>-t.jpg".
// Lists and grids use the thumbnail; the product page uses the full image.

const OWN = /(products-\d+-[a-f0-9]+)\.(jpg|png|webp|gif)$/;

export function thumbUrl(url: string | null | undefined): string {
  if (!url) return "";
  return OWN.test(url) ? url.replace(OWN, "$1-t.jpg") : url;
}

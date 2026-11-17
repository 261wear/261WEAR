// SVG existants de public/logos. Une catégorie (« Sneakers », « Running »)
// n'est pas une marque : on lit d'abord le nom public du produit. L'ancienne
// catégorie n'est utilisée qu'en repli si elle nomme réellement une marque.
// Fichiers provenant de Simple Icons (CC0) et Wikimedia Commons ; les logos
// restent la propriété des marques correspondantes.
type BrandDefinition = { name: string; file: string | null; aliases?: string[] };

const BRANDS: BrandDefinition[] = [
  { name: "Nike", file: "nike" },
  { name: "Adidas", file: "adidas", aliases: ["Adidas Originals", "Adidas Performance", "Adidas Sportswear", "Adidas Neo"] },
  { name: "New Balance", file: "newbalance" },
  { name: "Jordan", file: "jordan", aliases: ["Air Jordan"] },
  { name: "Puma", file: "puma" },
  { name: "Reebok", file: "reebok" },
  { name: "Fila", file: "fila" },
  { name: "Under Armour", file: "underarmour" },
  { name: "The North Face", file: "thenorthface", aliases: ["North Face"] },
  { name: "Dior", file: "dior" },
  { name: "Asics", file: "asics" },
  { name: "Converse", file: "converse" },
  { name: "Vans", file: "vans" },
  { name: "Skechers", file: "skechers" },
  { name: "Salomon", file: "salomon" },
  { name: "Balenciaga", file: "balenciaga" },
  { name: "Burberry", file: "burberry" },
  { name: "Lacoste", file: "lacoste" },
  { name: "Lotto", file: "lotto" },
  { name: "Brooks", file: "brooks" },
  { name: "Columbia", file: "columbia", aliases: ["Columbia Sportswear"] },
  { name: "Crocs", file: "crocs" },
  { name: "Diadora", file: "diadora" },
  { name: "Ecco", file: "ecco" },
  { name: "Gucci", file: "gucci" },
  { name: "Hermès", file: "hermes" },
  { name: "Kappa", file: "kappa" },
  { name: "Louis Vuitton", file: "louisvuitton", aliases: ["LV"] },
  { name: "Mizuno", file: "mizuno" },
  { name: "Off-White", file: "offwhite" },
  { name: "Prada", file: "prada" },
  { name: "Timberland", file: "timberland" },
  { name: "UGG", file: "ugg" },
  { name: "Umbro", file: "umbro" },
  { name: "Versace", file: "versace" },
  // Marques reconnues dans les fiches, sans leur inventer un logo SVG.
  { name: "Golden Goose", file: null },
  { name: "Moncler", file: null },
  { name: "Premiata", file: null },
  { name: "Lululemon", file: null },
];

export type ProductBrand = { name: string; logo: string | null };
type BrandSource = { name: string; category: string };

const unaccent = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const key = (value: string) => unaccent(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const identity = (brand: BrandDefinition): ProductBrand => ({ name: brand.name, logo: brand.file ? `/logos/${brand.file}.svg` : null });
const BY_NAME = new Map(BRANDS.flatMap((brand) => [brand.name, ...(brand.aliases ?? [])].map((name) => [key(name), identity(brand)] as const)));
const MATCHERS = BRANDS.flatMap((brand) => [brand.name, ...(brand.aliases ?? [])]
  // Les abréviations courtes comme « LV » sont acceptées comme catégorie,
  // mais pas déduites d'une référence fournisseur dans un nom de produit.
  .filter((name) => key(name).length > 2)
  .map((name) => ({
    brand: identity(brand),
    pattern: new RegExp(`(?:^|[^a-z0-9])(${unaccent(name).split(/[^a-z0-9]+/i).join("[\\s._-]*")})(?=$|[^a-z])`, "i"),
  })));

export function brandLogo(name: string): string | null {
  return BY_NAME.get(key(name))?.logo ?? null;
}

function namedBrand(name: string): ProductBrand | null {
  const title = unaccent(name)
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  let found: { brand: ProductBrand; position: number; length: number } | undefined;
  for (const matcher of MATCHERS) {
    const match = matcher.pattern.exec(title);
    if (!match) continue;
    const position = match.index + match[0].length - match[1].length;
    if (!found || position < found.position || (position === found.position && match[1].length > found.length)) {
      found = { brand: matcher.brand, position, length: match[1].length };
    }
  }
  return found?.brand ?? null;
}

// Les métadonnées ne supposent aucune marque à partir d'un modèle générique
// (« Air Force 1 » sans « Nike »).
export function productBrand(name: string): string | undefined {
  return namedBrand(name)?.name;
}

export function brandFromProduct(product: BrandSource): ProductBrand | null {
  return namedBrand(product.name) ?? BY_NAME.get(key(product.category)) ?? null;
}

export function catalogBrands(products: (BrandSource & { id: number; status: string })[], sales: ReadonlyMap<number, number> = new Map()) {
  const brands = new Map<string, { name: string; logo: string; href: string; count: number; sales: number }>();
  for (const product of products) {
    if (product.status === "brouillon" || product.status === "epuise") continue;
    const brand = brandFromProduct(product);
    if (!brand?.logo) continue;
    const row = brands.get(brand.name) ?? {
      name: brand.name, logo: brand.logo,
      href: `/recherche?${new URLSearchParams({ q: brand.name })}`,
      count: 0, sales: 0,
    };
    row.count++;
    row.sales += sales.get(product.id) ?? 0;
    brands.set(brand.name, row);
  }
  return [...brands.values()].sort((a, b) => b.sales - a.sales || b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

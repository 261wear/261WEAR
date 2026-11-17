const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

// The app uses extensionless TypeScript imports. Compile only these pure
// helpers with the installed compiler; no server or database is started.
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};

const { catalogCategories, catalogPagePath, categorySlug, pageNumber, productId, productSummary, productBrand, shopIdentity } = require("../src/lib/shop-seo.ts");
const { siteUrl, jsonLd } = require("../src/lib/site.ts");
const { brandLogo, brandFromProduct, catalogBrands } = require("../src/lib/brand-logos.ts");
const { toHeroPair } = require("../src/lib/hero.ts");
const settings = { whatsapp: "261340000000", facebookUrl: "https://www.facebook.com/261wear", instagramUrl: "", tiktokUrl: "javascript:alert(1)", deliveryMinDays: 7, deliveryMaxDays: 14, stockDeliveryMinDays: 1, stockDeliveryMaxDays: 2 };

test("accented category variants share a single crawlable category", () => {
  const categories = catalogCategories([{ category: " Été " }, { category: "Ete" }, { category: "Running" }, { category: "" }]);
  assert.equal(categorySlug(" Été "), "ete");
  assert.equal(categories.find((c) => c.slug === "ete").count, 2);
  assert.equal(categories.find((c) => c.slug === "ete").path, "/chaussures/ete");
  assert.equal(categories.length, 2);
});

test("pagination rejects aliases and unsafe page numbers", () => {
  for (const input of ["0", "-1", "01", "2.5", "1e2", "Infinity", "9007199254740992"]) assert.equal(pageNumber(input), null);
  assert.equal(pageNumber("203"), 203);
  assert.equal(catalogPagePath("/chaussures/sneakers", 1), "/chaussures/sneakers");
  assert.equal(catalogPagePath("/chaussures/sneakers", 2), "/chaussures/sneakers/page/2");
});

test("product identifiers reject scientific notation and non-identifiers", () => {
  assert.equal(productId("001"), 1);
  for (const input of ["0", "-1", "1e3", "0x10", "1.5", "9007199254740992"]) assert.equal(productId(input), null);
});

test("product descriptions reflect actual availability and delivery settings", () => {
  const product = { name: "Paire test", status: "en_stock", pricing: { price: 250000 }, sizes: ["42"], description: "" };
  assert.match(productSummary(product, settings), /Disponible à Antananarivo, livraison en 1 à 2 jours/);
  assert.match(productSummary({ ...product, status: "sur_commande" }, settings), /7 à 14 jours/);
  assert.match(productSummary({ ...product, status: "epuise" }, settings), /Épuisé/);
  assert.doesNotMatch(productSummary({ ...product, status: "epuise" }, settings), /livraison/);
});

test("a generic model title is not assigned an invented brand", () => {
  assert.equal(productBrand("Air Force 1 07 Low"), undefined);
  assert.equal(productBrand("Sneakers Nike Dunk Low"), "Nike");
  assert.equal(productBrand("new balance 530"), "New Balance");
});

test("brands come from product names even when categories are shoe types", () => {
  for (const [name, brand, logo] of [
    ["Sneakers Nike Dunk Low", "Nike", "/logos/nike.svg"],
    ["Sneakers AdidasOriginals Gazelle", "Adidas", "/logos/adidas.svg"],
    ["NikeAirForce1", "Nike", "/logos/nike.svg"],
    ["Running NewBalance530", "New Balance", "/logos/newbalance.svg"],
    ["Chaussures Hermès", "Hermès", "/logos/hermes.svg"],
    ["Sneakers Air Jordan 1", "Jordan", "/logos/jordan.svg"],
  ]) assert.deepEqual(brandFromProduct({ name, category: "Sneakers" }), { name: brand, logo });
});

test("a real legacy brand category remains supported without mistaking generic categories for brands", () => {
  assert.deepEqual(brandFromProduct({ name: "Campus 00s", category: "Adidas" }), { name: "Adidas", logo: "/logos/adidas.svg" });
  assert.equal(brandFromProduct({ name: "Modèle inconnu", category: "Running" }), null);
  assert.equal(brandLogo("Sneakers"), null);
  assert.equal(brandLogo("constructor"), null);
  assert.deepEqual(brandFromProduct({ name: "Nike Dunk", category: "Adidas" }), { name: "Nike", logo: "/logos/nike.svg" });
});

test("the hero receives its actual SVG instead of a missing category logo", () => {
  const pair = toHeroPair({ id: 1, name: "Nike Dunk Low", category: "Sneakers", ref: null, status: "sur_commande", sizes: ["40", "42"], images: ["/pair.jpg"], pricing: { price: 250000 } }, settings);
  assert.equal(pair.brand, "Nike");
  assert.equal(pair.logo, "/logos/nike.svg");
});

test("the marquee aggregates and ranks brands, with no category text or nonexistent logos", () => {
  const products = [
    { id: 1, name: "Nike Dunk", category: "Sneakers", status: "sur_commande" },
    { id: 2, name: "Nike Air", category: "Running", status: "en_stock" },
    { id: 3, name: "AdidasOriginals Gazelle", category: "Sneakers", status: "sur_commande" },
    { id: 4, name: "Chaussures inconnues", category: "Running", status: "sur_commande" },
    { id: 5, name: "Moncler Trailgrip", category: "Outdoor", status: "sur_commande" },
    { id: 6, name: "Puma Speedcat", category: "Sneakers", status: "brouillon" },
    { id: 7, name: "Vans Old Skool", category: "Sneakers", status: "epuise" },
  ];
  const brands = catalogBrands(products, new Map([[3, 10]]));
  assert.deepEqual(brands.map((b) => b.name), ["Adidas", "Nike"]);
  assert.equal(brands[1].count, 2);
  for (const brand of brands) {
    assert.ok(fs.existsSync(require("node:path").join(__dirname, "../public", brand.logo)));
    assert.equal(new URL(brand.href, "https://261wear.com").searchParams.get("q"), brand.name);
  }
});

test("every marquee brand points to an existing SVG", () => {
  const names = ["Nike", "Adidas", "New Balance", "Air Jordan", "Puma", "Reebok", "Fila", "Under Armour", "The North Face", "Dior", "Asics", "Converse", "Vans", "Skechers", "Salomon", "Balenciaga", "Burberry", "Lacoste", "Lotto", "Brooks", "Columbia", "Crocs", "Diadora", "Ecco", "Gucci", "Hermès", "Kappa", "Louis Vuitton", "Mizuno", "Off-White", "Prada", "Timberland", "UGG", "Umbro", "Versace"];
  for (const name of names) {
    const brand = brandFromProduct({ name: `Chaussures ${name}`, category: "Sneakers" });
    assert.ok(brand?.logo, name);
    assert.ok(fs.existsSync(require("node:path").join(__dirname, "../public", brand.logo)), name);
  }
});

test("identity omits placeholder phone numbers and invalid social links", () => {
  const [store] = shopIdentity(settings);
  assert.equal(store.telephone, undefined);
  assert.deepEqual(store.sameAs, [settings.facebookUrl]);
  assert.equal(shopIdentity({ ...settings, whatsapp: "261341234567" })[0].telephone, "+261341234567");
});

test("JSON-LD cannot terminate its script element", () => {
  const payload = { name: "</script><script>alert(1)</script>" };
  const serialized = jsonLd(payload);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), payload);
});

test("production canonical URLs never fall back to localhost", () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, SITE_URL: process.env.SITE_URL };
  try {
    process.env.NODE_ENV = "production";
    for (const value of ["", "garbage", "http://localhost:3000", "javascript:alert(1)", "https://user:pass@261wear.com"]) {
      process.env.SITE_URL = value;
      assert.equal(siteUrl(), "https://261wear.com");
    }
    process.env.SITE_URL = " https://261wear.com/path?ignored=true ";
    assert.equal(siteUrl(), "https://261wear.com");
    process.env.SITE_URL = "http://www.261wear.com/";
    assert.equal(siteUrl(), "https://261wear.com");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

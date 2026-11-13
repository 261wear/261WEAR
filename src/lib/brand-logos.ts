// Logos de marques du défilement de l'accueil : fichiers SVG dans public/logos (simple-icons,
// CC0, et Wikimedia Commons pour les autres : asics, converse, vans, skechers, salomon, balenciaga,
// burberry, lacoste, lotto, brooks, columbia, crocs, diadora, ecco, gucci, hermes, kappa,
// louisvuitton, mizuno, offwhite, prada, timberland, ugg, umbro, versace). Une marque sans logo s'affiche en texte. Les logos appartiennent à leurs
// marques : à n'afficher que pour des marques vendues sur la boutique.

const LOGOS: Record<string, string> = {
  nike: "nike",
  adidas: "adidas",
  newbalance: "newbalance",
  jordan: "jordan",
  airjordan: "jordan",
  puma: "puma",
  reebok: "reebok",
  fila: "fila",
  underarmour: "underarmour",
  thenorthface: "thenorthface",
  northface: "thenorthface",
  dior: "dior",
  asics: "asics",
  converse: "converse",
  vans: "vans",
  skechers: "skechers",
  salomon: "salomon",
  balenciaga: "balenciaga",
  burberry: "burberry",
  lacoste: "lacoste",
  lotto: "lotto",
  brooks: "brooks",
  columbia: "columbia",
  columbiasportswear: "columbia",
  crocs: "crocs",
  diadora: "diadora",
  ecco: "ecco",
  gucci: "gucci",
  hermes: "hermes",
  kappa: "kappa",
  louisvuitton: "louisvuitton",
  lv: "louisvuitton",
  mizuno: "mizuno",
  offwhite: "offwhite",
  prada: "prada",
  timberland: "timberland",
  ugg: "ugg",
  umbro: "umbro",
  versace: "versace",
};

export function brandLogo(name: string): string | null {
  // « Hermès » → « hermes » : les accents sont retirés avant de comparer.
  const file = LOGOS[name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")];
  return file ? `/logos/${file}.svg` : null;
}

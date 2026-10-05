import { query } from "@/lib/db";
import { FB_MAX_PHOTOS } from "@/lib/facebook";
import { MAX_IMPORT_BATCH, MAX_IMPORT_ROWS } from "@/lib/import";
import { MAX_IMAGES } from "@/lib/product-rules";

// Free plans the shop runs on (October 2026). Netlify bills everything in
// credits; Supabase has separate caps. Figures to update if a plan changes.
const DB_LIMIT = 500 * 1024 ** 2;
const STORAGE_LIMIT = 1024 ** 3;

const NETLIFY_COSTS = [
  { what: "Mise en ligne réussie (chaque envoi sur GitHub)", cost: "15 crédits" },
  { what: "Mise en ligne échouée, version de test", cost: "gratuit" },
  { what: "Trafic (pages, scripts ; les photos ne passent pas par Netlify)", cost: "20 crédits / Go" },
  { what: "Requêtes", cost: "2 crédits / 10 000" },
  { what: "Calcul serveur (pages non mises en cache, recherche)", cost: "10 crédits / Go-heure" },
];

// Estimate for 100 visitors a day, from a simulation of the real site with
// 4 500 products (see the commit "cache de recherche corrigé…").
const ESTIMATE = [
  { what: "Calcul serveur", value: "~30" },
  { what: "Requêtes (~100 000)", value: "~20" },
  { what: "Trafic (~1 Go)", value: "~20" },
  { what: "4 mises en ligne", value: "60" },
];

function size(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} Go`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

async function usage() {
  const [db] = await query(
    `SELECT pg_database_size(current_database())::bigint AS db,
            (SELECT COUNT(*) FROM products WHERE status <> 'brouillon')::int AS published,
            (SELECT COUNT(*) FROM products)::int AS products,
            (SELECT COUNT(*) FROM orders)::int AS orders`,
  );
  // Supabase keeps uploaded files in storage.objects; absent in local development.
  let storage: { bytes: number; files: number } | null = null;
  try {
    const [s] = await query(
      `SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint AS bytes, COUNT(*)::int AS files
       FROM storage.objects WHERE bucket_id = 'photos'`,
    );
    storage = { bytes: Number(s.bytes), files: Number(s.files) };
  } catch {
    storage = null;
  }
  return { db: Number(db.db), published: Number(db.published), products: Number(db.products), orders: Number(db.orders), storage };
}

function Gauge({ label, used, limit, detail }: { label: string; used: number; limit: number; detail?: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  const tone = pct >= 80 ? "bg-red-600" : pct >= 50 ? "bg-amber-500" : "bg-emerald-600";
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">
          {size(used)} / {size(limit)}
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {pct < 1 ? "moins de 1 %" : `${Math.round(pct)} %`} utilisé{detail ? ` · ${detail}` : ""}
      </p>
    </div>
  );
}

export default async function LimitsPage() {
  const u = await usage();

  return (
    <>
      <h1 className="font-display text-3xl">Limites</h1>
      <p className="mt-1 text-sm text-muted">
        Le site tourne sur les offres gratuites de Netlify (hébergement) et de Supabase (base de données et photos). Ce qui les fait déborder, et
        comment l&apos;éviter.
      </p>

      <h2 className="mt-8 text-lg font-semibold">En ce moment</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Gauge
          label="Base de données"
          used={u.db}
          limit={DB_LIMIT}
          detail={`${u.products} produits (${u.published} en ligne), ${u.orders} commandes`}
        />
        {u.storage ? (
          <Gauge label="Photos envoyées depuis l'admin" used={u.storage.bytes} limit={STORAGE_LIMIT} detail={`${u.storage.files} fichiers`} />
        ) : (
          <div className="card p-4 text-sm text-muted">Stockage des photos : taille non disponible (à voir sur le tableau de bord Supabase).</div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Les crédits Netlify et le trafic Supabase ne sont visibles que sur leurs tableaux de bord :{" "}
        <a href="https://app.netlify.com/teams/261wear" target="_blank" rel="noreferrer" className="underline">
          Netlify → Usage
        </a>{" "}
        ·{" "}
        <a href="https://supabase.com/dashboard/org/lqfwalffualpmbiimglm/usage" target="_blank" rel="noreferrer" className="underline">
          Supabase → Usage
        </a>
        .
      </p>

      <h2 className="mt-10 text-lg font-semibold">Netlify : 300 crédits par mois</h2>
      <p className="mt-1 text-sm text-muted">
        Quand les crédits sont épuisés, <strong className="text-ink">le site est coupé jusqu&apos;au mois suivant</strong> : l&apos;offre gratuite
        n&apos;a pas de recharge automatique.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <caption className="bg-black/5 px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase">Ce qui consomme</caption>
            <tbody className="divide-y divide-black/5">
              {NETLIFY_COSTS.map((c) => (
                <tr key={c.what}>
                  <td className="px-4 py-2">{c.what}</td>
                  <td className="px-4 py-2 text-right font-semibold whitespace-nowrap">{c.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <caption className="bg-black/5 px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase">
              Estimation pour 100 visiteurs / jour
            </caption>
            <tbody className="divide-y divide-black/5">
              {ESTIMATE.map((e) => (
                <tr key={e.what}>
                  <td className="px-4 py-2">{e.what}</td>
                  <td className="px-4 py-2 text-right font-semibold">{e.value}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50">
                <td className="px-4 py-2 font-semibold">Total par mois</td>
                <td className="px-4 py-2 text-right font-semibold">~130 / 300</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        <li>
          <strong>Les mises en ligne sont le plus gros poste</strong> : 20 envois sur GitHub dans le mois suffisent à tout consommer. Regrouper les
          modifications du site et les envoyer en une fois.
        </li>
        <li>Modifier les produits, les commandes ou les paramètres ici ne coûte aucune mise en ligne.</li>
        <li>Le trafic double ? Le calcul, les requêtes et le trafic doublent aussi : environ 70 crédits de plus pour 200 visiteurs / jour.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Supabase</h2>
      <div className="card mt-3 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-black/5">
            <tr>
              <td className="px-4 py-2">Base de données</td>
              <td className="px-4 py-2 font-semibold whitespace-nowrap">500 Mo</td>
              <td className="px-4 py-2 text-muted">4 500 produits ≈ 15 Mo : large marge.</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Photos</td>
              <td className="px-4 py-2 font-semibold whitespace-nowrap">1 Go</td>
              <td className="px-4 py-2 text-muted">Une photo envoyée ≈ 300 Ko avec sa vignette : environ 3 000 photos.</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Trafic sortant</td>
              <td className="px-4 py-2 font-semibold whitespace-nowrap">5 Go / mois</td>
              <td className="px-4 py-2 text-muted">
                Chaque modification relit tout le catalogue (≈ 6 Mo pour 4 500 produits), en plus d&apos;une relecture par jour. Les photos envoyées
                depuis l&apos;admin comptent aussi, à chaque affichage.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2">Mise en pause</td>
              <td className="px-4 py-2 font-semibold whitespace-nowrap">7 jours</td>
              <td className="px-4 py-2 text-muted">Sans aucune visite pendant 7 jours, le projet s&apos;endort : le réveiller depuis le tableau de bord Supabase.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        <li>
          <strong>Préférer les liens de photos du fournisseur</strong> (szwego) pour les catalogues importés : ils ne coûtent rien, ni en stockage ni en
          trafic.
        </li>
        <li>Faire les modifications par lots (import, changement de statut groupé) plutôt qu&apos;un produit à la fois.</li>
        <li>
          Supprimer un produit ou une preuve de paiement <strong>ne supprime pas la photo du stockage</strong> : elle continue d&apos;occuper de la
          place. Si la jauge « Photos » approche de la limite, faire le ménage dans Supabase → Storage → photos.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Limites du back-office</h2>
      <div className="card mt-3 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-black/5">
            <tr>
              <td className="px-4 py-2">Produits par fichier d&apos;import</td>
              <td className="px-4 py-2 text-right font-semibold">{MAX_IMPORT_ROWS.toLocaleString("fr-FR")}</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Produits envoyés par paquet pendant l&apos;import</td>
              <td className="px-4 py-2 text-right font-semibold">{MAX_IMPORT_BATCH}</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Photos par produit</td>
              <td className="px-4 py-2 text-right font-semibold">{MAX_IMAGES}</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Poids d&apos;une photo (réduite à 1 600 px avant l&apos;envoi)</td>
              <td className="px-4 py-2 text-right font-semibold">4 Mo</td>
            </tr>
            <tr>
              <td className="px-4 py-2">Photos par publication Facebook</td>
              <td className="px-4 py-2 text-right font-semibold">{FB_MAX_PHOTOS}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

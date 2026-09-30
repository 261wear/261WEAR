import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guide des tailles" };

const SIZES: [string, string][] = [
  ["36", "22,5"], ["37", "23,0"], ["38", "23,5"], ["39", "24,5"], ["40", "25,0"],
  ["41", "25,5"], ["42", "26,5"], ["43", "27,0"], ["44", "27,5"], ["45", "28,5"], ["46", "29,0"],
];

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl">Guide des tailles</h1>
      <p className="mt-3 text-black/70">
        Les pointures varient selon les modèles. Le plus sûr : mesure ton pied en centimètres et compare avec le tableau.
        En cas de doute, envoie-nous ta mesure sur WhatsApp avant de commander.
      </p>
      <ol className="card mt-6 list-decimal space-y-2 p-6 pl-10 text-sm">
        <li>Pose ton pied sur une feuille, talon contre le mur, en fin de journée.</li>
        <li>Trace un trait au bout de ton plus long orteil.</li>
        <li>Mesure la distance du mur au trait, en centimètres.</li>
        <li>Choisis la pointure dont la longueur est égale ou juste au-dessus de ta mesure.</li>
      </ol>
      <table className="card mt-6 w-full overflow-hidden text-center text-sm">
        <thead className="bg-ink text-white">
          <tr>
            <th className="p-3">Pointure EU</th>
            <th className="p-3">Longueur du pied (cm)</th>
          </tr>
        </thead>
        <tbody>
          {SIZES.map(([eu, cm]) => (
            <tr key={eu} className="border-t border-black/10">
              <td className="p-2.5 font-semibold">{eu}</td>
              <td className="p-2.5">{cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-muted">Entre deux tailles ? Prends la pointure au-dessus.</p>
    </div>
  );
}

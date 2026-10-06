import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = { title: "Suivre ma commande", ...pageUrls("/suivi") };

export default async function TrackPage(props: PageProps<"/suivi">) {
  const { n } = await props.searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl">Suivre ma commande</h1>
      <p className="mt-2 mb-6 text-black/60">Entre ton numéro de commande et ton téléphone pour voir où en est ta paire.</p>
      <TrackForm defaultNumber={typeof n === "string" ? n : undefined} />
    </div>
  );
}

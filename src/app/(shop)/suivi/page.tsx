import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = { title: "Suivre ma commande", description: "Retrouve les étapes de ta commande 261° WEAR avec ton numéro de commande et ton téléphone, de la confirmation à la livraison à Tana.", ...pageUrls("/suivi") };

export default async function TrackPage(props: PageProps<"/suivi">) {
  const { n } = await props.searchParams;
  return (
    <div className="bg-card">
      <div className="mx-auto flex min-h-[calc(100svh-9.5rem)] max-w-5xl flex-col justify-center gap-8 px-4 py-12 md:flex-row md:items-center md:gap-16">
        <div className="md:flex-1">
          <h1 className="font-display text-[clamp(2.75rem,11vw,5.5rem)] leading-[0.95]">
            Où est
            <br />
            ma paire ?
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink/80">Entre ton numéro de commande et ton téléphone pour voir où en est ta paire, étape par étape.</p>
        </div>
        <div className="md:w-[26rem]">
          <TrackForm defaultNumber={typeof n === "string" ? n : undefined} />
        </div>
      </div>
    </div>
  );
}

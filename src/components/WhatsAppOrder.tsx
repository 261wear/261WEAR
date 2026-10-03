"use client";

import Link from "next/link";
import { useState } from "react";
import { waLink } from "@/lib/orders-shared";
import { WhatsAppIcon } from "./WhatsAppIcon";

// Ordering is a WhatsApp conversation: the customer picks a size, the button
// opens WhatsApp with the pair, the size, the price and the link already written.
export function WhatsAppOrder({
  whatsapp,
  name,
  reference,
  price,
  url,
  sizes,
}: {
  whatsapp: string;
  name: string;
  reference: string;
  price: string;
  url: string;
  sizes: string[];
}) {
  const [size, setSize] = useState("");
  const [missing, setMissing] = useState(false);
  const needsSize = sizes.length > 0;
  const message = [
    "Bonjour 261° WEAR ! Je veux cette paire :",
    `• ${name}`,
    `• Pointure : ${size || "je vous la précise"}`,
    `• Prix : ${price}`,
    reference && `• Réf : ${reference}`,
    url,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div id="commander" className="scroll-mt-36 space-y-4 md:scroll-mt-24">
      {needsSize && (
        <fieldset aria-labelledby="size-label">
          <div className="flex items-center justify-between">
            <span id="size-label" className="label">Pointure (EU)</span>
            <Link href="/guide-des-tailles" className="py-2 text-xs underline">Guide des tailles</Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
            {sizes.map((s) => (
              <label
                key={s}
                className={`flex h-12 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition has-focus-visible:outline-2 has-focus-visible:outline-ink ${
                  size === s ? "border-ink bg-ink text-white" : "border-black/15 bg-white hover:border-black"
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  value={s}
                  className="sr-only"
                  checked={size === s}
                  onChange={() => {
                    setSize(s);
                    setMissing(false);
                  }}
                />
                {s}
              </label>
            ))}
          </div>
          {missing && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">Choisis ta pointure pour commander.</p>}
        </fieldset>
      )}
      <a
        href={waLink(whatsapp, message)}
        target="_blank"
        rel="noopener"
        onClick={(e) => {
          if (needsSize && !size) {
            e.preventDefault();
            setMissing(true);
          }
        }}
        aria-disabled={needsSize && !size}
        className={`btn w-full bg-[#25D366] py-4 text-base text-white hover:brightness-95 ${needsSize && !size ? "opacity-60" : ""}`}
      >
        <WhatsAppIcon /> {needsSize && size ? `Commander en ${size} via WhatsApp` : "Commander via WhatsApp"}
      </a>
      <p className="text-center text-xs text-muted">
        {needsSize ? "Ta pointure et le lien de la paire sont déjà écrits dans le message." : "Le lien de la paire est déjà écrit dans le message : précise ta pointure."}
      </p>
    </div>
  );
}

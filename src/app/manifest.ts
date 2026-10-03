import type { MetadataRoute } from "next";

// "Add to home screen" on phones: the shop opens like an app, in the brand colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "261° WEAR",
    short_name: "261° WEAR",
    description: "Sneakers premium sur commande ou disponibles de suite, livrées à Tana.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

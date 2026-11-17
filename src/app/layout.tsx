import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { Audience } from "@/components/Audience";
import { OPEN_GRAPH, siteUrl } from "@/lib/site";
import "./globals.css";

// Polices du moodboard : Anton (titres, en majuscules) + Inter (textes et prix).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });

const description = "261° WEAR, boutique de chaussures en ligne à Antananarivo, Madagascar. Modèles sur commande ou disponibles de suite à Tana, prix en ariary et commande sur WhatsApp.";

// Icons (favicon.ico, icon.png, apple-icon.png) and the share image
// (opengraph-image.png) are files next to this layout: Next.js links them.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "261° WEAR — Boutique de chaussures en ligne à Antananarivo", template: "%s · 261° WEAR" },
  description,
  applicationName: "261° WEAR",
  appleWebApp: { title: "261° WEAR", statusBarStyle: "black-translucent" },
  openGraph: { ...OPEN_GRAPH, description },
  twitter: { card: "summary_large_image" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${anton.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* The analytics script only exists on Vercel: elsewhere it is a 404. */}
        {process.env.VERCEL && <Audience />}
      </body>
    </html>
  );
}

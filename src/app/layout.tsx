import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import { Audience } from "@/components/Audience";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });

const description = "Sneakers premium sur commande ou disponibles de suite, livrées à Tana. Représente le 261.";

// Icons (favicon.ico, icon.png, apple-icon.png) and the share image
// (opengraph-image.png) are files next to this layout: Next.js links them.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "261° WEAR — Sneakers premium à Madagascar", template: "%s · 261° WEAR" },
  description,
  applicationName: "261° WEAR",
  appleWebApp: { title: "261° WEAR", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "261° WEAR", description },
  twitter: { card: "summary_large_image" },
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

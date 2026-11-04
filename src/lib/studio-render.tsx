import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { szwegoUrl } from "./images";
import { formatAr } from "./pricing";
import type { ProductStatus } from "./product-status";
import { deliveryLine, formatSize, sizeRange, type Delivery, type FormatId, type FrameId, type PhotoFit } from "./social";
import { readLocalImage } from "./storage";

// Framed product photos for the social networks, drawn from the moodboard
// (../Moodboard/4 cadres signature pour les photos). Rendered by Satori: flexbox
// only, every element with several children needs display: flex.

const INK = "#0B0B0C";
const CHALK = "#F4F2EE";
const LEMON = "#C6FF3D";
const GREEN = "#047857";
const SLATE = "#2A2A2F";
const GREY = "#9A9AA0";

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 700 | 800; style: "normal" }[]> | null = null;

function loadFonts() {
  const dir = join(process.cwd(), "src/assets/fonts");
  const font = async (file: string, name: string, weight: 400 | 500 | 700 | 800) => ({ name, data: await readFile(join(dir, file)), weight, style: "normal" as const });
  fonts ??= Promise.all([
    font("Anton-Regular.ttf", "Anton", 400),
    font("Inter-Medium.ttf", "Inter", 500),
    font("Inter-Bold.ttf", "Inter", 700),
    font("Inter-ExtraBold.ttf", "Inter", 800),
  ]).catch((err) => {
    fonts = null;
    throw err;
  });
  return fonts;
}

// The photo as a data URI: Satori would otherwise fetch it again for each use.
async function loadPhoto(url: string): Promise<string> {
  if (url.startsWith("/api/files/")) {
    const file = await readLocalImage(url.slice("/api/files/".length));
    if (!file) throw new Error("Photo introuvable");
    return `data:${file.type};base64,${Buffer.from(file.data).toString("base64")}`;
  }
  const res = await fetch(szwegoUrl(url, 1600, 90), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Photo inaccessible (${res.status})`);
  const type = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!/^image\/(jpeg|png|gif|webp)$/.test(type)) throw new Error("Ce fichier n'est pas une photo");
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

export type StudioInput = {
  frame: FrameId;
  format: FormatId;
  fit: PhotoFit;
  title: string; // big title of Pellicule / Polaroïd
  product: { name: string; status: ProductStatus; price: number; sizes: string[] };
  photoUrl: string;
  delivery: Delivery;
  showPrice: boolean;
};

type Ctx = StudioInput & { photo: string; vertical: boolean; width: number; height: number };

export async function renderStudioImage(input: StudioInput, headers: Record<string, string>) {
  const [fontData, photo] = await Promise.all([loadFonts(), loadPhoto(input.photoUrl)]);
  const { width, height } = formatSize(input.format);
  const c: Ctx = { ...input, photo, vertical: input.format === "9x16", width, height };
  const Frame = { ticket: Ticket, neon: Neon, pellicule: Pellicule, polaroid: Polaroid }[input.frame];
  return new ImageResponse(<Frame {...c} />, { width, height, fonts: fontData, headers });
}

// ---------- Building blocks ----------

// Vertical posts keep their content out of the TikTok / stories interface.
// TikTok photo mode on tall phones (20:9) shifts the picture ~85 px up and lays
// the status bar, back arrow, search and "1/5" counter over it: nothing until
// y 290, and nothing on the right (x > 880) until y ~430. At the bottom the
// caption covers the last ~400 px and the buttons the right edge (x > 930)
// from y ~1300: see VERTICAL_RIGHT.
function Canvas({ c, children, background = INK }: { c: Ctx; children: ReactNode; background?: string }) {
  return (
    <div
      style={{
        width: c.width,
        height: c.height,
        display: "flex",
        flexDirection: "column",
        background,
        fontFamily: "Inter",
        color: CHALK,
        padding: c.vertical ? "290px 60px 0" : "56px 56px 60px",
        position: "relative",
      }}
    >
      {children}
      {c.vertical && (
        <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#55555B", fontSize: 26, fontWeight: 800, letterSpacing: 6, flexShrink: 0 }}>
          261WEAR.COM · LIEN EN BIO
        </div>
      )}
    </div>
  );
}

// Room kept on the right of the texts under the photo, for the TikTok buttons.
const VERTICAL_RIGHT = 110;

function Logo({ size, color = CHALK, degree = LEMON }: { size: number; color?: string; degree?: string }) {
  return (
    <div style={{ display: "flex", fontFamily: "Anton", fontSize: size, lineHeight: 1, color }}>
      <span>261</span>
      <span style={{ color: degree }}>°</span>
      <span style={{ marginLeft: size * 0.2 }}>WEAR</span>
    </div>
  );
}

function Kicker({ children, color = LEMON }: { children: ReactNode; color?: string }) {
  return <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 7, color }}>{children}</div>;
}

// Anton is narrow (~0.46 em per uppercase letter): the name fits in two lines at most.
function nameSize(name: string, width: number, max: number) {
  const perLine = (name.length * 0.47) / 2;
  const oneLine = width / (name.length * 0.47);
  return Math.round(Math.max(52, Math.min(max, oneLine >= max * 0.8 ? oneLine : width / perLine)));
}

// "Climacool F50 - 07-1007026" → "Climacool F50": the reference stays in the caption.
export function displayName(name: string) {
  return name.replace(/\s+[-–—]\s+(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{4,}$/i, "").trim() || name;
}

function Name({ name: full, width, max, color = CHALK }: { name: string; width: number; max: number; color?: string }) {
  const name = displayName(full);
  const size = nameSize(name, width, max);
  return (
    <div style={{ display: "block", fontFamily: "Anton", fontSize: size, lineHeight: 1.02, color, textTransform: "uppercase", lineClamp: 2 }}>
      {name}
    </div>
  );
}

// Supplier photos carry a caption at the bottom ("Size: 40~45  07-1007026"):
// in "cover" the picture runs 9 % past the bottom of its box so the caption
// stays out, as on the shop cards. "Contain" shows the whole photo, as asked.
function Photo({ c, radius = 0 }: { c: Ctx; radius?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      src={c.photo}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: c.fit === "cover" ? "109%" : "100%",
        objectFit: c.fit,
        objectPosition: "50% 70%", // portrait photos (AK): the pair sits low, under grey
        borderRadius: radius,
      }}
    />
  );
}

// Behind a whole photo ("contain"), supplier pictures shot on white blend in.
function photoBackground(c: Ctx) {
  return c.fit === "contain" ? "#FFFFFF" : SLATE;
}

function Pill({ children, background, color, style }: { children: ReactNode; background: string; color: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 12, background, color, fontSize: 32, fontWeight: 800, borderRadius: 999, padding: "14px 28px", ...style }}>
      {children}
    </div>
  );
}

function Bolt({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

// The logo on a photo: chalk with the lemon degree, on a dark plate so it stays
// readable on supplier photos shot on white.
function PhotoLogo({ size = 44 }: { size?: number }) {
  return (
    <div style={{ position: "absolute", right: 24, bottom: 24, display: "flex", background: "rgba(11,11,12,0.78)", borderRadius: 14, padding: "12px 18px" }}>
      <Logo size={size} />
    </div>
  );
}

// ---------- Ticket: new model, price at the bottom like a till receipt ----------

function Ticket(c: Ctx) {
  const sizes = c.product.sizes.length ? sizeRange(c.product.sizes) : "";
  const inner = c.width - (c.vertical ? 120 : 112);
  return (
    <Canvas c={c}>
      <div
        style={{
          display: "flex",
          flexDirection: c.vertical ? "column-reverse" : "row",
          justifyContent: "space-between",
          alignItems: c.vertical ? "flex-start" : "center",
          gap: c.vertical ? 14 : 0,
          flexShrink: 0,
        }}
      >
        <Kicker>{c.product.status === "en_stock" ? "DISPO DE SUITE" : "NOUVEAU MODÈLE"}</Kicker>
        <Logo size={60} />
      </div>
      <div style={{ display: "flex", flex: 1, position: "relative", marginTop: 28, background: photoBackground(c), borderBottom: `6px dashed #55555B`, overflow: "hidden" }}>
        <Photo c={c} />
        <Pill background={LEMON} color={INK} style={{ top: 28, left: 28, borderRadius: 10, padding: "10px 22px", fontSize: 38 }}>NEW</Pill>
        {sizes && <Pill background={INK} color={CHALK} style={{ bottom: 28, left: 28 }}>Pointures {sizes.replace(" à ", " → ")}</Pill>}
      </div>
      <div style={{ display: "flex", flexDirection: c.vertical ? "column" : "row", justifyContent: "space-between", alignItems: c.vertical ? "flex-start" : "flex-end", gap: c.vertical ? 22 : 28, marginTop: 34, flexShrink: 0, paddingRight: c.vertical ? VERTICAL_RIGHT : 0 }}>
        <div style={{ display: "flex", flexDirection: "column", ...(c.vertical ? {} : { flex: 1 }), gap: 10 }}>
          <Name name={c.product.name} width={c.vertical ? inner - VERTICAL_RIGHT : inner - 420} max={c.vertical ? 120 : 104} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: GREY }}>{deliveryLine(c.product.status, c.delivery)}</div>
        </div>
        {c.showPrice && (
          <div style={{ display: "flex", flexDirection: c.vertical ? "row" : "column", alignItems: c.vertical ? "center" : "flex-end", gap: c.vertical ? 24 : 14, flexShrink: 0 }}>
            <div style={{ display: "flex", background: LEMON, color: INK, fontSize: 58, fontWeight: 800, borderRadius: 16, padding: "14px 30px" }}>{formatAr(c.product.price)}</div>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: CHALK, ...(c.vertical ? { maxWidth: 300 } : {}) }}>Commande en message ou lien en bio</div>
          </div>
        )}
      </div>
    </Canvas>
  );
}

// ---------- Néon: pair already in Tana, soft lemon glow ----------

function Neon(c: Ctx) {
  const sizes = c.product.sizes.length > 4 ? sizeRange(c.product.sizes) : c.product.sizes.join(" · ");
  const inner = c.width - (c.vertical ? 120 : 112);
  return (
    <Canvas c={c}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, flexShrink: 0 }}>
        <Bolt size={92} color={LEMON} />
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: c.vertical ? 112 : 116, lineHeight: 1, color: CHALK }}>DISPO DE SUITE</div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: 34,
          border: `10px solid ${LEMON}`,
          borderRadius: 40,
          padding: 20,
          background: INK,
          boxShadow: "0 0 46px rgba(198,255,61,0.45)",
        }}
      >
        <div style={{ display: "flex", flex: 1, position: "relative", borderRadius: 24, background: photoBackground(c), overflow: "hidden" }}>
          <Photo c={c} radius={24} />
          <Pill background={GREEN} color="#FFFFFF" style={{ top: 26, right: 26 }}>Déjà à Tana</Pill>
          <PhotoLogo />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: c.vertical ? "column" : "row", justifyContent: "space-between", alignItems: c.vertical ? "flex-start" : "flex-end", gap: c.vertical ? 14 : 28, marginTop: 30, flexShrink: 0, paddingRight: c.vertical ? VERTICAL_RIGHT : 0 }}>
        <div style={{ display: "flex", flexDirection: "column", ...(c.vertical ? {} : { flex: 1 }), gap: 8 }}>
          <Name name={c.product.name} width={c.vertical ? inner - VERTICAL_RIGHT : inner - 380} max={c.vertical ? 116 : 96} />
          <div style={{ display: "flex", fontSize: 29, fontWeight: 500, color: GREY }}>
            {sizes ? `Pointures dispo : ${sizes} · ` : ""}livrée en {c.delivery.stock}
          </div>
        </div>
        {c.showPrice && <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: LEMON, lineHeight: 1, flexShrink: 0 }}>{formatAr(c.product.price)}</div>}
      </div>
    </Canvas>
  );
}

// ---------- Pellicule: drop announcement, stories, worn pairs ----------

function Sprockets() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 18px", height: 44, alignItems: "center", flexShrink: 0 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} style={{ width: 30, height: 20, borderRadius: 5, background: CHALK }} />
      ))}
    </div>
  );
}

function Pellicule(c: Ctx) {
  const title = c.title.trim().toUpperCase();
  return (
    <Canvas c={c}>
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <Kicker>261° WEAR PRÉSENTE</Kicker>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: c.vertical ? 136 : 112, lineHeight: 0.98, color: CHALK, marginTop: 14 }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 34, background: "#050505", border: "2px solid #26262A" }}>
        <Sprockets />
        <div style={{ display: "flex", flex: 1, position: "relative", margin: "0 18px", background: photoBackground(c), overflow: "hidden" }}>
          <Photo c={c} />
        </div>
        <Sprockets />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, marginTop: 30, flexShrink: 0, paddingRight: c.vertical ? VERTICAL_RIGHT : 0 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
          <Name name={c.product.name} width={c.width - 420} max={c.vertical ? 92 : 80} color={CHALK} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 500, color: GREY }}>
            {c.showPrice && <span style={{ color: LEMON, fontWeight: 800, fontSize: 46 }}>{formatAr(c.product.price)}</span>}
            <span>{c.product.status === "en_stock" ? "Dispo de suite" : "Sur commande"}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: LEMON,
            color: INK,
            fontFamily: "Anton",
            fontSize: 48,
            lineHeight: 1,
            padding: "18px 24px",
            borderRadius: 20,
            transform: "rotate(-5deg)",
            flexShrink: 0,
          }}
        >
          <span>#261</span>
          <span>FAMILY</span>
        </div>
      </div>
    </Canvas>
  );
}

// ---------- Polaroïd: delivered customers, reviews ----------

function Polaroid(c: Ctx) {
  const title = c.title.trim().toUpperCase();
  return (
    <Canvas c={c}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Kicker>#261FAMILY</Kicker>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: c.vertical ? 120 : 96, lineHeight: 1, marginTop: 10 }}>{title}</div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, padding: c.vertical ? `40px ${34 + VERTICAL_RIGHT}px 34px 6px` : "40px 34px 34px 6px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            position: "relative",
            background: CHALK,
            padding: "28px 28px 0",
            boxShadow: `30px 30px 0 ${LEMON}`,
          }}
        >
          <div style={{ display: "flex", flex: 1, position: "relative", background: c.fit === "contain" ? "#FFFFFF" : "#DCD9D2", overflow: "hidden" }}>
            <Photo c={c} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "24px 4px 28px", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
              <Name name={c.product.name} width={c.width - 460} max={64} color={INK} />
              <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#55555B" }}>Livrée à Tana · merci pour la confiance</div>
            </div>
            {c.showPrice && <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: INK, flexShrink: 0 }}>{formatAr(c.product.price)}</div>}
          </div>
          <div
            style={{
              position: "absolute",
              top: -26,
              right: 40,
              display: "flex",
              background: INK,
              color: CHALK,
              fontFamily: "Anton",
              fontSize: 54,
              lineHeight: 1,
              padding: "16px 26px",
              transform: "rotate(5deg)",
            }}
          >
            LIVRÉE
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: c.vertical ? "flex-start" : "flex-end", flexShrink: 0, paddingTop: 8 }}>
        <Logo size={56} />
      </div>
    </Canvas>
  );
}

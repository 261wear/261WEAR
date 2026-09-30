import "server-only";
import { query, queryOne } from "./db";
import type { PricingSettings } from "./pricing";

export type Settings = PricingSettings & {
  depositPct: number;
  whatsapp: string; // international format without +, e.g. 261340000000
  paymentInfo: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  stockDeliveryMinDays: number; // "Disponible de suite" products, already in Tana
  stockDeliveryMaxDays: number;
  badgeDays: number; // "Nouveau" / "Mis à jour" badges stay this many days
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
};

export const DEFAULT_SETTINGS: Settings = {
  rmbRate: 630,
  transportPerKg: 80000,
  defaultWeightKg: 1.2,
  marginPct: 35,
  fixedFees: 5000,
  roundTo: 5000,
  depositPct: 50,
  whatsapp: "261340000000",
  paymentInfo:
    "MVola : 034 00 000 00 (Nom Prénom)\nOrange Money : 032 00 000 00 (Nom Prénom)",
  deliveryMinDays: 7,
  deliveryMaxDays: 14,
  stockDeliveryMinDays: 1,
  stockDeliveryMaxDays: 2,
  badgeDays: 14,
  facebookUrl: "https://www.facebook.com/261wear",
  instagramUrl: "https://www.instagram.com/261wear",
  tiktokUrl: "https://www.tiktok.com/@261wear",
};

export async function getSettings(): Promise<Settings> {
  const row = await queryOne(`SELECT value FROM settings WHERE key = 'main'`);
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
}

export async function saveSettings(s: Settings) {
  await query(
    `INSERT INTO settings (key, value) VALUES ('main', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(s)],
  );
}

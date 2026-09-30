import "server-only";
import { query, queryOne } from "./db";
import type { PricingSettings } from "./pricing";

export type Settings = PricingSettings & {
  depositPct: number;
  whatsapp: string; // international format without +, e.g. 261340000000
  paymentInfo: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
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

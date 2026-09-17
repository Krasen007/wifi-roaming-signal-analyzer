import type { Band } from "./types";

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Approximate conversion from vendor percentage to dBm. */
export function percentToDbm(percent: number): number {
  return Math.round(percent / 2 - 100);
}

/** Approximate conversion from dBm to a 0-100 quality percentage. */
export function dbmToPercent(dbm: number): number {
  return Math.round(clamp(2 * (dbm + 100), 0, 100));
}

export interface Quality {
  label: string;
  tier: number; // 0 (worst) - 4 (best)
  color: string; // tailwind text/border color base
  bg: string;
  ring: string;
}

export function quality(dbm: number): Quality {
  if (dbm >= -55)
    return { label: "Excellent", tier: 4, color: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-500/30" };
  if (dbm >= -65)
    return { label: "Good", tier: 3, color: "text-lime-600", bg: "bg-lime-500", ring: "ring-lime-500/30" };
  if (dbm >= -72)
    return { label: "Fair", tier: 2, color: "text-amber-600", bg: "bg-amber-500", ring: "ring-amber-500/30" };
  if (dbm >= -80)
    return { label: "Weak", tier: 1, color: "text-orange-600", bg: "bg-orange-500", ring: "ring-orange-500/30" };
  return { label: "Poor", tier: 0, color: "text-rose-600", bg: "bg-rose-500", ring: "ring-rose-500/30" };
}

export function bandFromChannel(channel: number | null): Band {
  if (channel == null) return "?";
  if (channel >= 1 && channel <= 14) return "2.4";
  if (channel >= 32 && channel <= 177) return "5";
  if (channel >= 1 && channel <= 233) return "6";
  return "?";
}

export function bandFromFreq(freqMhz: number): Band {
  if (freqMhz >= 2400 && freqMhz < 2500) return "2.4";
  if (freqMhz >= 5000 && freqMhz < 5900) return "5";
  if (freqMhz >= 5925 && freqMhz <= 7125) return "6";
  return "?";
}

export function normalizeBssid(mac: string): string {
  return mac
    .trim()
    .toLowerCase()
    .replace(/\\/g, "")
    .replace(/-/g, ":");
}

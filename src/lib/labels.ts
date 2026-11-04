import type { AccessPoint, Registry } from "./types";

/** "Building · Floor" location string, or whichever part is set. */
export function locationLabel(registry: Registry, bssid: string): string | null {
  const e = registry[bssid];
  if (!e) return null;
  const b = e.building?.trim();
  const f = e.floor?.trim();
  if (b && f) return `${b} · ${f}`;
  if (b) return b;
  if (f) return f;
  return null;
}

/**
 * Human-friendly AP name: registered location → building/floor AP → "AP xx:xx"
 * (the last two MAC bytes, which is usually how mesh boxes are labeled).
 */
export function bssidDisplayName(registry: Registry, bssid: string): string {
  const e = registry[bssid];
  if (e?.location?.trim()) return e.location.trim();
  const loc = locationLabel(registry, bssid);
  if (loc) return `${loc} AP`;
  return `AP ${bssid.slice(-5).toUpperCase()}`;
}

export function apDisplayName(registry: Registry, ap: AccessPoint): string {
  return bssidDisplayName(registry, ap.bssid);
}

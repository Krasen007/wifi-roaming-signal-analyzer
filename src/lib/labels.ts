import type { Registry } from "./types";

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

/** Collect the distinct floor/building values already present in a registry. */
export function registryValueSets(registry: Registry): {
  floors: Set<string>;
  buildings: Set<string>;
} {
  const floors = new Set<string>();
  const buildings = new Set<string>();
  for (const e of Object.values(registry)) {
    if (e.floor) floors.add(e.floor);
    if (e.building) buildings.add(e.building);
  }
  return { floors, buildings };
}

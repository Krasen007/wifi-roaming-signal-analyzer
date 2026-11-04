import type { Registry } from "./types";

const KEY = "floorscope.registry.v1";
const CUR_FLOOR = "floorscope.currentFloor.v1";
const CONNECTED = "floorscope.connectedBssid.v1";

type StoredEntry = Partial<Registry[string]> & { name?: string };

export function loadRegistry(): Registry {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, StoredEntry>;
    const registry: Registry = {};
    let needsMigration = false;

    for (const [bssid, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;

      // v1 stored the location in `name`; migrate it to `location`.
      if (!("location" in entry) && typeof entry.name === "string") needsMigration = true;
      const location =
        typeof entry.location === "string"
          ? entry.location
          : typeof entry.name === "string"
            ? entry.name
            : "";
      const building = typeof entry.building === "string" ? entry.building : "";
      const floor = typeof entry.floor === "string" ? entry.floor : "";

      if (building || floor || location) {
        registry[bssid] = { bssid, building, floor, location };
      }
    }

    if (needsMigration) saveRegistry(registry);
    return registry;
  } catch {
    return {};
  }
}

export function saveRegistry(r: Registry) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function loadCurrentFloor(): string {
  return localStorage.getItem(CUR_FLOOR) ?? "";
}
export function saveCurrentFloor(f: string) {
  localStorage.setItem(CUR_FLOOR, f);
}

const CUR_BUILDING = "floorscope.currentBuilding.v1";
export function loadCurrentBuilding(): string {
  return localStorage.getItem(CUR_BUILDING) ?? "";
}
export function saveCurrentBuilding(b: string) {
  localStorage.setItem(CUR_BUILDING, b);
}

export function loadConnected(): string {
  return localStorage.getItem(CONNECTED) ?? "";
}
export function saveConnected(b: string) {
  localStorage.setItem(CONNECTED, b);
}

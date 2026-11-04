import type { Registry } from "./types";
import { normalizeBssid } from "./signal";

const KEY = "floorscope.registry.v1";
const CUR_FLOOR = "floorscope.currentFloor.v1";
const CONNECTED = "floorscope.connectedBssid.v1";

type StoredEntry = Partial<Registry[string]> & { name?: string };

const BSSID_REGEX = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;

export function sanitizeRegistry(data: unknown): Registry {
  if (!data || typeof data !== "object") return {};
  const registry: Registry = {};

  const entries: [string, StoredEntry][] = Array.isArray(data)
    ? data.map((item) => [item?.bssid ?? "", item])
    : Object.entries(data as Record<string, StoredEntry>);

  for (const [key, entry] of entries) {
    if (!entry || typeof entry !== "object") continue;
    const rawBssid = typeof entry.bssid === "string" && entry.bssid ? entry.bssid : key;
    const bssid = normalizeBssid(rawBssid);
    if (!BSSID_REGEX.test(bssid)) continue;

    const location =
      typeof entry.location === "string"
        ? entry.location.trim()
        : typeof entry.name === "string"
          ? entry.name.trim()
          : "";
    const building = typeof entry.building === "string" ? entry.building.trim() : "";
    const floor = typeof entry.floor === "string" ? entry.floor.trim() : "";

    if (building || floor || location) {
      registry[bssid] = { bssid, building, floor, location };
    }
  }

  return registry;
}

export function parseRegistryJson(jsonStr: string): Registry {
  const parsed = JSON.parse(jsonStr);
  return sanitizeRegistry(parsed);
}

export function serializeRegistryJson(registry: Registry): string {
  return JSON.stringify(registry, null, 2);
}

export function loadRegistry(): Registry {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return sanitizeRegistry(parsed);
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

import type { Registry } from "./types";

const KEY = "floorscope.registry.v1";
const CUR_FLOOR = "floorscope.currentFloor.v1";
const CUR_BUILDING = "floorscope.currentBuilding.v1";
const CONNECTED = "floorscope.connectedBssid.v1";

type StoredEntry = Partial<Registry[string]> & { name?: string };

function warnStorage(op: string, err: unknown) {
  console.warn(`[storage] ${op} failed`, err);
}

export function loadRegistry(): Registry {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (err) {
    warnStorage("loadRegistry:getItem", err);
    return {};
  }
  if (!raw) return {};

  let parsed: Record<string, StoredEntry>;
  try {
    parsed = JSON.parse(raw) as Record<string, StoredEntry>;
  } catch (err) {
    warnStorage("loadRegistry:parse", err);
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

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
}

export function saveRegistry(r: Registry) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch (err) {
    warnStorage("saveRegistry", err);
  }
}

export function loadCurrentFloor(): string {
  try {
    return localStorage.getItem(CUR_FLOOR) ?? "";
  } catch (err) {
    warnStorage("loadCurrentFloor", err);
    return "";
  }
}
export function saveCurrentFloor(f: string) {
  try {
    localStorage.setItem(CUR_FLOOR, f);
  } catch (err) {
    warnStorage("saveCurrentFloor", err);
  }
}

export function loadCurrentBuilding(): string {
  try {
    return localStorage.getItem(CUR_BUILDING) ?? "";
  } catch (err) {
    warnStorage("loadCurrentBuilding", err);
    return "";
  }
}
export function saveCurrentBuilding(b: string) {
  try {
    localStorage.setItem(CUR_BUILDING, b);
  } catch (err) {
    warnStorage("saveCurrentBuilding", err);
  }
}

export function loadConnected(): string {
  try {
    return localStorage.getItem(CONNECTED) ?? "";
  } catch (err) {
    warnStorage("loadConnected", err);
    return "";
  }
}
export function saveConnected(b: string) {
  try {
    localStorage.setItem(CONNECTED, b);
  } catch (err) {
    warnStorage("saveConnected", err);
  }
}

import type { Band, Registry, WiredRegistry } from "./types";

const KEY = "floorscope.registry.v1";
const WIRED_KEY = "floorscope.wiredRegistry.v1";
const CUR_FLOOR = "floorscope.currentFloor.v1";
const CUR_BUILDING = "floorscope.currentBuilding.v1";
const CONNECTED = "floorscope.connectedBssid.v1";

type StoredEntry = Partial<Registry[string]> & { name?: string };

const VALID_BANDS = new Set<Band>(["2.4", "5", "6", "?"]);

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
    const band =
      typeof entry.band === "string" && VALID_BANDS.has(entry.band as Band)
        ? entry.band
        : undefined;
    const channel =
      typeof entry.channel === "number" &&
      Number.isInteger(entry.channel) &&
      entry.channel >= 1 &&
      entry.channel <= 233
        ? entry.channel
        : undefined;

    const isBssid = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(bssid);
    // Keep entries with location data or a remembered band/channel, plus bare
    // valid BSSIDs: those are rows the user added manually before filling them in.
    if (building || floor || location || band || channel != null || isBssid) {
      registry[bssid] = {
        bssid,
        building,
        floor,
        location,
        ...(band ? { band } : {}),
        ...(channel != null ? { channel } : {}),
      };
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

export function loadWiredRegistry(): WiredRegistry {
  let raw: string | null;
  try {
    raw = localStorage.getItem(WIRED_KEY);
  } catch (err) {
    warnStorage("loadWiredRegistry:getItem", err);
    return {};
  }
  if (!raw) return {};

  let parsed: Record<string, Partial<WiredRegistry[string]>>;
  try {
    parsed = JSON.parse(raw) as Record<string, Partial<WiredRegistry[string]>>;
  } catch (err) {
    warnStorage("loadWiredRegistry:parse", err);
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const registry: WiredRegistry = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!entry || typeof entry !== "object") continue;
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    const socket = text(entry.socket) || key;
    const next: WiredRegistry[string] = {
      socket,
      building: text(entry.building),
      floor: text(entry.floor),
      location: text(entry.location),
      switchName: text(entry.switchName),
      switchPort: text(entry.switchPort),
      switchMgmtIp: text(entry.switchMgmtIp),
      vlan: text(entry.vlan),
      gatewayIp: text(entry.gatewayIp),
      gatewayMac: text(entry.gatewayMac),
      gatewayVendor: text(entry.gatewayVendor),
      adapterMac: text(entry.adapterMac),
      notes: text(entry.notes),
      updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
    };
    registry[key] = next;
  }
  return registry;
}

export function saveWiredRegistry(r: WiredRegistry) {
  try {
    localStorage.setItem(WIRED_KEY, JSON.stringify(r));
  } catch (err) {
    warnStorage("saveWiredRegistry", err);
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

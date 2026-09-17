import type { Registry } from "./types";

const KEY = "floorscope.registry.v1";
const CUR_FLOOR = "floorscope.currentFloor.v1";
const CONNECTED = "floorscope.connectedBssid.v1";

export function loadRegistry(): Registry {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Registry) : {};
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

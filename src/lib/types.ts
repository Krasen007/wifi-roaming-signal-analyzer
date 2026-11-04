export type Band = "2.4" | "5" | "6" | "?";

export interface AccessPoint {
  id: string; // bssid normalized
  ssid: string;
  bssid: string; // normalized lowercase colon separated
  dbm: number; // signal in dBm (estimated if only % given)
  percent: number; // 0-100
  channel: number | null;
  band: Band;
  radio?: string; // e.g. 802.11ac
  raw?: string;
}

export interface RegistryEntry {
  bssid: string;
  building: string; // free label e.g. "HQ", "Branch office"
  floor: string; // free label e.g. "Ground", "1st", "2nd"
  location: string; // where the AP is in the building, e.g. "Hallway, 2nd floor"
}

export type Registry = Record<string, RegistryEntry>;

/** One point of an AP's signal history. `dbm: null` = the AP was out of range in that scan. */
export interface SamplePoint {
  t: number;
  dbm: number | null;
}

export type History = Record<string, SamplePoint[]>;

export const MAX_HISTORY_POINTS = 120;

/** Fired when the connected BSSID changes (a roam between APs).
 *  `to` is empty when the connection dropped instead of roaming. */
export interface RoamEvent {
  t: number;
  from: string;
  to: string;
}

export interface LiveMeta {
  watching: boolean;
  fileName: string | null;
  lastUpdate: number | null;
}

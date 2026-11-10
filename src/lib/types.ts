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
  band?: Band; // last seen band (2.4 / 5 / 6 / ?) so offline entries still show it
}

export type Registry = Record<string, RegistryEntry>;

/** One point of an AP's signal history. `dbm: null` = the AP was out of range in that scan. */
export interface SamplePoint {
  t: number;
  dbm: number | null;
}

export type History = Record<string, SamplePoint[]>;

/** Kept per AP: enough to cover the chart's 20-minute window at a 5 s scan loop. */
export const MAX_HISTORY_POINTS = 300;

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

/** An active (or recently active) wired network adapter. */
export interface WiredAdapter {
  name: string;
  description: string;
  mac: string; // normalized lowercase colon separated
  status: string;
  linkSpeed: string;
  ipv4: string[];
  prefix: number | null;
  gateway: string[];
  dhcpEnabled: boolean | null;
  dns: string[];
}

/** A device seen in the LAN neighbour table (ARP / Get-NetNeighbor). */
export interface WiredNeighbor {
  ip: string;
  mac: string;
  state?: string;
  vendor?: string;
  isGateway?: boolean;
}

/** What the switch announced about itself (LLDP/CDP). */
export interface LldpNeighbor {
  source: "LLDP" | "CDP";
  chassisId: string;
  systemName: string;
  portId: string;
  portDescription: string;
  mgmtAddress: string;
  vlan: string;
}

export interface WiredInfo {
  adapters: WiredAdapter[];
  neighbors: WiredNeighbor[];
  lldp: LldpNeighbor | null;
  linkStatus: "connected" | "disconnected" | "unavailable" | null;
  lldpCaptureStartedAt: number | null;
  capturedAt: number | null;
  format: string;
}

/** A wall socket mapped to the switch/port and location it belongs to. */
export interface WiredRegistryEntry {
  socket: string; // free label, e.g. "3F-R12-A"
  building: string;
  floor: string;
  location: string; // room/hallway description
  switchName: string;
  switchPort: string;
  switchMgmtIp: string;
  vlan: string;
  gatewayIp: string;
  gatewayMac: string;
  gatewayVendor: string;
  adapterMac: string;
  notes: string;
  updatedAt: number;
}

export type WiredRegistry = Record<string, WiredRegistryEntry>;

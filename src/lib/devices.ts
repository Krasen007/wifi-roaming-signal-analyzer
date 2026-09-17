import type { AccessPoint, Registry } from "./types";
import { bssidDisplayName, locationLabel } from "./labels";

/**
 * Heuristic physical-device grouping: radios (and SSIDs) on the same hardware
 * almost always share the middle 4 octets of their BSSID, differing only in the
 * first octet (band/locally-administered variants) and last octet (per-SSID).
 *
 * e.g. f6:1e:57:ab:81:1c / f6:1e:57:ab:81:1d / f4:1e:57:ab:81:1a → one device.
 */
export function deviceKey(bssid: string): string {
  const p = bssid.split(":");
  if (p.length !== 6) return bssid;
  return p.slice(1, 5).join(":");
}

export interface DeviceGroup {
  key: string;
  members: AccessPoint[]; // sorted strongest first
  index: number; // 1-based device number (D1, D2…) assigned by strongest member
  ssids: string[];
  connected: boolean;
  displayName: string;
  location: string | null;
}

export function groupDevices(aps: AccessPoint[], registry: Registry, connectedBssid = ""): DeviceGroup[] {
  const map = new Map<string, AccessPoint[]>();
  for (const ap of aps) {
    const k = deviceKey(ap.bssid);
    const arr = map.get(k);
    if (arr) arr.push(ap);
    else map.set(k, [ap]);
  }
  const groups: DeviceGroup[] = Array.from(map.entries()).map(([key, members]) => {
    members.sort((a, b) => b.dbm - a.dbm);
    const ssids = Array.from(new Set(members.map((m) => m.ssid)));
    // Prefer a registered member for the device name/location.
    const named = members.find((m) => registry[m.bssid]?.name?.trim());
    const located = members.find((m) => registry[m.bssid]?.building?.trim() || registry[m.bssid]?.floor?.trim());
    const ref = named ?? located ?? members[0];
    return {
      key,
      members,
      index: 0,
      ssids,
      connected: members.some((m) => m.bssid === connectedBssid),
      displayName: registry[ref.bssid]?.name?.trim()
        ? registry[ref.bssid].name.trim()
        : bssidDisplayName(registry, ref.bssid),
      location: located ? locationLabel(registry, located.bssid) : null,
    };
  });
  groups.sort((a, b) => b.members[0].dbm - a.members[0].dbm);
  groups.forEach((g, i) => (g.index = i + 1));
  return groups;
}

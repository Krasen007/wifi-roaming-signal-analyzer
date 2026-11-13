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

export interface DeviceColor {
  border: string;
  bg: string;
  text: string;
}

/**
 * Returns a consistent color scheme for a physical device based on its 1-based
 * index. The palette rotates after 8 devices so every device gets a distinct
 * colour that is used across the dashboard and location views.
 */
export function deviceColor(index: number): DeviceColor {
  const palette: DeviceColor[] = [
    { border: "var(--fs-primary)", bg: "var(--fs-primary-light)", text: "var(--fs-primary)" },
    { border: "var(--fs-success)", bg: "var(--fs-success-light)", text: "var(--fs-success)" },
    { border: "var(--fs-warning)", bg: "var(--fs-warning-light)", text: "var(--fs-warning)" },
    { border: "var(--fs-danger)", bg: "var(--fs-danger-light)", text: "var(--fs-danger)" },
    { border: "var(--fs-device-5)", bg: "var(--fs-device-5-light)", text: "var(--fs-device-5)" },
    { border: "var(--fs-device-6)", bg: "var(--fs-device-6-light)", text: "var(--fs-device-6)" },
    { border: "var(--fs-device-7)", bg: "var(--fs-device-7-light)", text: "var(--fs-device-7)" },
    { border: "var(--fs-device-8)", bg: "var(--fs-device-8-light)", text: "var(--fs-device-8)" },
  ];
  return palette[(index - 1) % palette.length];
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
    const withLocation = members.find((m) => registry[m.bssid]?.location?.trim());
    const located = members.find((m) => registry[m.bssid]?.building?.trim() || registry[m.bssid]?.floor?.trim());
    const ref = withLocation ?? located ?? members[0];
    return {
      key,
      members,
      index: 0,
      ssids,
      connected: members.some((m) => m.bssid === connectedBssid),
      displayName: registry[ref.bssid]?.location?.trim()
        ? registry[ref.bssid].location.trim()
        : bssidDisplayName(registry, ref.bssid),
      location: located ? locationLabel(registry, located.bssid) : null,
    };
  });
  groups.sort((a, b) => b.members[0].dbm - a.members[0].dbm);
  groups.forEach((g, i) => (g.index = i + 1));
  return groups;
}

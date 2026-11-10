import type {
  LldpNeighbor,
  WiredAdapter,
  WiredInfo,
  WiredNeighbor,
  WiredRegistry,
  WiredRegistryEntry,
} from "./types";

/** Normalize any MAC-ish string to lowercase colon separated. */
export function normalizeMac(value: string): string {
  const hex = value.toLowerCase().replace(/[^0-9a-f]/g, "");
  if (hex.length !== 12) return value.trim().toLowerCase();
  return (hex.match(/.{2}/g) ?? []).join(":");
}

export function isMac(value: string): boolean {
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(normalizeMac(value));
}

/**
 * Small, curated OUI table for the vendors you meet on office LANs. A full OUI
 * database is ~30k entries; this is enough to turn a bare gateway MAC into a
 * useful "looks like an Aruba/Cisco/Ubiquiti" hint without shipping a dataset.
 */
const OUI_VENDORS: Record<string, string> = {
  "00:00:0c": "Cisco",
  "00:1b:0c": "Cisco",
  "00:1b:2a": "Cisco",
  "00:1c:0e": "Cisco",
  "00:1d:45": "Cisco",
  "00:1e:13": "Cisco",
  "00:1e:14": "Cisco",
  "00:1f:6c": "Cisco",
  "00:21:a0": "Cisco",
  "00:23:5e": "Cisco",
  "00:24:97": "Cisco",
  "00:25:45": "Cisco",
  "00:26:0b": "Cisco",
  "00:26:99": "Cisco",
  "00:50:0f": "Cisco",
  "00:50:53": "Cisco",
  "00:50:54": "Cisco",
  "00:18:0a": "Cisco Meraki",
  "88:15:44": "Cisco Meraki",
  "e0:55:3d": "Cisco Meraki",
  "ac:17:c8": "Cisco Meraki",
  "00:0b:86": "Aruba (HPE)",
  "00:1a:1e": "Aruba (HPE)",
  "00:24:6c": "Aruba (HPE)",
  "6c:f3:7f": "Aruba (HPE)",
  "24:de:c6": "Aruba (HPE)",
  "94:b4:0f": "Aruba (HPE)",
  "20:4c:03": "Aruba (HPE)",
  "84:d4:7e": "Aruba (HPE)",
  "00:15:6d": "Ubiquiti",
  "04:18:d6": "Ubiquiti",
  "24:5a:4c": "Ubiquiti",
  "44:d9:e7": "Ubiquiti",
  "68:d7:9a": "Ubiquiti",
  "74:ac:b9": "Ubiquiti",
  "78:8a:20": "Ubiquiti",
  "80:2a:a8": "Ubiquiti",
  "f0:9f:c2": "Ubiquiti",
  "00:05:85": "Juniper",
  "00:12:1e": "Juniper",
  "00:1b:c0": "Juniper",
  "00:1f:12": "Juniper",
  "2c:6b:f5": "Juniper",
  "3c:61:04": "Juniper",
  "5c:5e:ab": "Juniper",
  "84:18:88": "Juniper",
  "4c:5e:0c": "MikroTik",
  "64:d1:54": "MikroTik",
  "74:4d:28": "MikroTik",
  "18:fd:74": "MikroTik",
  "cc:2d:e0": "MikroTik",
  "2c:c8:1b": "MikroTik",
  "48:8f:5a": "MikroTik",
  "6c:3b:6b": "MikroTik",
  "00:14:6c": "Netgear",
  "00:1b:2f": "Netgear",
  "00:24:b2": "Netgear",
  "20:4e:7f": "Netgear",
  "a0:40:a0": "Netgear",
  "c0:3f:0e": "Netgear",
  "e0:46:9a": "Netgear",
  "00:05:5d": "D-Link",
  "00:0d:88": "D-Link",
  "00:1e:58": "D-Link",
  "00:22:b0": "D-Link",
  "00:26:5a": "D-Link",
  "14:d6:4d": "D-Link",
  "1c:7e:e5": "D-Link",
  "28:10:7b": "D-Link",
  "00:0a:eb": "TP-Link",
  "00:25:86": "TP-Link",
  "00:27:19": "TP-Link",
  "50:c7:bf": "TP-Link",
  "a4:2b:b0": "TP-Link",
  "c0:25:e9": "TP-Link",
  "ec:08:6b": "TP-Link",
  "f4:f2:6d": "TP-Link",
  "00:0f:e2": "Huawei",
  "00:18:82": "Huawei",
  "00:25:9e": "Huawei",
  "28:6e:d4": "Huawei",
  "48:46:fb": "Huawei",
  "70:7b:e8": "Huawei",
  "78:1d:ba": "Huawei",
  "ac:85:3d": "Huawei",
  "00:23:89": "H3C",
  "3c:8c:40": "H3C",
  "70:f9:6d": "H3C",
  "9c:71:81": "H3C",
  "d0:7e:28": "H3C",
  "00:01:30": "Extreme Networks",
  "00:04:96": "Extreme Networks",
  "00:e0:2b": "Extreme Networks",
  "5c:0e:8b": "Extreme Networks",
  "74:67:f7": "Extreme Networks",
  "00:13:92": "Ruckus",
  "00:1d:2e": "Ruckus",
  "2c:5d:93": "Ruckus",
  "58:93:96": "Ruckus",
  "c4:01:7c": "Ruckus",
  "ec:8d:2f": "Ruckus",
  "00:09:0f": "Fortinet",
  "08:5b:0e": "Fortinet",
  "70:4c:a5": "Fortinet",
  "90:6c:ac": "Fortinet",
  "e8:1c:ba": "Fortinet",
  "00:1e:c9": "Dell",
  "00:21:9b": "Dell",
  "00:23:ae": "Dell",
  "00:24:e8": "Dell",
  "00:14:22": "Dell",
  "b8:2a:72": "Dell",
  "f8:bc:12": "Dell",
  "18:03:73": "Dell",
  "00:1b:21": "Intel",
  "00:1e:67": "Intel",
  "00:1f:3b": "Intel",
  "3c:97:0e": "Intel",
  "3c:fd:fe": "Intel",
  "8c:16:45": "Intel",
  "a4:bb:6d": "Intel",
  "00:e0:4c": "Realtek",
  "00:05:69": "VMware",
  "00:0c:29": "VMware",
  "00:1c:14": "VMware",
  "00:50:56": "VMware",
  "00:15:5d": "Microsoft (Hyper-V)",
  "00:03:ff": "Microsoft",
  "00:0d:3a": "Microsoft",
  "00:1d:d8": "Microsoft",
  "08:00:27": "VirtualBox",
  "52:54:00": "QEMU/KVM",
  "00:16:3e": "Xen",
  "00:1c:42": "Parallels",
  "00:03:93": "Apple",
  "00:0a:27": "Apple",
  "00:1b:63": "Apple",
  "00:1e:c2": "Apple",
  "00:23:df": "Apple",
  "3c:07:54": "Apple",
  "8c:85:90": "Apple",
  "a4:83:e7": "Apple",
  "f0:18:98": "Apple",
  "00:12:fb": "Samsung",
  "00:15:99": "Samsung",
  "00:1d:25": "Samsung",
  "00:21:19": "Samsung",
  "34:23:ba": "Samsung",
  "5c:0a:5b": "Samsung",
};

/** Best-effort vendor name from a MAC's OUI. `null` when unknown. */
export function vendorFromMac(mac: string): string | null {
  const n = normalizeMac(mac);
  if (!isMac(n)) return null;
  return OUI_VENDORS[n.slice(0, 8)] ?? null;
}

export function emptyWiredInfo(): WiredInfo {
  return { adapters: [], neighbors: [], lldp: null, capturedAt: null, format: "empty" };
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function firstNumber(value: string | undefined): number | null {
  for (const part of (value ?? "").split(";")) {
    const n = parseInt(part.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseLldp(parts: string[]): LldpNeighbor {
  const f = (i: number) => (parts[i] ?? "").trim();
  const source: LldpNeighbor["source"] = f(1).toUpperCase() === "CDP" ? "CDP" : "LLDP";
  return {
    source,
    chassisId: f(2),
    systemName: f(3),
    portId: f(4),
    portDescription: f(5),
    mgmtAddress: f(6),
    vlan: f(7),
  };
}

/**
 * Parse a FloorScope wired snapshot (pipe-delimited records written by the
 * portable scanner / `scripts/wired-snapshot.ps1`) or a raw paste of
 * `ipconfig /all` + `arp -a` / `Get-NetNeighbor`.
 */
export function parseWired(text: string): WiredInfo {
  const info = emptyWiredInfo();
  const trimmed = text.trim();
  if (!trimmed) return info;

  let structured = false;

  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      if (/FloorScope wired snapshot/i.test(line)) structured = true;
      const stamp = line.replace(/^#+\s*/, "");
      const when = Date.parse(stamp);
      if (!Number.isNaN(when)) info.capturedAt = when;
      continue;
    }

    const parts = line.split("|");
    const tag = (parts[0] ?? "").toUpperCase();
    if (tag === "ADAPTER") {
      structured = true;
      const f = (i: number) => (parts[i] ?? "").trim();
      info.adapters.push({
        name: f(1),
        description: f(2),
        mac: normalizeMac(f(3)),
        status: f(4),
        linkSpeed: f(5),
        ipv4: splitList(f(6)),
        prefix: firstNumber(f(7)),
        gateway: splitList(f(8)),
        dhcpEnabled: f(9) === "1" ? true : f(9) === "0" ? false : null,
        dns: splitList(f(10)),
      });
    } else if (tag === "NEIGHBOR") {
      structured = true;
      const mac = normalizeMac(parts[2] ?? "");
      if (isMac(mac)) {
        info.neighbors.push({
          ip: (parts[1] ?? "").trim(),
          mac,
          state: (parts[3] ?? "").trim() || undefined,
        });
      }
    } else if (tag === "LLDP" || tag === "CDP") {
      structured = true;
      info.lldp = parseLldp(parts);
    }
  }

  if (!structured) {
    return parseRawWired(trimmed);
  }

  info.format = info.adapters.length > 0 ? "FloorScope wired snapshot" : "wired snapshot (no adapter)";
  return enrich(info);
}

function maskToPrefix(mask: string): number | null {
  const parts = mask.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return parts.reduce((bits, n) => bits + n.toString(2).split("").filter((c) => c === "1").length, 0);
}

function valueAfter(line: string, label: string): string | null {
  const lower = line.toLowerCase();
  const at = lower.indexOf(label.toLowerCase());
  if (at < 0) return null;
  const colon = line.indexOf(":", at + label.length);
  if (colon < 0) return null;
  return line.slice(colon + 1).trim();
}

function parseRawWired(text: string): WiredInfo {
  const info = emptyWiredInfo();
  const adapters: WiredAdapter[] = [];
  const neighbors: WiredNeighbor[] = [];

  let cur: WiredAdapter | null = null;
  let readingDns = false;

  const flush = () => {
    if (cur && (cur.mac || cur.ipv4.length)) adapters.push(cur);
    cur = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");

    const header = line.match(/^(?:Ethernet|Wireless LAN|Unknown|Tunnel) adapter (.+):\s*$/i);
    if (header) {
      flush();
      cur = {
        name: header[1].trim(),
        description: "",
        mac: "",
        status: "",
        linkSpeed: "",
        ipv4: [],
        prefix: null,
        gateway: [],
        dhcpEnabled: null,
        dns: [],
      };
      readingDns = false;
      continue;
    }

    if (cur) {
      const desc = valueAfter(line, "Description");
      if (desc !== null && !cur.description) {
        cur.description = desc;
        readingDns = false;
        continue;
      }
      const mac = valueAfter(line, "Physical Address");
      if (mac) {
        cur.mac = normalizeMac(mac);
        readingDns = false;
        continue;
      }
      const ip = valueAfter(line, "IPv4 Address");
      if (ip) {
        cur.ipv4.push(ip.replace(/\(.*\)$/, "").trim());
        readingDns = false;
        continue;
      }
      const mask = valueAfter(line, "Subnet Mask");
      if (mask) {
        cur.prefix = maskToPrefix(mask);
        readingDns = false;
        continue;
      }
      const gw = valueAfter(line, "Default Gateway");
      if (gw) {
        cur.gateway.push(gw.replace(/\(.*\)$/, "").trim());
        readingDns = false;
        continue;
      }
      const dhcp = valueAfter(line, "DHCP Enabled");
      if (dhcp) {
        cur.dhcpEnabled = /^yes/i.test(dhcp);
        readingDns = false;
        continue;
      }
      const dns = valueAfter(line, "DNS Servers");
      if (dns !== null) {
        if (dns) cur.dns.push(dns);
        readingDns = true;
        continue;
      }
      if (readingDns) {
        const cont = line.trim();
        if (/^[0-9a-f:.]+$/i.test(cont)) {
          cur.dns.push(cont);
          continue;
        }
        readingDns = false;
      }
    }

    // Neighbour rows from `arp -a` or `Get-NetNeighbor`.
    const macMatch = line.match(/([0-9a-f]{2}(?:[:-][0-9a-f]{2}){5})/i);
    const ipMatch = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
    if (macMatch && ipMatch) {
      const ip = ipMatch[1];
      const mac = normalizeMac(macMatch[1]);
      if (isMac(mac) && !/^(224|239|255)\./.test(ip)) {
        const state = /reachable/i.test(line)
          ? "Reachable"
          : /stale/i.test(line)
            ? "Stale"
            : /permanent/i.test(line)
              ? "Permanent"
              : undefined;
        neighbors.push({ ip, mac, state });
      }
    }
  }
  flush();

  info.adapters = adapters;
  info.neighbors = neighbors;
  info.format = adapters.length > 0 ? "raw ipconfig / arp" : neighbors.length > 0 ? "raw neighbour table" : "unrecognized";
  return enrich(info);
}

function ipValue(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + (parseInt(part, 10) || 0), 0) >>> 0;
}

function enrich(info: WiredInfo): WiredInfo {
  const gatewayIps = new Set(info.adapters.flatMap((a) => a.gateway));
  const seen = new Set<string>();
  const neighbors: WiredNeighbor[] = [];

  for (const n of info.neighbors) {
    if (!isMac(n.mac) || n.mac === "00:00:00:00:00:00" || n.mac === "ff:ff:ff:ff:ff:ff") continue;
    if (/^(unreachable|incomplete)$/i.test(n.state ?? "")) continue;
    if (/^(224|239|255)\./.test(n.ip)) continue;
    const key = `${n.ip}|${n.mac}`;
    if (seen.has(key)) continue;
    seen.add(key);
    neighbors.push({
      ...n,
      vendor: n.vendor ?? vendorFromMac(n.mac) ?? undefined,
      isGateway: n.isGateway || gatewayIps.has(n.ip),
    });
  }

  neighbors.sort((a, b) => {
    if (a.isGateway !== b.isGateway) return a.isGateway ? -1 : 1;
    return ipValue(a.ip) - ipValue(b.ip);
  });

  return { ...info, neighbors };
}

/** Slug used as the wired-registry key (socket labels stay human friendly). */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Best guess at a human label for "the port I am on right now". */
export function suggestedSocketLabel(info: WiredInfo | null): string {
  if (!info) return "";
  if (info.lldp) {
    const sw = info.lldp.systemName || info.lldp.chassisId || "switch";
    return info.lldp.portId ? `${sw} ${info.lldp.portId}` : sw;
  }
  const gateway = info.adapters.flatMap((a) => a.gateway)[0];
  return gateway ? `Gateway ${gateway}` : "";
}

/** Stable identity of the current switch port, when LLDP told us. */
export function currentPortSignature(info: WiredInfo | null): string {
  if (!info?.lldp) return "";
  return [info.lldp.systemName || info.lldp.chassisId, info.lldp.portId]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();
}

/** Find a saved socket that matches the switch+port we are on right now. */
export function findRegisteredSocket(
  registry: WiredRegistry,
  info: WiredInfo | null
): WiredRegistryEntry | null {
  const signature = currentPortSignature(info);
  if (!signature) return null;
  return (
    Object.values(registry).find(
      (entry) => `${entry.switchName} ${entry.switchPort}`.trim().toLowerCase() === signature
    ) ?? null
  );
}

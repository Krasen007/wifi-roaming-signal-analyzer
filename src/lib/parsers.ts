import type { AccessPoint } from "./types";
import {
  bandFromChannel,
  dbmToPercent,
  normalizeBssid,
  percentToDbm,
} from "./signal";

export interface ConnectedInfo {
  bssid: string;
  state: string | null;
}

export interface ParseResult {
  aps: AccessPoint[];
  format: string;
  /** Filled when the text also contains `netsh wlan show interfaces` output. */
  connected?: ConnectedInfo;
}

const MAC_RE = /([0-9a-f]{2}[:\-]){5}[0-9a-f]{2}/i;

function makeAp(
  ssid: string,
  bssid: string,
  opts: { dbm?: number; percent?: number; channel?: number | null; radio?: string; raw?: string }
): AccessPoint {
  const nb = normalizeBssid(bssid);
  let dbm = opts.dbm;
  let percent = opts.percent;
  if (dbm == null && percent != null) dbm = percentToDbm(percent);
  if (percent == null && dbm != null) percent = dbmToPercent(dbm);
  if (dbm == null) dbm = -100;
  if (percent == null) percent = 0;
  const channel = opts.channel ?? null;
  return {
    id: nb,
    ssid: ssid.trim() || "(hidden)",
    bssid: nb,
    dbm,
    percent,
    channel,
    band: bandFromChannel(channel),
    radio: opts.radio,
    raw: opts.raw,
  };
}

/** Windows: netsh wlan show networks mode=bssid */
function parseNetsh(text: string): AccessPoint[] {
  const lines = text.split(/\r?\n/);
  const aps: AccessPoint[] = [];
  let currentSsid = "";
  let cur: Partial<{ bssid: string; percent: number; channel: number; radio: string }> | null = null;

  const flush = () => {
    if (cur && cur.bssid) {
      aps.push(
        makeAp(currentSssidSafe(currentSsid), cur.bssid, {
          percent: cur.percent,
          channel: cur.channel ?? null,
          radio: cur.radio,
        })
      );
    }
    cur = null;
  };

  for (const line of lines) {
    const ssidMatch = line.match(/^\s*SSID\s+\d+\s*:\s*(.*)$/i);
    if (ssidMatch) {
      flush();
      currentSsid = ssidMatch[1].trim();
      continue;
    }
    // Only match "BSSID 1 :" style lines (the networks list), not the plain
    // "BSSID :" of `netsh wlan show interfaces`, which has no index number.
    const bssidMatch = line.match(/^\s*BSSID\s+\d+\s*:\s*(.*)$/i);
    if (bssidMatch) {
      flush();
      cur = { bssid: bssidMatch[1].trim() };
      continue;
    }
    if (!cur) continue;
    const sig = line.match(/Signal\s*:\s*(\d+)\s*%/i);
    if (sig) {
      cur.percent = parseInt(sig[1], 10);
      continue;
    }
    const chan = line.match(/Channel\s*:\s*(\d+)/i);
    if (chan) {
      cur.channel = parseInt(chan[1], 10);
      continue;
    }
    const radio = line.match(/Radio type\s*:\s*(.*)$/i);
    if (radio) {
      cur.radio = radio[1].trim();
      continue;
    }
  }
  flush();
  return aps;
}

function currentSssidSafe(s: string) {
  return s || "(hidden)";
}

/** Windows: netsh wlan show interfaces → which AP we're actually on.
 *  Newer Windows 11 builds label the field "AP BSSID" instead of "BSSID". */
function parseInterfaces(text: string): ConnectedInfo | undefined {
  const state = text.match(/^\s*State\s+:\s*(.+)$/mi)?.[1]?.trim() ?? null;
  const bssidRaw = text
    .match(/^\s*(?:AP\s+)?BSSID\s+:\s*((?:[0-9a-f]{2}:){5}[0-9a-f]{2})/mi)?.[1];
  if (!bssidRaw) return undefined;
  if (state && !/connected/i.test(state)) return undefined;
  return { bssid: normalizeBssid(bssidRaw), state };
}

export function parseScan(text: string): ParseResult {
  const t = text.trim();
  if (!t) return { aps: [], format: "empty" };

  const connected = parseInterfaces(t);

  if (/^\s*BSSID\s+\d+\s*:/mi.test(t)) {
    return {
      aps: dedupe(parseNetsh(t)),
      format: connected ? "Windows netsh + interfaces" : "Windows netsh",
      connected,
    };
  }

  // Minimal fallback: any line with a MAC plus a signal value (helps if netsh
  // output was partially trimmed or you pasted only `show interfaces`).
  const lines = t.split(/\r?\n/);
  const aps: AccessPoint[] = [];
  for (const line of lines) {
    const m = line.match(MAC_RE);
    if (!m) continue;
    const pct = line.match(/(\d{1,3})\s*%/);
    const dbmM = line.match(/-\d{2,3}\s*dBm/);
    if (!pct && !dbmM) continue;
    aps.push(
      makeAp(connected && connected.bssid === m[0].toLowerCase() ? "(connected interface)" : "(unknown)",
        m[0],
        {
          percent: pct ? parseInt(pct[1], 10) : undefined,
          dbm: dbmM ? parseInt(dbmM[0], 10) : undefined,
          raw: line,
        })
    );
  }
  return {
    aps: dedupe(aps),
    format: aps.length > 0 ? "fallback (partial netsh)" : "unrecognized",
    connected,
  };
}

function dedupe(aps: AccessPoint[]): AccessPoint[] {
  const map = new Map<string, AccessPoint>();
  for (const ap of aps) {
    const existing = map.get(ap.id);
    if (!existing || ap.dbm > existing.dbm) map.set(ap.id, ap);
  }
  return Array.from(map.values()).sort((a, b) => b.dbm - a.dbm);
}

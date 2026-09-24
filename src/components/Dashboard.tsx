import { useMemo, useState } from "react";
import {
  Building2,
  CircleCheck,
  MapPin,
  Minus,
  MoveRight,
  Radar,
  Search,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { AccessPoint, Band, History, Registry, RoamEvent } from "../lib/types";
import { quality } from "../lib/signal";
import { apDisplayName, bssidDisplayName, locationLabel } from "../lib/labels";
import { groupDevices } from "../lib/devices";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { LiveHistoryChart } from "./LiveHistoryChart";
import { DevicesPanel } from "./DevicesPanel";
import { cn } from "../utils/cn";

interface LiveMeta {
  watching: boolean;
  fileName: string | null;
  lastUpdate: number | null;
}

export function Dashboard({
  aps,
  registry,
  currentFloor,
  setCurrentFloor,
  currentBuilding,
  setCurrentBuilding,
  connectedBssid,
  setConnectedBssid,
  live,
  history,
  lastSeenSsid,
  lastSeenBand,
  roams,
}: {
  aps: AccessPoint[];
  registry: Registry;
  currentFloor: string;
  setCurrentFloor: (f: string) => void;
  currentBuilding: string;
  setCurrentBuilding: (b: string) => void;
  connectedBssid: string;
  setConnectedBssid: (b: string) => void;
  live: LiveMeta;
  history: History;
  lastSeenSsid: Record<string, string>;
  lastSeenBand: Record<string, string>;
  roams: RoamEvent[];
}) {
  const ssids = useMemo(() => Array.from(new Set(aps.map((a) => a.ssid))).sort(), [aps]);
  const defaultSsid = aps[0]?.ssid ?? "";
  const [ssid, setSsid] = useState(defaultSsid);
  const [chartAllWifi, setChartAllWifi] = useState(false);
  const activeSsid = ssids.includes(ssid) ? ssid : defaultSsid;

  const myAps = useMemo(
    () => aps.filter((a) => a.ssid === activeSsid).sort((a, b) => b.dbm - a.dbm),
    [aps, activeSsid]
  );
  const strongest = myAps[0];
  const connected = aps.find((a) => a.bssid === connectedBssid);

  const { floors, buildings } = useMemo(() => {
    const f = new Set<string>();
    const b = new Set<string>();
    Object.values(registry).forEach((e) => {
      e.floor && f.add(e.floor);
      e.building && b.add(e.building);
    });
    return { floors: Array.from(f).sort(), buildings: Array.from(b).sort() };
  }, [registry]);

  const devices = useMemo(
    () => groupDevices(aps, registry, connectedBssid),
    [aps, registry, connectedBssid]
  );
  const devNumber = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of devices) for (const member of d.members) m.set(member.bssid, d.index);
    return m;
  }, [devices]);
  const bandOf = (bssid: string): Band => (lastSeenBand[bssid] as Band) ?? "?";

  if (aps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Radar className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-800">No scan data yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Open <b>Live setup</b>, start the PowerShell loop, then pick your scan.txt — the
          dashboard updates as you walk between floors.
        </p>
      </div>
    );
  }

  // location helpers
  const locOf = (bssid: string) => locationLabel(registry, bssid);
  const buildingOf = (bssid: string) => registry[bssid]?.building?.trim() || null;
  const floorOf = (bssid: string) => registry[bssid]?.floor?.trim() || null;

  const connectedLoc = connected ? locOf(connected.bssid) : null;
  const strongestLoc = strongest ? locOf(strongest.bssid) : null;
  const connectedFloor = connected ? floorOf(connected.bssid) : null;
  const connectedBuilding = connected ? buildingOf(connected.bssid) : null;
  const q = strongest ? quality(strongest.dbm) : null;

  const stickyWarning =
    connected && strongest && connected.bssid !== strongest.bssid && strongest.dbm - connected.dbm >= 8;

  const wrongBuilding =
    connected && currentBuilding.trim() && connectedBuilding && connectedBuilding !== currentBuilding.trim();
  const wrongFloor =
    connected && currentFloor.trim() && connectedFloor && connectedFloor !== currentFloor.trim();

  const userWhere = [currentBuilding.trim(), currentFloor.trim()].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Network</label>
          <select
            value={activeSsid}
            onChange={(e) => setSsid(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          >
            {ssids.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="chart-network" className="text-xs font-medium text-slate-500">
            Chart
          </label>
          <select
            id="chart-network"
            value={chartAllWifi ? "__all__" : activeSsid}
            onChange={(e) => setChartAllWifi(e.target.value === "__all__")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="__all__">All detected Wi‑Fi</option>
            {ssids.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Building</label>
          <input
            list="dash-buildings"
            value={currentBuilding}
            onChange={(e) => setCurrentBuilding(e.target.value)}
            placeholder="e.g. HQ"
            className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <datalist id="dash-buildings">
            {buildings.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">I'm on</label>
          <input
            list="dash-floors"
            value={currentFloor}
            onChange={(e) => setCurrentFloor(e.target.value)}
            placeholder="your floor (free text)"
            className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <datalist id="dash-floors">
            {floors.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div className="ml-auto">
          {live.watching ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              LIVE
              {live.lastUpdate && (
                <span className="font-normal text-emerald-600">
                  {new Date(live.lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
              snapshot
            </span>
          )}
        </div>
      </div>

      {/* Hero + verdict */}
      {strongest && q && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Best AP for “{activeSsid}”
                </p>
                <p className="mt-1 truncate text-2xl font-bold">
                  {apDisplayName(registry, strongest)}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{strongest.bssid}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                    <MapPin className="h-3 w-3" />
                    {strongestLoc ?? "location not set"}
                  </span>
                  {strongest.channel != null && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1">Ch {strongest.channel}</span>
                  )}
                  <BandTag band={strongest.band} />
                  {strongest.radio && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1">{strongest.radio}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black">
                  {strongest.dbm}
                  <span className="text-sm font-medium text-slate-400"> dBm</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <SignalBars dbm={strongest.dbm} />
                  <span className="text-sm font-semibold">{q.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Roaming check</h3>
              {live.watching && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Zap className="h-3 w-3" /> AUTO
                </span>
              )}
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {stickyWarning ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <TriangleAlert className="h-4 w-4" /> Sticky client detected
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    You're connected to <b>{connectedLoc ?? "a weaker AP"}</b> at {connected!.dbm}{" "}
                    dBm, but the <b>{strongestLoc ?? "nearest"} AP</b> is much stronger (
                    {strongest.dbm} dBm). Toggle WiFi off/on to force the roam.
                  </p>
                </div>
              ) : connected ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CircleCheck className="h-4 w-4" /> Connected to the best AP
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    You're on <b>{connectedLoc ?? "the strongest AP"}</b> — no action needed.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  {live.watching
                    ? "Connected AP is unknown — make sure your loop also runs `netsh wlan show interfaces`."
                    : "Add `netsh wlan show interfaces` to the loop (or pick an AP below) to detect the sticky-client case."}
                </div>
              )}

              {(wrongBuilding || wrongFloor) && connectedLoc && userWhere && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Search className="h-4 w-4" /> Wrong {wrongBuilding ? "building" : "floor"}{" "}
                    attachment
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    You're marked at <b>{userWhere}</b>, but attached to{" "}
                    <b>{connectedLoc}</b> — exactly the "full signal but wrong floor" case.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500">
                  Connected AP {live.watching && "(auto-detected by the live loop)"}
                </label>
                <select
                  value={connectedBssid}
                  onChange={(e) => setConnectedBssid(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                >
                  <option value="">— unknown —</option>
                  {myAps.map((a) => (
                    <option key={a.bssid} value={a.bssid}>
                      {apDisplayName(registry, a) + ` · ${a.dbm} dBm`}
                    </option>
                  ))}
                </select>
                {connectedBssid && live.watching && (
                  <p className="mt-1 text-[11px] text-emerald-600">
                    Auto-updates from scan.txt every 5 s.
                  </p>
                )}
              </div>

              {/* Roam event log */}
              <div>
                <label className="text-xs font-medium text-slate-500">Roam events</label>
                {roams.length === 0 ? (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                    {live.watching
                      ? "No roams yet — walk to another area and watch this fill in when your laptop hops APs."
                      : "Roams between APs will be logged here as the connected AP changes."}
                  </p>
                ) : (
                  <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
                    {roams.map((r) => (
                      <li
                        key={r.t}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1"
                      >
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(r.t).toLocaleTimeString()}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-600">
                          <span className="truncate">{bssidDisplayName(registry, r.from)}</span>
                          <MoveRight className="h-3 w-3 shrink-0 text-indigo-500" />
                          <span className="truncate font-semibold text-slate-800">
                            {bssidDisplayName(registry, r.to)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LiveHistoryChart
        history={history}
        match={(bssid) => chartAllWifi || (lastSeenSsid[bssid] ?? "") === activeSsid}
        connectedBssid={connectedBssid}
        registry={registry}
        bandOf={bandOf}
      />

      <DevicesPanel
        devices={devices}
        connectedBssid={connectedBssid}
        activeSsid={activeSsid}
      />

      {/* Same-SSID ranking */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          All APs on “{activeSsid}” ({myAps.length})
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Same network name, different physical access points — ranked by real signal strength.
        </p>
        <div className="mt-4 space-y-2">
          {myAps.map((a, i) => {
            const bld = buildingOf(a.bssid);
            const fl = floorOf(a.bssid);
            const isConn = a.bssid === connectedBssid;
            const isBest = i === 0;
            const q2 = quality(a.dbm);
            const pts = history[a.bssid];
            let delta = 0;
            if (pts && pts.length >= 2) {
              const last = pts[pts.length - 1];
              const prev = pts[pts.length - 2];
              if (last.dbm != null && prev.dbm != null) delta = last.dbm - prev.dbm;
            }
            return (
              <div
                key={a.bssid}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  isConn ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100"
                )}
              >
                <SignalBars dbm={a.dbm} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {apDisplayName(registry, a)}
                    </span>
                    {devNumber.get(a.bssid) != null &&
                      devices[(devNumber.get(a.bssid) ?? 1) - 1].members.length > 1 && (
                        <span
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                          title="Shares this radio with other SSIDs (see Physical devices)"
                        >
                          D{devNumber.get(a.bssid)}
                        </span>
                      )}
                    {isBest && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        STRONGEST
                      </span>
                    )}
                    {isConn && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        CONNECTED
                      </span>
                    )}
                    <BandTag band={a.band} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-slate-400">
                    <span>{a.bssid}</span>
                    {bld && (
                      <span className="inline-flex items-center gap-0.5 text-slate-500">
                        · <Building2 className="h-3 w-3" /> {bld}
                      </span>
                    )}
                    {fl && (
                      <span className="inline-flex items-center gap-0.5 text-slate-500">
                        · <MapPin className="h-3 w-3" /> {fl}
                      </span>
                    )}
                    {a.channel != null && <span>· ch {a.channel}</span>}
                  </div>
                </div>
                <Trend delta={delta} />
                <div className="text-right">
                  <div className={cn("text-sm font-bold", q2.color)}>{a.dbm} dBm</div>
                  <div className="text-[11px] text-slate-400">
                    {a.percent}% · {q2.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Other networks */}
      {aps.some((a) => a.ssid !== activeSsid) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Other nearby networks</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {aps
              .filter((a) => a.ssid !== activeSsid)
              .map((a) => (
                <div key={a.bssid} className="flex items-center gap-3 py-2">
                  <SignalBars dbm={a.dbm} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{a.ssid}</span>
                  <BandTag band={a.band} />
                  <span className="w-20 text-right font-mono text-xs text-slate-400">
                    {a.dbm} dBm
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Trend({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="flex w-14 items-center justify-center gap-1 text-[10px] text-slate-300">
        <Minus className="h-3 w-3" /> ±0
      </span>
    );
  if (delta > 0)
    return (
      <span className="flex w-14 items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" /> +{delta}
      </span>
    );
  return (
    <span className="flex w-14 items-center justify-center gap-1 text-[10px] font-semibold text-rose-500">
      <TrendingDown className="h-3 w-3" /> {delta}
    </span>
  );
}

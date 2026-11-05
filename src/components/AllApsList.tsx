import { Building2, MapPin, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { AccessPoint, History, Registry } from "../lib/types";
import type { DeviceGroup } from "../lib/devices";
import { quality } from "../lib/signal";
import { apDisplayName } from "../lib/labels";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { cn } from "../utils/cn";

export interface AllApsListProps {
  aps: AccessPoint[];
  activeSsid: string;
  registry: Registry;
  connectedBssid: string;
  history: History;
  devices: DeviceGroup[];
  devNumber: Map<string, number>;
}

export function AllApsList({
  aps,
  activeSsid,
  registry,
  connectedBssid,
  history,
  devices,
  devNumber,
}: AllApsListProps) {
  const buildingOf = (bssid: string) => registry[bssid]?.building?.trim() || null;
  const floorOf = (bssid: string) => registry[bssid]?.floor?.trim() || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        All APs on “{activeSsid}” ({aps.length})
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Same network name, different physical access points — ranked by real signal strength.
      </p>
      <div className="mt-4 space-y-2">
        {aps.map((a, i) => {
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
          const devIdx = devNumber.get(a.bssid);
          const hasMultipleMembers =
            devIdx != null && devices[(devIdx ?? 1) - 1]?.members.length > 1;

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
                  {hasMultipleMembers && (
                    <span
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                      title="Shares this radio with other SSIDs (see Physical devices)"
                    >
                      D{devIdx}
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


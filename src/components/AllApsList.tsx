import { Building2, MapPin, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { AccessPoint, History, Registry } from "../lib/types";
import type { DeviceGroup } from "../lib/devices";
import { quality } from "../lib/signal";
import { bssidDisplayName } from "../lib/labels";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { Card } from "./ui/Card";
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
    <Card>
      <h2 className="text-sm font-semibold text-slate-900">
        All APs on “{activeSsid}” ({aps.length})
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Same network name, different physical access points — ranked by real signal strength.
      </p>
      <div className="mt-4 divide-y divide-slate-100">
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
                "flex items-center gap-3 px-3 py-2.5",
                isConn && "border-l-2 border-indigo-400 bg-indigo-50/50"
              )}
            >
              <SignalBars dbm={a.dbm} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {bssidDisplayName(registry, a.bssid)}
                  </span>
                  {hasMultipleMembers && (
                    <span
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-micro font-bold text-slate-600"
                      title="Shares this radio with other SSIDs (see Physical devices)"
                    >
                      D{devIdx}
                      <span className="sr-only"> - shares this radio with other SSIDs</span>
                    </span>
                  )}
                  {isBest && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-micro font-semibold text-emerald-700">
                      STRONGEST
                    </span>
                  )}
                  {isConn && (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-micro font-semibold text-indigo-700">
                      CONNECTED
                    </span>
                  )}
                  <BandTag band={a.band} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-xs text-slate-600">
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
                <div className="text-xs text-slate-600">
                  {a.percent}% · {q2.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Trend({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="flex w-14 items-center justify-center gap-1 text-micro text-slate-300">
        <Minus className="h-3 w-3" /> ±0
      </span>
    );
  if (delta > 0)
    return (
      <span className="flex w-14 items-center justify-center gap-1 text-micro font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" /> +{delta}
      </span>
    );
  return (
    <span className="flex w-14 items-center justify-center gap-1 text-micro font-semibold text-rose-500">
      <TrendingDown className="h-3 w-3" /> {delta}
    </span>
  );
}

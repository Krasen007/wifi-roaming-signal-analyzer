import { MapPin } from "lucide-react";
import type { AccessPoint, Registry } from "../lib/types";
import { quality } from "../lib/signal";
import { apDisplayName, locationLabel } from "../lib/labels";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";

export interface SignalHeroProps {
  strongest: AccessPoint;
  activeSsid: string;
  registry: Registry;
}

export function SignalHero({ strongest, activeSsid, registry }: SignalHeroProps) {
  const strongestLoc = locationLabel(registry, strongest.bssid);
  const q = quality(strongest.dbm);

  return (
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
  );
}


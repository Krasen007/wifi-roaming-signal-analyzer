import { ChevronDown, MapPin, Wifi } from "lucide-react";
import type { AccessPoint, Registry } from "../lib/types";
import { quality } from "../lib/signal";
import { bssidDisplayName, locationLabel } from "../lib/labels";
import { SignalBars } from "./SignalBars";
import { Card } from "./ui/Card";

export interface SignalHeroProps {
  strongest: AccessPoint;
  activeSsid: string;
  registry: Registry;
  /** True when the hero AP is the one we're actually attached to. */
  isConnected?: boolean;
}

export function SignalHero({ strongest, activeSsid, registry, isConnected = false }: SignalHeroProps) {
  const loc = locationLabel(registry, strongest.bssid);
  const unit = bssidDisplayName(registry, strongest.bssid);
  const q = quality(strongest.dbm);

  return (
    <Card tone="hero" padding="lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-caps text-white/60">
            {isConnected ? "You are connected to" : "Strongest nearby"}
          </p>
          <p className="mt-1 truncate text-lg font-semibold" title={activeSsid}>
            {activeSsid}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-micro font-semibold ${
            isConnected ? "bg-emerald-400/20 text-emerald-100" : "bg-white/10 text-white/80"
          }`}
        >
          <Wifi className="h-3 w-3" aria-hidden="true" />
          {isConnected ? "active" : "idle"}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <SignalBars dbm={strongest.dbm} className="pb-1" />
        <div className="min-w-0">
          <p className="text-3xl font-black leading-none">
            {strongest.dbm}
            <span className="ml-1 text-sm font-medium text-white/60">dBm</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-white/80">
            {q.label} · {strongest.percent}% of full
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        Higher is better — walk around and watch this card change.
      </p>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-white/90">
        <MapPin className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
        <span className="truncate" title={loc ?? "Location not set"}>
          {loc ?? "Location not set — add it in Locations"}
        </span>
      </p>

      <details className="group mt-4 rounded-xl bg-white/5 ring-1 ring-white/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-white/90 marker:hidden">
          Access point details
          <ChevronDown
            className="h-4 w-4 shrink-0 text-white/60 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 px-3 py-3 text-xs">
          <Datum label="Access point" value={unit} />
          <Datum label="ID (BSSID)" value={strongest.bssid} mono />
          <Datum label="Exact signal" value={`${strongest.dbm} dBm`} mono />
          <Datum label="Channel" value={strongest.channel != null ? String(strongest.channel) : "—"} />
          <Datum label="Band" value={strongest.band === "?" ? "unknown" : `${strongest.band} GHz`} />
          <Datum label="Radio" value={strongest.radio ?? "—"} />
        </dl>
      </details>
    </Card>
  );
}

function Datum({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-white/50">{label}</dt>
      <dd
        className={`truncate text-white/90 ${mono ? "font-mono text-micro" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

import type { AccessPoint } from "../lib/types";
import { quality } from "../lib/signal";
import { ChevronDown } from "lucide-react";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { Card } from "./ui/Card";

export interface OtherNetworksProps {
  aps: AccessPoint[];
  activeSsid: string;
}

export function OtherNetworks({ aps, activeSsid }: OtherNetworksProps) {
  const otherAps = aps.filter((a) => a.ssid !== activeSsid);

  if (otherAps.length === 0) return null;

  return (
    <Card>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 marker:hidden">
          <span>
            <span className="block text-sm font-semibold text-[var(--fs-text)]">
              Other Wi-Fi networks nearby ({otherAps.length})
            </span>
            <span className="mt-0.5 block text-xs text-[var(--fs-text-secondary)]">
              Networks you are not analysing right now.
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--fs-text-muted)] transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-3 divide-y divide-[var(--fs-border)]">
          {otherAps.map((a) => (
            <div key={a.bssid} className="flex items-center gap-3 py-2">
              <SignalBars dbm={a.dbm} />
              <span
                className="min-w-0 flex-1 truncate text-sm text-[var(--fs-text)]"
                title={`${a.bssid} · ${a.dbm} dBm`}
              >
                {a.ssid}
              </span>
              <BandTag band={a.band} />
              <span
                className="w-20 text-right font-mono text-xs text-[var(--fs-text-secondary)]"
                title={quality(a.dbm).label}
              >
                {a.dbm} dBm
              </span>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}

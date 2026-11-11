import type { AccessPoint } from "../lib/types";
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
      <h2 className="text-sm font-semibold text-slate-900">Other nearby networks</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {otherAps.map((a) => (
          <div key={a.bssid} className="flex items-center gap-3 py-2">
            <SignalBars dbm={a.dbm} />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{a.ssid}</span>
            <BandTag band={a.band} />
            <span className="w-20 text-right font-mono text-xs text-slate-600">
              {a.dbm} dBm
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

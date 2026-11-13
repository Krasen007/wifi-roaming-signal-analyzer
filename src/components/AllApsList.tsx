import { MapPin, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { AccessPoint, History, Registry } from "../lib/types";
import type { DeviceGroup } from "../lib/devices";
import { deviceColor } from "../lib/devices";
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
  const floorOf = (bssid: string) => registry[bssid]?.floor?.trim() || null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--fs-text)]">
        Access points on “{activeSsid}” ({aps.length})
      </h2>

      <div className="mt-4 divide-y divide-[var(--fs-border)]">
        {aps.map((a, i) => {
          const fl = floorOf(a.bssid);
          const isConn = a.bssid === connectedBssid;
          const isBest = i === 0;
          const q = quality(a.dbm);
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
                isConn && "border-l-2 border-[var(--fs-primary)] bg-[var(--fs-primary-light)]"
              )}
            >
              <SignalBars dbm={a.dbm} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="truncate text-sm font-semibold text-[var(--fs-text)]"
                    title={`${a.bssid} · ${a.dbm} dBm · channel ${a.channel ?? "?"}`}
                  >
                    {bssidDisplayName(registry, a.bssid)}
                  </span>
                  {hasMultipleMembers && devIdx != null && (
                    <span
                      className="rounded px-1.5 py-0.5 text-micro font-bold whitespace-nowrap"
                      title="This box also broadcasts other network names"
                      style={{
                        backgroundColor: deviceColor(devIdx).bg,
                        color: deviceColor(devIdx).text,
                      }}
                    >
                      Unit {devIdx}

                    </span>
                  )}
                  {isBest && (
                    <span className="rounded bg-[var(--fs-success-light)] px-1.5 py-0.5 text-micro font-semibold text-[var(--fs-success)]">
                      strongest
                    </span>
                  )}
                  {isConn && (
                    <span className="rounded bg-[var(--fs-primary-light)] px-1.5 py-0.5 text-micro font-semibold text-[var(--fs-primary)]">
                      connected
                    </span>
                  )}
                  <BandTag band={a.band} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--fs-text-secondary)]">
                  <span className="font-mono text-micro text-[var(--fs-text-muted)]">{a.bssid}</span>
                  {fl && (
                    <span className="inline-flex items-center gap-0.5">
                      · <MapPin className="h-3 w-3" aria-hidden="true" /> {fl}
                    </span>
                  )}
                </div>
              </div>
              <Trend delta={delta} />
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--fs-text)]">
                  {a.dbm}
                  <span className="ml-0.5 text-micro font-medium text-[var(--fs-text-secondary)]">
                    dBm
                  </span>
                </div>
                <div
                  className="text-xs text-[var(--fs-text-secondary)]"
                  title={`${q.label} · ${a.percent}% of full`}
                >
                  {a.percent}% · {q.label}
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
      <span className="flex w-14 items-center justify-center gap-1 text-micro text-[var(--fs-text-muted)]">
        <Minus className="h-3 w-3" aria-hidden="true" /> steady
      </span>
    );
  if (delta > 0)
    return (
      <span
        className="flex w-14 items-center justify-center gap-1 text-micro font-semibold text-[var(--fs-success)]"
        title="Stronger than the previous scan"
      >
        <TrendingUp className="h-3 w-3" aria-hidden="true" /> up
      </span>
    );
  return (
    <span
      className="flex w-14 items-center justify-center gap-1 text-micro font-semibold text-[var(--fs-danger)]"
      title="Weaker than the previous scan"
    >
      <TrendingDown className="h-3 w-3" aria-hidden="true" /> down
    </span>
  );
}

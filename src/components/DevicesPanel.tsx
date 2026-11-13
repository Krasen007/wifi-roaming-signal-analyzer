import type { DeviceGroup } from "../lib/devices";
import { deviceColor } from "../lib/devices";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { ChevronDown, MapPin, RadioTower } from "lucide-react";
import { quality } from "../lib/signal";
import { Card } from "./ui/Card";
import { cn } from "../utils/cn";

export function DevicesPanel({
  devices,
  connectedBssid,
  activeSsid,
}: {
  devices: DeviceGroup[];
  connectedBssid: string;
  activeSsid: string;
}) {
  const multi = devices.filter((d) => d.members.length > 1);
  if (devices.length === 0) return null;

  const connectedUnit = devices.find((d) => d.connected);

  return (
    <Card>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 marker:hidden">
          <span className="rounded-lg bg-[var(--fs-bg-tertiary)] p-2 text-[var(--fs-text-secondary)]">
            <RadioTower className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--fs-text)]">
              Access point hardware ({devices.length})
            </span>
            <span className="mt-0.5 block text-xs text-[var(--fs-text-secondary)]">
              {connectedUnit
                ? `You are connected to Unit ${connectedUnit.index}. `
                : ""}
              {multi.length > 0 && `${multi.length} unit${multi.length > 1 ? "s share" : " shares"} one box across several network names.`}
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--fs-text-muted)] transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {devices.map((dev) => {
            const color = deviceColor(dev.index);
            return (
              <div
                key={dev.key}
                className={cn(
                  "rounded-xl p-3 border-l-4",
                  dev.connected
                    ? "bg-[var(--fs-primary-light)] border-[var(--fs-primary)]"
                    : "bg-[var(--fs-bg-secondary)] border-[var(--fs-border)]"
                )}
                style={{ borderColor: color.border }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-micro font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                      }}
                    >
                      Unit {dev.index}
                    </span>
                  <span className="truncate text-sm font-semibold text-[var(--fs-text)]">
                    {dev.displayName}
                  </span>
                  {dev.location && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-[var(--fs-text-secondary)]">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {dev.location}
                    </span>
                  )}
                </div>
                {dev.connected && (
                  <span className="shrink-0 rounded bg-[var(--fs-primary-light)] px-1.5 py-0.5 text-micro font-bold text-[var(--fs-primary)]">
                    connected
                  </span>
                )}
              </div>

              <div className="mt-2.5 divide-y divide-[var(--fs-border)]">
                {dev.members.map((m) => (
                  <div key={m.bssid} className="flex items-center gap-2.5 py-1.5 text-xs">
                    <SignalBars dbm={m.dbm} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        m.ssid === activeSsid
                          ? "text-[var(--fs-text)]"
                          : "text-[var(--fs-text-secondary)]"
                      )}
                      title={`${m.ssid} · ${m.bssid} · ${m.dbm} dBm`}
                    >
                      {m.ssid}
                      <span className="sr-only"> ({m.bssid}, {m.dbm} dBm)</span>
                      {m.ssid === activeSsid && (
                        <span className="ml-1.5 rounded bg-[var(--fs-success-light)] px-1 py-0.5 text-micro font-bold text-[var(--fs-success)]">
                          your network
                        </span>
                      )}
                      {m.bssid === connectedBssid && (
                        <span className="ml-1.5 rounded bg-[var(--fs-primary-light)] px-1 py-0.5 text-micro font-bold text-[var(--fs-primary)]">
                          connected
                        </span>
                      )}
                    </span>
                    <BandTag band={m.band} />
                    <span
                      className="shrink-0 font-mono text-[var(--fs-text-secondary)]"
                      title={quality(m.dbm).label}
                    >
                      {m.dbm} dBm
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-micro text-[var(--fs-text-muted)]">
                {dev.members.map((m) => m.bssid.slice(-5)).join(" · ")}
              </p>
            </div>
          )})}
        </div>
      </details>
    </Card>
  );
}

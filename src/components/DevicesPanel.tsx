import type { DeviceGroup } from "../lib/devices";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { RadioTower, MapPin } from "lucide-react";
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

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
          <RadioTower className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Physical devices ({devices.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {multi.length > 0
              ? `${multi.length} device${multi.length > 1 ? "s broadcast" : " broadcasts"} multiple SSIDs on one radio. Members of the same D-number are the same hardware.`
              : "Each nearby BSSID belongs to a distinct device."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {devices.map((dev) => (
            <div
              key={dev.key}
              className={cn(
                "rounded-xl p-3",
                dev.connected ? "bg-indigo-50/40" : "bg-slate-50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 text-micro font-bold text-white">
                    D{dev.index}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {dev.displayName}
                  </span>
                  {dev.location && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {dev.location}
                    </span>
                  )}
                </div>
                {dev.connected && (
                  <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-micro font-bold text-indigo-700">
                    CONNECTED
                  </span>
                )}
              </div>

              <div className="mt-2.5 divide-y divide-slate-100">
                {dev.members.map((m) => (
                  <div key={m.bssid} className="flex items-center gap-2.5 py-1.5 text-xs">
                    <SignalBars dbm={m.dbm} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        m.ssid === activeSsid ? "text-slate-800" : "text-slate-500"
                      )}
                      title={m.bssid}
                    >
                      {m.ssid}
                      <span className="sr-only"> ({m.bssid})</span>
                      {m.ssid === activeSsid && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1 py-0.5 text-micro font-bold text-emerald-700">
                          your network
                        </span>
                      )}
                      {m.bssid === connectedBssid && (
                        <span className="ml-1.5 rounded bg-indigo-100 px-1 py-0.5 text-micro font-bold text-indigo-700">
                          HERE
                        </span>
                      )}
                    </span>
                    <BandTag band={m.band} />
                    <span className="font-mono text-xs text-slate-400">{m.dbm} dBm</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-micro text-slate-400">
                {dev.members.map((m) => m.bssid.slice(-5)).join(" · ")}
              </p>
            </div>
          ))}
      </div>
    </Card>
  );
}

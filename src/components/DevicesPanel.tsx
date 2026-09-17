import type { Registry } from "../lib/types";
import type { DeviceGroup } from "../lib/devices";
import { SignalBars } from "./SignalBars";
import { BandTag } from "./BandTag";
import { RadioTower, MapPin } from "lucide-react";
import { cn } from "../utils/cn";

export function DevicesPanel({
  devices,
  registry,
  connectedBssid,
  activeSsid,
}: {
  devices: DeviceGroup[];
  registry: Registry;
  connectedBssid: string;
  activeSsid: string;
}) {
  void registry;
  const multi = devices.filter((d) => d.members.length > 1);
  if (devices.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
          <RadioTower className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Physical devices ({devices.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {multi.length > 0
              ? `${multi.length} device${multi.length > 1 ? "s broadcast" : " broadcasts"} multiple SSIDs on one radio. Members of the same D-number are the same hardware.`
              : "Each nearby BSSID belongs to a distinct device."}
          </p>
        </div>
      </div>

      {multi.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {multi.map((dev) => (
            <div
              key={dev.key}
              className={cn(
                "rounded-xl border p-3",
                dev.connected ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    D{dev.index}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {dev.displayName}
                  </span>
                  {dev.location && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {dev.location}
                    </span>
                  )}
                </div>
                {dev.connected && (
                  <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    CONNECTED
                  </span>
                )}
              </div>

              <div className="mt-2.5 space-y-1.5">
                {dev.members.map((m) => (
                  <div key={m.bssid} className="flex items-center gap-2.5 text-xs">
                    <SignalBars dbm={m.dbm} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        m.ssid === activeSsid ? "text-slate-800" : "text-slate-500"
                      )}
                      title={m.bssid}
                    >
                      {m.ssid}
                      {m.ssid === activeSsid && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">
                          your network
                        </span>
                      )}
                      {m.bssid === connectedBssid && (
                        <span className="ml-1.5 rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-bold text-indigo-700">
                          HERE
                        </span>
                      )}
                    </span>
                    <BandTag band={m.band} />
                    <span className="font-mono text-[11px] text-slate-400">{m.dbm} dBm</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-slate-400">
                {dev.members.map((m) => m.bssid.slice(-5)).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { LiveMeta } from "../lib/types";

export interface DashboardControlsProps {
  activeSsid: string;
  ssids: string[];
  onSelectSsid: (ssid: string) => void;
  chartAllWifi: boolean;
  onSelectChartScope: (allWifi: boolean) => void;
  currentBuilding: string;
  onChangeBuilding: (building: string) => void;
  buildings: string[];
  currentFloor: string;
  onChangeFloor: (floor: string) => void;
  floors: string[];
  live: LiveMeta;
}

export function DashboardControls({
  activeSsid,
  ssids,
  onSelectSsid,
  chartAllWifi,
  onSelectChartScope,
  currentBuilding,
  onChangeBuilding,
  buildings,
  currentFloor,
  onChangeFloor,
  floors,
  live,
}: DashboardControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="dash-network-select" className="text-xs font-medium text-slate-500">
          Network
        </label>
        <select
          id="dash-network-select"
          value={activeSsid}
          onChange={(e) => onSelectSsid(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          {ssids.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="chart-network" className="text-xs font-medium text-slate-500">
          Chart
        </label>
        <select
          id="chart-network"
          value={chartAllWifi ? "__all__" : "__active__"}
          onChange={(e) => onSelectChartScope(e.target.value === "__all__")}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          <option value="__all__">All detected Wi‑Fi</option>
          <option value="__active__">Active network</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="dash-building-input" className="text-xs font-medium text-slate-500">
          Building
        </label>
        <input
          id="dash-building-input"
          list="dash-buildings"
          value={currentBuilding}
          onChange={(e) => onChangeBuilding(e.target.value)}
          placeholder="e.g. HQ"
          className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <datalist id="dash-buildings">
          {buildings.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="dash-floor-input" className="text-xs font-medium text-slate-500">
          I'm on
        </label>
        <input
          id="dash-floor-input"
          list="dash-floors"
          value={currentFloor}
          onChange={(e) => onChangeFloor(e.target.value)}
          placeholder="your floor (free text)"
          className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <datalist id="dash-floors">
          {floors.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>

      <div className="ml-auto">
        {live.watching ? (
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE
            {live.lastUpdate && (
              <span className="font-normal text-emerald-600">
                {new Date(live.lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
            snapshot
          </span>
        )}
      </div>
    </div>
  );
}

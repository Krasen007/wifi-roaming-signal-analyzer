import { useMemo, useState } from "react";
import type { AccessPoint, Registry, RegistryEntry } from "../lib/types";
import { BandTag } from "./BandTag";
import { SignalBars } from "./SignalBars";
import { cn } from "../utils/cn";

export function RegistryManager({
  aps,
  registry,
  onChange,
}: {
  aps: AccessPoint[];
  registry: Registry;
  onChange: (r: Registry) => void;
}) {
  const [manualBssid, setManualBssid] = useState("");

  // union of scanned bssids and registered bssids
  const rows = useMemo(() => {
    const map = new Map<string, { bssid: string; ap?: AccessPoint; entry?: RegistryEntry }>();
    for (const ap of aps) map.set(ap.bssid, { bssid: ap.bssid, ap });
    for (const key of Object.keys(registry)) {
      const existing = map.get(key);
      if (existing) existing.entry = registry[key];
      else map.set(key, { bssid: key, entry: registry[key] });
    }
    return Array.from(map.values()).sort(
      (a, b) => (b.ap?.dbm ?? -999) - (a.ap?.dbm ?? -999)
    );
  }, [aps, registry]);

  const update = (bssid: string, patch: Partial<RegistryEntry>) => {
    const prev = registry[bssid] ?? { bssid, building: "", floor: "", name: "" };
    const next: RegistryEntry = { ...prev, ...patch, bssid };
    const r = { ...registry, [bssid]: next };
    if (!next.building && !next.floor && !next.name && !next.note) delete r[bssid];
    onChange(r);
  };

  const remove = (bssid: string) => {
    const r = { ...registry };
    delete r[bssid];
    onChange(r);
  };

  // Free-text fields: suggestions reuse values you've already used, so the same
  // floor name in different buildings (or custom building names) keeps working.
  const { floorSuggestions, buildingSuggestions } = useMemo(() => {
    const floors = new Set<string>();
    const buildings = new Set<string>();
    Object.values(registry).forEach((e) => {
      e.floor && floors.add(e.floor);
      e.building && buildings.add(e.building);
    });
    if (floors.size === 0)
      ["Basement", "Ground floor", "1st floor", "2nd floor", "3rd floor", "Attic"].forEach((f) =>
        floors.add(f)
      );
    if (buildings.size === 0) ["HQ", "Branch office A", "Branch office B"].forEach((b) => buildings.add(b));
    return { floorSuggestions: Array.from(floors), buildingSuggestions: Array.from(buildings) };
  }, [registry]);

  const addManual = () => {
    const b = manualBssid.trim().toLowerCase().replace(/-/g, ":");
    if (/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(b)) {
      update(b, {});
      setManualBssid("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        <b>The key to your problem:</b> assign each BSSID (a physical AP's MAC address) to a{" "}
        <b>building</b> and <b>floor</b>. Since all your APs broadcast the same SSID, the BSSID is
        the only reliable way to know exactly which AP you're near. All fields are free text — use
        whatever names fit your buildings ("HQ", "Warehouse", "Mezzanine", "Floor 7"…). Tip: stand
        next to each AP, run a scan, and the strongest BSSID is that AP.
      </div>

      <datalist id="floor-suggestions">
        {floorSuggestions.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="building-suggestions">
        {buildingSuggestions.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Signal</th>
              <th className="px-4 py-2 font-medium">BSSID (AP hardware)</th>
              <th className="px-4 py-2 font-medium">SSID</th>
              <th className="px-4 py-2 font-medium">Building</th>
              <th className="px-4 py-2 font-medium">Floor</th>
              <th className="px-4 py-2 font-medium">AP name</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  No APs yet — import a scan first, or add a BSSID manually below.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const registered = !!(row.entry?.building || row.entry?.floor || row.entry?.name);
              return (
                <tr
                  key={row.bssid}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    registered ? "bg-emerald-50/40" : ""
                  )}
                >
                  <td className="px-4 py-2">
                    {row.ap ? (
                      <div className="flex items-center gap-2">
                        <SignalBars dbm={row.ap.dbm} />
                        <span className="text-xs text-slate-400">{row.ap.dbm}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">offline</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      {row.bssid}
                      {row.ap && <BandTag band={row.ap.band} />}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{row.ap?.ssid ?? "—"}</td>
                  <td className="px-4 py-2">
                    <input
                      list="building-suggestions"
                      value={row.entry?.building ?? ""}
                      onChange={(e) => update(row.bssid, { building: e.target.value })}
                      placeholder="e.g. HQ"
                      className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      list="floor-suggestions"
                      value={row.entry?.floor ?? ""}
                      onChange={(e) => update(row.bssid, { floor: e.target.value })}
                      placeholder="e.g. 2nd floor"
                      className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.entry?.name ?? ""}
                      onChange={(e) => update(row.bssid, { name: e.target.value })}
                      placeholder="e.g. Bedroom AP"
                      className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {registered && (
                      <button
                        onClick={() => remove(row.bssid)}
                        className="text-xs font-medium text-rose-500 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={manualBssid}
          onChange={(e) => setManualBssid(e.target.value)}
          placeholder="Add a BSSID manually (aa:bb:cc:dd:ee:ff)"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={addManual}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Add
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { AccessPoint, Band, Registry, RegistryEntry } from "../lib/types";
import { BandTag } from "./BandTag";
import { SignalBars } from "./SignalBars";
import { Card } from "./ui/Card";
import { cn } from "../utils/cn";

import { registryValueSets } from "../lib/labels";

type SortKey = "signal" | "bssid" | "ssid" | "band" | "building" | "floor" | "location";
type SortDir = "asc" | "desc";
type SortState = { key: SortKey; dir: SortDir };
type Row = { bssid: string; ap?: AccessPoint; entry?: RegistryEntry };

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function rowText(row: Row, key: SortKey): string {
  switch (key) {
    case "bssid":
      return row.bssid;
    case "ssid":
      return row.ap?.ssid ?? "";
    case "building":
      return row.entry?.building ?? "";
    case "floor":
      return row.entry?.floor ?? "";
    case "location":
      return row.entry?.location ?? "";
    case "band":
      return row.entry?.band ?? row.ap?.band ?? "";
    default:
      return "";
  }
}

export function RegistryManager({
  aps,
  registry,
  connectedBssid,
  onChange,
}: {
  aps: AccessPoint[];
  registry: Registry;
  connectedBssid: string;
  onChange: (r: Registry) => void;
}) {
  const [manualBssid, setManualBssid] = useState("");
  const [bssidError, setBssidError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "signal", dir: "desc" });

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "signal" ? "desc" : "asc" }
    );
  };

  // union of scanned bssids and registered bssids
  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const ap of aps) map.set(ap.bssid, { bssid: ap.bssid, ap });
    for (const key of Object.keys(registry)) {
      const existing = map.get(key);
      if (existing) existing.entry = registry[key];
      else map.set(key, { bssid: key, entry: registry[key] });
    }

    const dir = sort.dir === "asc" ? 1 : -1;
    return Array.from(map.values()).sort((a, b) => {
      let result = 0;
      if (sort.key === "signal") {
        const ad = a.ap?.dbm;
        const bd = b.ap?.dbm;
        if (ad == null && bd == null) result = 0;
        else if (ad == null) result = 1;
        else if (bd == null) result = -1;
        else result = (ad - bd) * dir;
      } else {
        const av = rowText(a, sort.key).trim();
        const bv = rowText(b, sort.key).trim();
        if (!av && !bv) result = 0;
        else if (!av) result = 1;
        else if (!bv) result = -1;
        else result = compareText(av, bv) * dir;
      }
      return result || a.bssid.localeCompare(b.bssid);
    });
  }, [aps, registry, sort]);

  const update = (bssid: string, patch: Partial<RegistryEntry>) => {
    const prev = registry[bssid] ?? { bssid, building: "", floor: "", location: "" };
    const next: RegistryEntry = { ...prev, ...patch, bssid };
    const r = { ...registry, [bssid]: next };
    // Keep the entry if it has a remembered band, even without a location.
    if (!next.building && !next.floor && !next.location && !next.band) delete r[bssid];
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
    const { floors, buildings } = registryValueSets(registry);
    return { floorSuggestions: Array.from(floors), buildingSuggestions: Array.from(buildings) };
  }, [registry]);

  const addEmptyEntry = (bssid: string) => {
    if (registry[bssid]) return;
    onChange({ ...registry, [bssid]: { bssid, building: "", floor: "", location: "" } });
  };

  const addManual = () => {
    const raw = manualBssid.trim();
    if (!raw) {
      setBssidError("Enter a BSSID first.");
      return;
    }
    const b = raw.toLowerCase().replace(/-/g, ":");
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(b)) {
      setBssidError("Use six hex octets, e.g. aa:bb:cc:dd:ee:ff.");
      return;
    }
    setBssidError(null);
    addEmptyEntry(b);
    setManualBssid("");
  };

  return (
    <div className="space-y-4">
      <h2 className="sr-only">AP Registry</h2>
      <Card tone="accent" padding="sm" className="text-sm text-indigo-900">
        <b>The key to your problem:</b> assign each BSSID (a physical AP's MAC address) to a{" "}
        <b>building</b> and <b>floor</b>. Since all your APs broadcast the same SSID, the BSSID is
        the only reliable way to know exactly which AP you're near. All fields are free text — use
        whatever names fit your buildings ("HQ", "Warehouse", "Mezzanine", "Floor 7"…). Tip: stand
        next to each AP, run a scan, and the strongest BSSID is that AP.
      </Card>

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

      <Card padding="none" className="overflow-x-auto responsive-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <SortableTh
                label="Signal"
                sortKey="signal"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableTh
                label="BSSID (AP hardware)"
                sortKey="bssid"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableTh label="Band" sortKey="band" sort={sort} onSort={toggleSort} />
              <SortableTh label="SSID" sortKey="ssid" sort={sort} onSort={toggleSort} />
              <SortableTh label="Building" sortKey="building" sort={sort} onSort={toggleSort} />
              <SortableTh label="Floor" sortKey="floor" sort={sort} onSort={toggleSort} />
              <SortableTh label="Location" sortKey="location" sort={sort} onSort={toggleSort} />
              <th className="px-1 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-600">
                  No APs yet — import a scan first, or add a BSSID manually below.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const registered = !!(
                row.entry?.building ||
                row.entry?.floor ||
                row.entry?.location ||
                row.entry?.band
              );
              const isConnected = row.bssid === connectedBssid;
              // Remembered band takes precedence (shows for offline APs too),
              // falling back to the band from the current scan.
              const band: Band | undefined = row.entry?.band ?? row.ap?.band;
              return (
                <tr
                  key={row.bssid}
                  className={cn(
                    "border-b border-slate-100 last:border-0",
                    isConnected
                      ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200"
                      : registered
                        ? "bg-emerald-50/40"
                        : ""
                  )}
                >
                  <td className="px-1 py-1" data-label="Signal">
                    {row.ap ? (
                      <div className="flex items-center gap-2">
                        <SignalBars dbm={row.ap.dbm} />
                        <span className="text-xs text-slate-600">{row.ap.dbm}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">offline</span>
                    )}
                  </td>
                  <td className="px-1 py-1 font-mono text-xs text-slate-700" data-label="BSSID">
                    <div className="flex items-center gap-2">
                      {row.bssid}
                      {isConnected && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-micro font-bold text-indigo-700">
                          CONNECTED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1" data-label="Band">{band && <BandTag band={band} />}</td>
                  <td className="px-1 py-1 text-slate-600" data-label="SSID">{row.ap?.ssid ?? "—"}</td>
                  <td className="px-1 py-1" data-label="Building">
                    <input
                      list="building-suggestions"
                      value={row.entry?.building ?? ""}
                      onChange={(e) => update(row.bssid, { building: e.target.value })}
                      placeholder="e.g. HQ"
                      className="min-h-11 w-28 rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-1 py-1" data-label="Floor">
                    <input
                      list="floor-suggestions"
                      value={row.entry?.floor ?? ""}
                      onChange={(e) => update(row.bssid, { floor: e.target.value })}
                      placeholder="e.g. 2nd floor"
                      className="min-h-11 w-28 rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-1 py-1" data-label="Location">
                    <input
                      value={row.entry?.location ?? ""}
                      onChange={(e) => update(row.bssid, { location: e.target.value })}
                      placeholder="e.g. Hallway, 2nd floor"
                      className="min-h-11 w-32 rounded-md border border-slate-200 px-2 py-2 text-xs focus:border-indigo-400"
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.entry && (
                      <button
                        onClick={() => remove(row.bssid)}
                        className="inline-flex min-h-11 items-center px-2 text-xs font-medium text-rose-500 hover:text-rose-700"
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
      </Card>

      <div>
        <div className="flex items-center gap-2">
          <input
            aria-label="BSSID"
            aria-invalid={Boolean(bssidError)}
            aria-describedby={bssidError ? "manual-bssid-error" : undefined}
            value={manualBssid}
            onChange={(e) => {
              setManualBssid(e.target.value);
              if (bssidError) setBssidError(null);
            }}
            placeholder="Add a BSSID manually (aa:bb:cc:dd:ee:ff)"
            className={cn(
              "min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400",
              bssidError && "border-rose-400"
            )}
          />
          <button
            onClick={addManual}
            className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Add
          </button>
        </div>
        {bssidError && (
          <p id="manual-bssid-error" role="alert" className="text-xs text-rose-600">
            {bssidError}
          </p>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      className="px-1 py-1 font-medium"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-slate-800"
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-indigo-500" : "text-slate-300")} />
      </button>
    </th>
  );
}

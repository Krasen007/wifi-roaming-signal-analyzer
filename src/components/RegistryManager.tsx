import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, MapPin } from "lucide-react";
import type { AccessPoint, Band, Registry, RegistryEntry } from "../lib/types";
import { quality } from "../lib/signal";
import { registryValueSets } from "../lib/labels";
import { groupDevices, deviceColor } from "../lib/devices";
import { BandTag } from "./BandTag";
import { SignalBars } from "./SignalBars";
import { Card } from "./ui/Card";
import { cn } from "../utils/cn";

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

  const devices = useMemo(
    () => groupDevices(aps, registry, connectedBssid),
    [aps, registry, connectedBssid]
  );
  const devNumber = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of devices) for (const member of d.members) m.set(member.bssid, d.index);
    return m;
  }, [devices]);

  const update = (bssid: string, patch: Partial<RegistryEntry>) => {
    const prev = registry[bssid] ?? { bssid, building: "", floor: "", location: "" };
    const next: RegistryEntry = { ...prev, ...patch, bssid };
    const r = { ...registry, [bssid]: next };
    if (!next.building && !next.floor && !next.location && !next.band) delete r[bssid];
    onChange(r);
  };

  const remove = (bssid: string) => {
    const r = { ...registry };
    delete r[bssid];
    onChange(r);
  };

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
      setBssidError("Enter an access point ID first.");
      return;
    }
    const b = raw.toLowerCase().replace(/-/g, ":");
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(b)) {
      setBssidError("Use six pairs of characters, for example aa:bb:cc:dd:ee:ff.");
      return;
    }
    setBssidError(null);
    addEmptyEntry(b);
    setManualBssid("");
  };

  return (
    <div className="space-y-4">
      <Card tone="accent">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-[var(--fs-primary)] p-2 text-white">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--fs-text)]">
              Where are your access points?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
              Tell FloorScope which building and floor each access point is on. Once mapped, it can
              warn you when you are connected to the wrong floor. All fields are free text — use the
              names your team already uses.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-[var(--fs-bg)] px-3 py-2.5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
          <p>
            Only the access points you fill in are checked for wrong-floor warnings. You do not
            need to map every network in range.
          </p>
          <p className="mt-1.5 text-[var(--fs-text-muted)]">
            Tip: stand next to an access point, run a scan, and the strongest row is that box.
          </p>
        </div>
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
            <tr className="border-b border-[var(--fs-border)] bg-[var(--fs-bg-secondary)] text-left text-xs text-[var(--fs-text-secondary)]">
              <SortableTh label="Signal" sortKey="signal" sort={sort} onSort={toggleSort} />
              <th className="px-1 py-1 font-medium text-left text-xs text-[var(--fs-text-secondary)]">
                Device
              </th>
              <SortableTh
                label="Access point ID"
                sortKey="bssid"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableTh label="Band" sortKey="band" sort={sort} onSort={toggleSort} />
              <SortableTh label="Wi-Fi name" sortKey="ssid" sort={sort} onSort={toggleSort} />
              <SortableTh label="Building" sortKey="building" sort={sort} onSort={toggleSort} />
              <SortableTh label="Floor" sortKey="floor" sort={sort} onSort={toggleSort} />
              <SortableTh label="Room / area" sortKey="location" sort={sort} onSort={toggleSort} />
              <th className="px-1 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-[var(--fs-text-secondary)]"
                >
                  No access points yet. Import a scan first, or add one by ID below.
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
              const band: Band | undefined = row.entry?.band ?? row.ap?.band;
              return (
                <tr
                  key={row.bssid}
                  className={cn(
                    "border-b border-[var(--fs-border)] last:border-0",
                    isConnected
                      ? "bg-[var(--fs-primary-light)]"
                      : registered
                        ? "bg-[var(--fs-success-light)]"
                        : ""
                  )}
                >
                  <td className="px-1 py-1" data-label="Signal">
                    {row.ap ? (
                      <div className="flex items-center gap-2">
                        <SignalBars dbm={row.ap.dbm} />
                        <span
                          className="font-mono text-xs text-[var(--fs-text-secondary)]"
                          title={quality(row.ap.dbm).label}
                        >
                          {row.ap.dbm} dBm
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--fs-text-muted)]">not seen now</span>
                    )}
                  </td>
                  <td className="px-1 py-1" data-label="Device">
                    {row.ap != null && (
                      <span
                        className="rounded px-1.5 py-0.5 text-micro font-bold whitespace-nowrap"
                        style={{
                          backgroundColor: deviceColor(devNumber.get(row.ap.bssid) ?? 1).bg,
                          color: deviceColor(devNumber.get(row.ap.bssid) ?? 1).text,
                        }}
                      >
                        Unit {devNumber.get(row.ap.bssid)}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-1 py-1 font-mono text-xs text-[var(--fs-text)]"
                    data-label="Access point ID"
                  >
                    <div className="flex items-center gap-2">
                      {row.bssid}
                      {isConnected && (
                        <span className="rounded bg-[var(--fs-primary-light)] px-1.5 py-0.5 text-micro font-bold text-[var(--fs-primary)]">
                          you are here
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1" data-label="Band">
                    {band && <BandTag band={band} />}
                  </td>
                  <td className="px-1 py-1 text-[var(--fs-text-secondary)]" data-label="Wi-Fi name">
                    {row.ap?.ssid ?? "—"}
                  </td>
                  <td className="px-1 py-1" data-label="Building">
                    <input
                      list="building-suggestions"
                      value={row.entry?.building ?? ""}
                      onChange={(e) => update(row.bssid, { building: e.target.value })}
                      placeholder="e.g. HQ"
                      aria-label={`Building for ${row.bssid}`}
                      className="min-h-11 w-28 rounded-md border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2 py-2 text-xs text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
                    />
                  </td>
                  <td className="px-1 py-1" data-label="Floor">
                    <input
                      list="floor-suggestions"
                      value={row.entry?.floor ?? ""}
                      onChange={(e) => update(row.bssid, { floor: e.target.value })}
                      placeholder="e.g. 3rd floor"
                      aria-label={`Floor for ${row.bssid}`}
                      className="min-h-11 w-28 rounded-md border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2 py-2 text-xs text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
                    />
                  </td>
                  <td className="px-1 py-1" data-label="Room / area">
                    <input
                      value={row.entry?.location ?? ""}
                      onChange={(e) => update(row.bssid, { location: e.target.value })}
                      placeholder="e.g. hallway by lift"
                      aria-label={`Room or area for ${row.bssid}`}
                      className="min-h-11 w-32 rounded-md border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2 py-2 text-xs text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    {row.entry && (
                      <button
                        onClick={() => remove(row.bssid)}
                        className="inline-flex min-h-11 items-center px-2 text-xs font-medium text-[var(--fs-danger)] hover:opacity-80"
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

      <Card padding="sm">
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 marker:hidden">
            <span>
              <span className="block text-sm font-semibold text-[var(--fs-text)]">
                Add an access point by ID
              </span>
              <span className="mt-0.5 block text-xs text-[var(--fs-text-secondary)]">
                Advanced — only if an access point never appears in a scan.
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--fs-text-muted)] transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <input
                aria-label="Access point ID (BSSID)"
                aria-invalid={Boolean(bssidError)}
                aria-describedby={bssidError ? "manual-bssid-error" : undefined}
                value={manualBssid}
                onChange={(e) => {
                  setManualBssid(e.target.value);
                  if (bssidError) setBssidError(null);
                }}
                placeholder="aa:bb:cc:dd:ee:ff"
                className={cn(
                  "min-h-11 flex-1 rounded-lg border border-[var(--fs-border)] bg-[var(--fs-bg)] px-3 py-2 text-sm text-[var(--fs-text)] focus:border-[var(--fs-primary)]",
                  bssidError && "border-[var(--fs-danger)]"
                )}
              />
              <button
                onClick={addManual}
                className="min-h-11 rounded-lg bg-[var(--fs-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--fs-primary-hover)]"
              >
                Add
              </button>
            </div>
            {bssidError && (
              <p id="manual-bssid-error" role="alert" className="mt-1 text-xs text-[var(--fs-danger)]">
                {bssidError}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-[var(--fs-text-muted)]">
              The ID is printed on the access point label. Everything you enter is saved in this
              browser only.
            </p>
          </div>
        </details>
      </Card>
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
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-[var(--fs-text)]"
      >
        {label}
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            active ? "text-[var(--fs-primary)]" : "text-[var(--fs-text-muted)]"
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

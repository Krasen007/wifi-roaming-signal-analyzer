import { useEffect, useState } from "react";
import { MapPin, TriangleAlert } from "lucide-react";
import type { LiveMeta } from "../lib/types";
import { Card } from "./ui/Card";

export interface DashboardControlsProps {
  activeSsid: string;
  ssids: string[];
  onSelectSsid: (ssid: string) => void;
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
  currentBuilding,
  onChangeBuilding,
  buildings,
  currentFloor,
  onChangeFloor,
  floors,
  live,
}: DashboardControlsProps) {
  const [hidden, setHidden] = useState(document.hidden);

  useEffect(() => {
    const onVisibilityChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const scannerLive = live.watching && !live.stale && live.lastUpdate !== null;
  const scannerOffline = live.watching && live.stale;
  const scannerWaiting = live.watching && !live.stale && live.lastUpdate === null;
  const lastScanTime = live.lastUpdate
    ? new Date(live.lastUpdate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label
            htmlFor="dash-network-select"
            className="text-xs font-medium text-[var(--fs-text-secondary)]"
          >
            Wi-Fi network
          </label>
          <select
            id="dash-network-select"
            value={activeSsid}
            onChange={(event) => onSelectSsid(event.target.value)}
            className="min-h-11 max-w-[15rem] rounded-lg border border-[var(--fs-border)] px-3 py-2 text-sm text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
          >
            {ssids.map((ssid) => (
              <option key={ssid} value={ssid}>
                {ssid}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--fs-text-secondary)]">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            Where you are
            <span className="font-normal text-[var(--fs-text-muted)]">(optional)</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="dash-building-input" className="sr-only">
              Building
            </label>
            <input
              id="dash-building-input"
              list="dash-buildings"
              value={currentBuilding}
              onChange={(event) => onChangeBuilding(event.target.value)}
              placeholder="Building, e.g. HQ"
              className="min-h-11 w-36 rounded-lg border border-[var(--fs-border)] px-3 py-2 text-sm text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
            />
            <datalist id="dash-buildings">
              {buildings.map((building) => (
                <option key={building} value={building} />
              ))}
            </datalist>

            <label htmlFor="dash-floor-input" className="sr-only">
              Floor
            </label>
            <input
              id="dash-floor-input"
              list="dash-floors"
              value={currentFloor}
              onChange={(event) => onChangeFloor(event.target.value)}
              placeholder="Floor, e.g. 3rd"
              className="min-h-11 w-36 rounded-lg border border-[var(--fs-border)] px-3 py-2 text-sm text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
            />
            <datalist id="dash-floors">
              {floors.map((floor) => (
                <option key={floor} value={floor} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="ml-auto flex flex-col items-start gap-1 sm:items-end">
          <span className="text-xs font-medium text-[var(--fs-text-secondary)]">Scanner</span>
          {scannerLive ? (
            <div className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--fs-success-light)] px-3 text-xs font-semibold text-[var(--fs-success)]">
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
                    hidden ? "" : "motion-safe:animate-ping"
                  }`}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span role="status" aria-live="polite">
                Live
              </span>
              {lastScanTime && (
                <span className="font-normal text-[var(--fs-success)]">{lastScanTime}</span>
              )}
            </div>
          ) : scannerOffline ? (
            <div className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--fs-warning-light)] px-3 text-xs font-semibold text-[var(--fs-warning)]">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span role="status" aria-live="polite">
                Offline
              </span>
              <span className="font-normal">
                {lastScanTime ? `last scan ${lastScanTime}` : "no scan received"}
              </span>
            </div>
          ) : scannerWaiting ? (
            <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--fs-bg-tertiary)] px-3 text-xs text-[var(--fs-text-secondary)]">
              Waiting for first scan
            </span>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--fs-bg-tertiary)] px-3 text-xs text-[var(--fs-text-secondary)]">
              Not live — showing the last scan
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-[var(--fs-text-muted)]">
        Adding your building and floor is optional, but it lets FloorScope warn you when you are
        attached to an access point on a different floor.
      </p>
    </Card>
  );
}

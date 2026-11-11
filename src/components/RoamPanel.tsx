import { CircleCheck, MoveRight, Search, TriangleAlert, Zap } from "lucide-react";
import type { AccessPoint, LiveMeta, Registry, RoamEvent } from "../lib/types";
import { bssidDisplayName, locationLabel } from "../lib/labels";
import { ROAM_DELTA_THRESHOLD_DBM } from "../lib/signal";
import { Card } from "./ui/Card";

export interface RoamPanelProps {
  connected?: AccessPoint;
  strongest?: AccessPoint;
  connectedBssid: string;
  setConnectedBssid: (b: string) => void;
  myAps: AccessPoint[];
  registry: Registry;
  currentBuilding: string;
  currentFloor: string;
  live: LiveMeta;
  roams: RoamEvent[];
}

export function RoamPanel({
  connected,
  strongest,
  connectedBssid,
  setConnectedBssid,
  myAps,
  registry,
  currentBuilding,
  currentFloor,
  live,
  roams,
}: RoamPanelProps) {
  const locOf = (bssid: string) => locationLabel(registry, bssid);
  const buildingOf = (bssid: string) => registry[bssid]?.building?.trim() || null;
  const floorOf = (bssid: string) => registry[bssid]?.floor?.trim() || null;

  const connectedLoc = connected ? locOf(connected.bssid) : null;
  const strongestLoc = strongest ? locOf(strongest.bssid) : null;
  const connectedFloor = connected ? floorOf(connected.bssid) : null;
  const connectedBuilding = connected ? buildingOf(connected.bssid) : null;

  const stickyWarning = Boolean(
    connected &&
      strongest &&
      connected.bssid !== strongest.bssid &&
      strongest.dbm - connected.dbm >= ROAM_DELTA_THRESHOLD_DBM
  );

  const wrongBuilding = Boolean(
    connected &&
      currentBuilding.trim() &&
      connectedBuilding &&
      connectedBuilding !== currentBuilding.trim()
  );
  const wrongFloor = Boolean(
    connected &&
      currentFloor.trim() &&
      connectedFloor &&
      connectedFloor !== currentFloor.trim()
  );

  const userWhere = [currentBuilding.trim(), currentFloor.trim()].filter(Boolean).join(" · ");

  // Deliberately excludes dBm values and timestamps: identical strings produce
  // no DOM mutation, so polling cannot re-announce the same verdict.
  const statusMessage = stickyWarning
    ? "Sticky client detected. A stronger access point is available."
    : wrongBuilding || wrongFloor
      ? `Wrong ${wrongBuilding ? "building" : "floor"} attachment.`
      : connected
        ? "Connected to the best access point."
        : "Connected access point is unknown.";

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Roaming check</h2>
        {live.watching && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-micro font-bold text-emerald-700">
            <Zap className="h-3 w-3" /> AUTO
          </span>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <div className="mt-3 space-y-3 text-sm">
        {stickyWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <TriangleAlert className="h-4 w-4" /> Sticky client detected
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              You're connected to <b>{connectedLoc ?? "a weaker AP"}</b> at {connected!.dbm}{" "}
              dBm, but the <b>{strongestLoc ?? "nearest"} AP</b> is much stronger (
              {strongest!.dbm} dBm). Toggle WiFi off/on to force the roam.
            </p>
          </div>
        ) : connected ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <CircleCheck className="h-4 w-4" /> Connected to the best AP
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              You're on <b>{connectedLoc ?? "the strongest AP"}</b> — no action needed.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            {live.watching
              ? "Connected AP is unknown — make sure your loop also runs `netsh wlan show interfaces`."
              : "Add `netsh wlan show interfaces` to the loop (or pick an AP below) to detect the sticky-client case."}
          </div>
        )}

        {(wrongBuilding || wrongFloor) && connectedLoc && userWhere && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <Search className="h-4 w-4" /> Wrong {wrongBuilding ? "building" : "floor"}{" "}
              attachment
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              You're marked at <b>{userWhere}</b>, but attached to{" "}
              <b>{connectedLoc}</b> — exactly the "full signal but wrong floor" case.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="roam-connected-select" className="text-xs font-medium text-slate-500">
            Connected AP {live.watching && "(auto-detected by the live loop)"}
          </label>
          <select
            id="roam-connected-select"
            value={connectedBssid}
            onChange={(e) => setConnectedBssid(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400"
          >
            <option value="">— unknown —</option>
            {myAps.map((a) => (
              <option key={a.bssid} value={a.bssid}>
                {bssidDisplayName(registry, a.bssid) + ` · ${a.dbm} dBm`}
              </option>
            ))}
          </select>
          {connectedBssid && live.watching && (
            <p className="mt-1 text-xs text-emerald-600">
              Auto-updates from scan.txt every 5 s.
            </p>
          )}
        </div>

        {/* Connection event log */}
        <div>
          <h3 className="text-xs font-medium text-slate-500">Connection events</h3>
          {roams.length === 0 ? (
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
              {live.watching
                ? "No connection changes yet — roams and drops will be logged here while you walk around."
                : "Roams and disconnects will be logged here as the connected AP changes."}
            </p>
          ) : (
            <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
              {roams.map((r) => (
                <li
                  key={r.t}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1"
                >
                  <span className="font-mono text-micro text-slate-400">
                    {new Date(r.t).toLocaleTimeString()}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 text-xs text-slate-600">
                    <span className="truncate">{bssidDisplayName(registry, r.from)}</span>
                    <MoveRight className="h-3 w-3 shrink-0 text-indigo-500" />
                    {r.to ? (
                      <span className="truncate font-semibold text-slate-800">
                        {bssidDisplayName(registry, r.to)}
                      </span>
                    ) : (
                      <span className="truncate font-semibold text-rose-600">
                        Disconnected
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

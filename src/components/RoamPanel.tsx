import {
  ChevronDown,
  CircleCheck,
  CircleHelp,
  MapPin,
  MoveRight,
  Signal,
  TriangleAlert,
  Wifi,
  Zap,
} from "lucide-react";
import type { AccessPoint, LiveMeta, Registry, RoamEvent } from "../lib/types";
import { bssidDisplayName, locationLabel } from "../lib/labels";
import { quality, ROAM_DELTA_THRESHOLD_DBM } from "../lib/signal";
import { SignalBars } from "./SignalBars";
import { Card } from "./ui/Card";
import { cn } from "../utils/cn";

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

type VerdictTone = "good" | "warn" | "bad" | "neutral";

const VERDICT_STYLES: Record<
  VerdictTone,
  { box: string; icon: string; title: string }
> = {
  good: {
    box: "border-[var(--fs-border)] bg-[var(--fs-success-light)]",
    icon: "text-[var(--fs-success)]",
    title: "text-[var(--fs-success)]",
  },
  warn: {
    box: "border-[var(--fs-border)] bg-[var(--fs-warning-light)]",
    icon: "text-[var(--fs-warning)]",
    title: "text-[var(--fs-warning)]",
  },
  bad: {
    box: "border-[var(--fs-border)] bg-[var(--fs-danger-light)]",
    icon: "text-[var(--fs-danger)]",
    title: "text-[var(--fs-danger)]",
  },
  neutral: {
    box: "border-[var(--fs-border)] bg-[var(--fs-bg-secondary)]",
    icon: "text-[var(--fs-text-secondary)]",
    title: "text-[var(--fs-text)]",
  },
};

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
  const focusAp = connected ?? strongest;
  const focusQuality = focusAp ? quality(focusAp.dbm) : null;

  let tone: VerdictTone = "neutral";
  let title = "Connection not detected";
  let message = "The scanner hasn't reported your current access point yet.";
  let action = "Start the scanner, or pick the access point manually under Details.";
  let signalDetail: string | null = null;

  if (wrongBuilding || wrongFloor) {
    tone = "bad";
    title = `Connected to the wrong ${wrongBuilding ? "building" : "floor"}`;
    message = `You're at ${userWhere}; the connected access point is registered at ${
      connectedLoc ?? "an unknown location"
    }.`;
    action = "Turn Wi-Fi off and on to reconnect to a local access point.";
  } else if (stickyWarning) {
    tone = "warn";
    title = "A stronger access point is nearby";
    message = `Connected to ${connectedLoc ?? "a weaker access point"} (${connected!.dbm} dBm), but ${strongestLoc ?? "another access point"} is stronger (${strongest!.dbm} dBm).`;
    signalDetail = `${connected!.dbm} dBm now vs ${strongest!.dbm} dBm nearby`;
    action = "Turn Wi-Fi off and on to roam to the stronger access point.";
  } else if (connected) {
    tone = "good";
    title = "Connection looks good";
    message = `Connected to ${connectedLoc ?? bssidDisplayName(registry, connected.bssid)}.`;
    action = "Nothing to do.";
  }

  const VerdictIcon =
    tone === "good" ? CircleCheck : tone === "bad" ? TriangleAlert : tone === "warn" ? Zap : CircleHelp;
  const styles = VERDICT_STYLES[tone];

  // Deliberately excludes dBm values and timestamps: identical strings produce
  // no DOM mutation, so polling cannot re-announce the same verdict.
  const statusMessage =
    live.watching && live.stale
      ? `Scanner offline. Showing the last scan. ${title}. ${message} ${action}`
      : `${title}. ${message} ${action}`;

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--fs-text)]">Connection check</h2>
        {live.watching &&
          (live.stale ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fs-warning-light)] px-2 py-1 text-micro font-bold text-[var(--fs-warning)]">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" /> OFFLINE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--fs-success-light)] px-2 py-1 text-micro font-bold text-[var(--fs-success)]">
              <Zap className="h-3 w-3" aria-hidden="true" /> AUTO
            </span>
          ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <div className={cn("mt-3 rounded-xl border p-4", styles.box)}>
        <p className={cn("flex items-start gap-2 text-base font-semibold leading-snug", styles.title)}>
          <VerdictIcon className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)} aria-hidden="true" />
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fs-text-secondary)]">{message}</p>
        {signalDetail && (
          <p className="mt-1 font-mono text-xs text-[var(--fs-text-secondary)]">{signalDetail}</p>
        )}
        <p className="mt-2.5 rounded-lg bg-[var(--fs-bg)] px-3 py-2 text-sm leading-relaxed text-[var(--fs-text)]">
          {action}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat
          label="Signal"
          value={focusQuality ? focusQuality.label : "No reading"}
          hint={focusAp ? `${focusAp.dbm} dBm · ${focusAp.percent}% of full` : "waiting for a scan"}
          icon={<Signal className="h-4 w-4" aria-hidden="true" />}
          bars={focusAp ? focusAp.dbm : undefined}
          tone={tone === "bad" ? "bad" : tone === "warn" ? "warn" : "good"}
        />
        <Stat
          label="Connected to"
          value={connected ? bssidDisplayName(registry, connected.bssid) : "Not detected"}
          hint={connected ? connected.ssid : "see Set up"}
          icon={<Wifi className="h-4 w-4" aria-hidden="true" />}
        />
        <Stat
          label="Your location"
          value={userWhere || "Not set"}
          hint={userWhere ? "used for floor check" : "set building / floor"}
          icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <details className="group mt-3 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-bg-secondary)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-[var(--fs-text)] marker:hidden">
          Details
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--fs-text-muted)] transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-3 border-t border-[var(--fs-border)] px-3 py-3">
          <div>
            <label
              htmlFor="roam-connected-select"
              className="text-xs font-medium text-[var(--fs-text-secondary)]"
            >
              Which access point are you connected to?
            </label>
            <select
              id="roam-connected-select"
              value={connectedBssid}
              onChange={(event) => setConnectedBssid(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-[var(--fs-border)] px-2 py-1.5 text-sm text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
            >
              <option value="">— not selected / unknown —</option>
              {myAps.map((ap) => (
                <option key={ap.bssid} value={ap.bssid}>
                  {bssidDisplayName(registry, ap.bssid)} · {ap.dbm} dBm
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--fs-text-muted)]">
              Detected automatically while scanning; correct it here if needed.
            </p>
          </div>

          {focusAp && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <Datum label="Access point ID (BSSID)" value={focusAp.bssid} mono />
              <Datum
                label="Signal"
                value={`${focusAp.dbm} dBm · ${focusAp.percent}%`}
                mono
              />
              <Datum label="Band" value={focusAp.band === "?" ? "unknown" : `${focusAp.band} GHz`} />
              <Datum label="Channel" value={focusAp.channel != null ? String(focusAp.channel) : "—"} />
              <Datum label="Radio" value={focusAp.radio ?? "—"} />
              <Datum label="Network" value={focusAp.ssid} />
            </dl>
          )}

          <div>
            <h3 className="text-xs font-medium text-[var(--fs-text-secondary)]">
              Recent connection changes
            </h3>
            {roams.length === 0 ? (
              <p className="mt-1 rounded-lg bg-[var(--fs-bg)] px-3 py-2 text-xs text-[var(--fs-text-secondary)]">
                {live.watching
                  ? "No changes yet — roams and drops appear here while you walk around."
                  : "Roams and drops appear here as the connected access point changes."}
              </p>
            ) : (
              <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
                {roams.map((roam) => (
                  <li
                    key={roam.t}
                    className="flex items-center gap-2 rounded-lg border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2.5 py-1.5"
                  >
                    <span className="font-mono text-micro text-[var(--fs-text-muted)]">
                      {new Date(roam.t).toLocaleTimeString()}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-[var(--fs-text-secondary)]">
                      <span className="truncate">{bssidDisplayName(registry, roam.from)}</span>
                      <MoveRight className="h-3 w-3 shrink-0 text-[var(--fs-primary)]" aria-hidden="true" />
                      {roam.to ? (
                        <span className="truncate font-semibold text-[var(--fs-text)]">
                          {bssidDisplayName(registry, roam.to)}
                        </span>
                      ) : (
                        <span className="truncate font-semibold text-[var(--fs-danger)]">
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
      </details>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  bars,
  tone = "good",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  bars?: number;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="rounded-xl border border-[var(--fs-border)] bg-[var(--fs-bg)] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wide text-[var(--fs-text-muted)]">
        {icon}
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {bars != null && <SignalBars dbm={bars} />}
        <p
          className={cn(
            "truncate text-sm font-semibold",
            tone === "bad"
              ? "text-[var(--fs-danger)]"
              : tone === "warn"
                ? "text-[var(--fs-warning)]"
                : "text-[var(--fs-text)]"
          )}
          title={value}
        >
          {value}
        </p>
      </div>
      <p className="mt-0.5 truncate text-micro text-[var(--fs-text-muted)]" title={hint}>
        {hint}
      </p>
    </div>
  );
}

function Datum({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-semibold uppercase tracking-wide text-[var(--fs-text-muted)]">
        {label}
      </dt>
      <dd
        className={cn("truncate text-[var(--fs-text-secondary)]", mono && "font-mono text-xs")}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

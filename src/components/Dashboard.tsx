import { useMemo, useState } from "react";
import { ArrowRight, FileText, Radar, Route, Wifi } from "lucide-react";
import type { AccessPoint, Band, History, LiveMeta, Registry, RoamEvent } from "../lib/types";
import { groupDevices } from "../lib/devices";
import { registryValueSets } from "../lib/labels";
import { LiveHistoryChart } from "./LiveHistoryChart";
import { DevicesPanel } from "./DevicesPanel";
import { DashboardControls } from "./DashboardControls";
import { SignalHero } from "./SignalHero";
import { RoamPanel } from "./RoamPanel";
import { AllApsList } from "./AllApsList";
import { OtherNetworks } from "./OtherNetworks";
import { Card } from "./ui/Card";

export function Dashboard({
  aps,
  registry,
  currentFloor,
  setCurrentFloor,
  currentBuilding,
  setCurrentBuilding,
  connectedBssid,
  setConnectedBssid,
  live,
  history,
  lastSeenSsid,
  lastSeenBand,
  roams,
  onClearHistory,
  onOpenSetup,
}: {
  aps: AccessPoint[];
  registry: Registry;
  currentFloor: string;
  setCurrentFloor: (f: string) => void;
  currentBuilding: string;
  setCurrentBuilding: (b: string) => void;
  connectedBssid: string;
  setConnectedBssid: (b: string) => void;
  live: LiveMeta;
  history: History;
  lastSeenSsid: Record<string, string>;
  lastSeenBand: Record<string, Band>;
  roams: RoamEvent[];
  onClearHistory: () => void;
  onOpenSetup: () => void;
}) {
  const ssids = useMemo(() => Array.from(new Set(aps.map((a) => a.ssid))).sort(), [aps]);
  const defaultSsid = aps[0]?.ssid ?? "";
  const [ssid, setSsid] = useState(defaultSsid);
  const [chartAllWifi, setChartAllWifi] = useState(true);
  const activeSsid = ssids.includes(ssid) ? ssid : defaultSsid;

  const myAps = useMemo(
    () => aps.filter((a) => a.ssid === activeSsid).sort((a, b) => b.dbm - a.dbm),
    [aps, activeSsid]
  );
  const strongest = myAps[0];
  const connected = aps.find((a) => a.bssid === connectedBssid);
  // Show the AP we're actually attached to; only fall back to the strongest
  // when the connected AP isn't on the selected network (or isn't visible).
  const connectedOnActive = connected && connected.ssid === activeSsid ? connected : undefined;
  const heroAp = connectedOnActive ?? strongest;

  const { floors, buildings } = useMemo(() => {
    const { floors: f, buildings: b } = registryValueSets(registry);
    return { floors: Array.from(f).sort(), buildings: Array.from(b).sort() };
  }, [registry]);

  const devices = useMemo(
    () => groupDevices(aps, registry, connectedBssid),
    [aps, registry, connectedBssid]
  );
  const devNumber = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of devices) for (const member of d.members) m.set(member.bssid, d.index);
    return m;
  }, [devices]);
  const bandOf = (bssid: string): Band => lastSeenBand[bssid] ?? "?";

  if (aps.length === 0) {
    return (
      <Card tone="accent" padding="lg" className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--fs-primary)] text-white shadow-sm">
          <Radar className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[var(--fs-text)]">
          Let's find out where you're connected
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--fs-text-secondary)]">
          FloorScope needs a small scanner running on this PC. It reads the Wi-Fi list Windows
          already shows — nothing is uploaded or sent anywhere.
        </p>

        <ol className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          <OnboardingStep
            number={1}
            icon={FileText}
            title="Start the scanner"
            text="Open Set up and run the Wi-Fi scanner."
          />
          <OnboardingStep
            number={2}
            icon={Route}
            title="Walk around"
            text="Keep the scanner window open while you move."
          />
          <OnboardingStep
            number={3}
            icon={Wifi}
            title="Come back here"
            text="Your live connection status appears automatically."
          />
        </ol>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenSetup}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--fs-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--fs-primary-hover)]"
          >
            Set up the scanner
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[var(--fs-text-muted)]">
          Using a hosted copy? Open the page launched by the scanner and choose{" "}
          <b>Connect local scanner</b>. For a local install, make sure it is writing <b>scan.txt</b>,
          then reload this page from the launcher.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <DashboardControls
        activeSsid={activeSsid}
        ssids={ssids}
        onSelectSsid={setSsid}
        currentBuilding={currentBuilding}
        onChangeBuilding={setCurrentBuilding}
        buildings={buildings}
        currentFloor={currentFloor}
        onChangeFloor={setCurrentFloor}
        floors={floors}
        live={live}
      />

      {/* Verdict first: the plain-language answer, then the strongest-AP card. */}
      {heroAp && (
        <div className="grid gap-5 lg:grid-cols-3">
          <RoamPanel
            connected={connected}
            strongest={strongest}
            connectedBssid={connectedBssid}
            setConnectedBssid={setConnectedBssid}
            myAps={myAps}
            registry={registry}
            currentBuilding={currentBuilding}
            currentFloor={currentFloor}
            live={live}
            roams={roams}
          />
          <SignalHero
            strongest={heroAp}
            activeSsid={activeSsid}
            registry={registry}
            isConnected={Boolean(connectedOnActive)}
          />
        </div>
      )}

      <LiveHistoryChart
        history={history}
        match={(bssid) => chartAllWifi || (lastSeenSsid[bssid] ?? "") === activeSsid}
        connectedBssid={connectedBssid}
        registry={registry}
        bandOf={bandOf}
        connectionEvents={roams}
        onClear={onClearHistory}
        activeSsid={activeSsid}
        ssids={ssids}
        chartAllWifi={chartAllWifi}
        onSelectChartScope={setChartAllWifi}
      />

      <DevicesPanel
        devices={devices}
        connectedBssid={connectedBssid}
        activeSsid={activeSsid}
      />

      <AllApsList
        aps={myAps}
        activeSsid={activeSsid}
        registry={registry}
        connectedBssid={connectedBssid}
        history={history}
        devices={devices}
        devNumber={devNumber}
      />
      <OtherNetworks aps={aps} activeSsid={activeSsid} />
    </div>
  );
}

function OnboardingStep({
  number,
  icon: Icon,
  title,
  text,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-xl border border-[var(--fs-border)] bg-[var(--fs-bg)] p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--fs-primary-light)] text-xs font-bold text-[var(--fs-primary)]">
          {number}
        </span>
        <Icon className="h-4 w-4 text-[var(--fs-primary)]" aria-hidden="true" />
        <span className="text-sm font-semibold text-[var(--fs-text)]">{title}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">{text}</p>
    </li>
  );
}

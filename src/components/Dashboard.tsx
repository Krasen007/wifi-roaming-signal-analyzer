import { useMemo, useState } from "react";
import { Radar } from "lucide-react";
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
      <Card tone="dashed" className="p-10 text-center">
        <Radar className="mx-auto h-10 w-10 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-800">No scan data yet</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Open <b>Live setup</b>, start the PowerShell loop, then pick your scan.txt — the
          dashboard updates as you walk between floors.
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
        chartAllWifi={chartAllWifi}
        onSelectChartScope={setChartAllWifi}
        currentBuilding={currentBuilding}
        onChangeBuilding={setCurrentBuilding}
        buildings={buildings}
        currentFloor={currentFloor}
        onChangeFloor={setCurrentFloor}
        floors={floors}
        live={live}
      />

      {/* Hero + verdict */}
      {heroAp && (
        <div className="grid gap-5 lg:grid-cols-3">
          <SignalHero
            strongest={heroAp}
            activeSsid={activeSsid}
            registry={registry}
            isConnected={Boolean(connectedOnActive)}
          />
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

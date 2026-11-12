import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AccessPoint,
  Band,
  History,
  Registry,
  RoamEvent,
  WiredInfo,
  WiredRegistry,
} from "./lib/types";
import { MAX_HISTORY_POINTS } from "./lib/types";
import type { ConnectedInfo } from "./lib/parsers";
import { parseScan } from "./lib/parsers";
import { parseWired } from "./lib/wired";
import { useLiveWatch } from "./lib/useLiveWatch";
import { useWiredWatch } from "./lib/useWiredWatch";
import {
  loadRegistry,
  saveRegistry,
  loadWiredRegistry,
  saveWiredRegistry,
  loadCurrentFloor,
  saveCurrentFloor,
  loadCurrentBuilding,
  saveCurrentBuilding,
  loadConnected,
  saveConnected,
} from "./lib/storage";
import { ScanImport } from "./components/ScanImport";
import { Dashboard } from "./components/Dashboard";
import { RegistryManager } from "./components/RegistryManager";
import { WiredPanel } from "./components/WiredPanel";
import { Header } from "./components/ui/Header";

type Tab = "dashboard" | "import" | "registry" | "wired";

export default function App() {
  const [tab, setTab] = useState<Tab>("import");
  const [aps, setAps] = useState<AccessPoint[]>([]);
  const [format, setFormat] = useState("");
  const [registry, setRegistry] = useState<Registry>({});
  const [currentFloor, setCurrentFloor] = useState("");
  const [currentBuilding, setCurrentBuilding] = useState("");
  const [connectedBssid, setConnectedBssid] = useState("");
  const [history, setHistory] = useState<History>({});
  const [lastSeenSsid, setLastSeenSsid] = useState<Record<string, string>>({});
  const [lastSeenBand, setLastSeenBand] = useState<Record<string, Band>>({});
  const [roams, setRoams] = useState<RoamEvent[]>([]);
  const [wired, setWired] = useState<WiredInfo | null>(null);
  const [wiredRegistry, setWiredRegistry] = useState<WiredRegistry>({});
  const autoNavRef = useRef(false);

  useEffect(() => {
    setRegistry(loadRegistry());
    setWiredRegistry(loadWiredRegistry());
    setCurrentFloor(loadCurrentFloor());
    setCurrentBuilding(loadCurrentBuilding());
    setConnectedBssid(loadConnected());
  }, []);

  const updateRegistry = (r: Registry) => {
    setRegistry(r);
    saveRegistry(r);
  };
  const updateWiredRegistry = (r: WiredRegistry) => {
    setWiredRegistry(r);
    saveWiredRegistry(r);
  };
  const updateFloor = (f: string) => {
    setCurrentFloor(f);
    saveCurrentFloor(f);
  };
  const updateBuilding = (b: string) => {
    setCurrentBuilding(b);
    saveCurrentBuilding(b);
  };
  const updateConnected = useCallback((b: string) => {
    setConnectedBssid(b);
    saveConnected(b);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory({});
    setRoams([]);
  }, []);

  const recordScan = useCallback((parsed: AccessPoint[]) => {
    if (parsed.length === 0) return;
    setAps(parsed);
    const now = Date.now();
    const inScan = new Set(parsed.map((a) => a.bssid));
    setHistory((prev) => {
      const next = { ...prev };
      for (const ap of parsed) {
        next[ap.bssid] = [...(next[ap.bssid] ?? []), { t: now, dbm: ap.dbm }].slice(
          -MAX_HISTORY_POINTS
        );
      }
      // mark previously-known APs that are missing from this scan as "out of range"
      for (const bssid of Object.keys(next)) {
        if (!inScan.has(bssid) && (next[bssid]?.length ?? 0) > 0) {
          const lastP = next[bssid][next[bssid].length - 1];
          if (lastP.dbm != null) {
            next[bssid] = [...next[bssid], { t: now, dbm: null }].slice(-MAX_HISTORY_POINTS);
          }
        }
      }
      return next;
    });
    setLastSeenSsid((prev) => {
      const next = { ...prev };
      for (const ap of parsed) next[ap.bssid] = ap.ssid;
      return next;
    });
    setLastSeenBand((prev) => {
      const next = { ...prev };
      for (const ap of parsed) next[ap.bssid] = ap.band;
      return next;
    });
    // Remember the last-seen band per BSSID in the registry so offline/old
    // entries still show whether they were 2.4 / 5 / 6 GHz. Location fields
    // are preserved; only the band is merged in.
    setRegistry((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const ap of parsed) {
        if (prev[ap.bssid]?.band === ap.band) continue;
        next[ap.bssid] = {
          ...(prev[ap.bssid] ?? { bssid: ap.bssid, building: "", floor: "", location: "" }),
          bssid: ap.bssid,
          band: ap.band,
        };
        changed = true;
      }
      if (changed) saveRegistry(next);
      return changed ? next : prev;
    });
  }, []);

  const ingestText = useCallback(
    (text: string, navigate: boolean) => {
      const res = parseScan(text);
      if (res.aps.length === 0 && !res.connected) return false;

      if (res.aps.length > 0) {
        recordScan(res.aps);
        setFormat(res.format);
      }
      if (res.connected) {
        updateConnected(res.connected.bssid);
      }
      if (navigate && !autoNavRef.current) {
        autoNavRef.current = true;
        setTab("dashboard");
      }
      return true;
    },
    [updateConnected, recordScan]
  );

  const live = useLiveWatch((text) => ingestText(text, true));
  const { watching } = live;

  const wiredLive = useWiredWatch((text) => {
    const info = parseWired(text);
    if (info.format !== "empty" && info.format !== "unrecognized") setWired(info);
  });

  // When live watching starts, allow a fresh auto-navigate once data flows.
  const prevWatching = useRef(watching);
  useEffect(() => {
    if (!prevWatching.current && watching) {
      autoNavRef.current = false;
    }
    prevWatching.current = watching;
  }, [watching]);

  const prevConnectedRef = useRef("");
  useEffect(() => {
    const prev = prevConnectedRef.current;
    if (prev && connectedBssid !== prev) {
      setRoams((r) => [{ t: Date.now(), from: prev, to: connectedBssid }, ...r].slice(0, 15));
    }
    prevConnectedRef.current = connectedBssid;
  }, [connectedBssid]);

  const handleParsed = useCallback(
    (parsed: AccessPoint[], fmt: string, connected?: ConnectedInfo) => {
      if (parsed.length > 0) {
        recordScan(parsed);
        setFormat(fmt);
      }
      if (connected) updateConnected(connected.bssid);
      if (!autoNavRef.current) {
        autoNavRef.current = true;
        setTab("dashboard");
      }
    },
    [updateConnected, recordScan]
  );

  const registeredCount = Object.values(registry).filter((e) => e.floor || e.location).length;

  const wiredSocketCount = Object.keys(wiredRegistry).length;

  return (
    <div className="min-h-screen bg-[var(--fs-bg)] text-[var(--fs-text)]">
      <Header
        tab={tab}
        setTab={setTab}
        live={live}
        format={format}
        watching={watching || wiredLive.watching}
        badges={{
          dashboard: undefined,
          import: aps.length || undefined,
          registry: registeredCount || undefined,
          wired: wiredSocketCount || undefined,
        }}
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "dashboard" && (
          <Dashboard
            aps={aps}
            registry={registry}
            currentFloor={currentFloor}
            setCurrentFloor={updateFloor}
            currentBuilding={currentBuilding}
            setCurrentBuilding={updateBuilding}
            connectedBssid={connectedBssid}
            setConnectedBssid={updateConnected}
            live={{
              watching: live.watching,
              fileName: live.fileName,
              lastUpdate: live.lastUpdate,
            }}
            history={history}
            lastSeenSsid={lastSeenSsid}
            lastSeenBand={lastSeenBand}
            roams={roams}
            onClearHistory={clearHistory}
          />
        )}
        {tab === "import" && (
          <ScanImport onParsed={handleParsed} live={live} aps={aps} />
        )}
        {tab === "registry" && (
          <RegistryManager
            aps={aps}
            registry={registry}
            connectedBssid={connectedBssid}
            onChange={updateRegistry}
          />
        )}
        {tab === "wired" && (
          <WiredPanel
            info={wired}
            watch={wiredLive}
            registry={wiredRegistry}
            onChange={updateWiredRegistry}
            onIngest={setWired}
            apRegistry={registry}
            currentBuilding={currentBuilding}
            currentFloor={currentFloor}
          />
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-600">
        FloorScope runs entirely in your browser. scan.txt and wired.txt never leave your PC.
      </footer>
    </div>
  );
}

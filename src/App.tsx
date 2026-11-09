import { useCallback, useEffect, useRef, useState } from "react";
import { Radio, TriangleAlert } from "lucide-react";
import type { AccessPoint, Band, History, Registry, RoamEvent } from "./lib/types";
import { MAX_HISTORY_POINTS } from "./lib/types";
import type { ConnectedInfo } from "./lib/parsers";
import { parseScan } from "./lib/parsers";
import { useLiveWatch } from "./lib/useLiveWatch";
import {
  loadRegistry,
  saveRegistry,
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
import { cn } from "./utils/cn";

type Tab = "dashboard" | "import" | "registry";

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
  const autoNavRef = useRef(false);

  useEffect(() => {
    setRegistry(loadRegistry());
    setCurrentFloor(loadCurrentFloor());
    setCurrentBuilding(loadCurrentBuilding());
    setConnectedBssid(loadConnected());
  }, []);

  const updateRegistry = (r: Registry) => {
    setRegistry(r);
    saveRegistry(r);
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

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "import", label: "Live setup", badge: aps.length || undefined },
    { id: "registry", label: "AP Registry", badge: registeredCount || undefined },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.55a11 11 0 0 1 14 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">FloorScope</h1>
            <p className="truncate text-xs text-slate-500">Live WiFi floor-roaming analyzer</p>
          </div>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            {watching && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Radio className="h-3.5 w-3.5" />
                Live
              </span>
            )}
            {live.error && !watching && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <TriangleAlert className="h-3.5 w-3.5" />
                File lost
              </span>
            )}
            {format && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                {format}
              </span>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative -mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition",
                tab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {t.label}
              {t.badge != null && (
                <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

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
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-400">
        FloorScope runs entirely in your browser. scan.txt never leaves your PC.
      </footer>
    </div>
  );
}

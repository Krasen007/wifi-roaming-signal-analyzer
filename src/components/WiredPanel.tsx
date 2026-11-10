import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Cable,
  Check,
  CircleAlert,
  Download,
  Info,
  Link2,
  Network,
  Router,
  Save,
  Server,
  Square,
  Trash2,
} from "lucide-react";
import type {
  Registry,
  WiredInfo,
  WiredRegistry,
  WiredRegistryEntry,
} from "../lib/types";
import {
  findRegisteredSocket,
  parseWired,
  slugify,
  suggestedSocketLabel,
  vendorFromMac,
} from "../lib/wired";
import type { WiredWatch } from "../lib/useWiredWatch";
import { downloadBridgeBat } from "../lib/bridgeBat";
import { cn } from "../utils/cn";

export function WiredPanel({
  info,
  watch,
  registry,
  onChange,
  onIngest,
  apRegistry,
  currentBuilding,
  currentFloor,
}: {
  info: WiredInfo | null;
  watch: WiredWatch;
  registry: WiredRegistry;
  onChange: (r: WiredRegistry) => void;
  onIngest: (info: WiredInfo) => void;
  apRegistry: Registry;
  currentBuilding: string;
  currentFloor: string;
}) {
  const [socket, setSocket] = useState("");
  const [building, setBuilding] = useState(currentBuilding);
  const [floor, setFloor] = useState(currentFloor);
  const [location, setLocation] = useState("");
  const [switchName, setSwitchName] = useState("");
  const [switchPort, setSwitchPort] = useState("");
  const [vlan, setVlan] = useState("");
  const [notes, setNotes] = useState("");
  const [paste, setPaste] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [now, setNow] = useState(Date.now());
  const socketTouched = useRef(false);
  const switchTouched = useRef(false);
  const portTouched = useRef(false);
  const vlanTouched = useRef(false);

  useEffect(() => {
    setBuilding((v) => v || currentBuilding);
  }, [currentBuilding]);
  useEffect(() => {
    setFloor((v) => v || currentFloor);
  }, [currentFloor]);

  const registered = useMemo(() => findRegisteredSocket(registry, info), [registry, info]);
  const suggested = useMemo(() => suggestedSocketLabel(info), [info]);

  useEffect(() => {
    if (socketTouched.current) return;
    if (registered) setSocket(registered.socket);
    else if (suggested) setSocket(suggested);
  }, [suggested, registered]);

  useEffect(() => {
    setLocation(registered?.location ?? "");
    setNotes(registered?.notes ?? "");
  }, [registered]);

  const lastLldpRef = useRef("");
  useEffect(() => {
    const sig = info?.lldp ? `${info.lldp.systemName}|${info.lldp.portId}` : "";
    if (sig && sig !== lastLldpRef.current) {
      // A different switch port answered: adopt its identity and re-enable
      // auto-fill for the next socket.
      lastLldpRef.current = sig;
      switchTouched.current = false;
      portTouched.current = false;
      vlanTouched.current = false;
      socketTouched.current = false;
      setSwitchName(info?.lldp?.systemName || "");
      setSwitchPort(info?.lldp?.portId || "");
      setVlan(info?.lldp?.vlan || "");
      if (registered) setSocket(registered.socket);
      else if (suggested) setSocket(suggested);
      return;
    }
    if (!switchTouched.current) setSwitchName(info?.lldp?.systemName || "");
    if (!portTouched.current) setSwitchPort(info?.lldp?.portId || "");
    if (!vlanTouched.current) setVlan(info?.lldp?.vlan || "");
  }, [info, registered, suggested]);

  const apMatches = useMemo(() => {
    const b = building.trim().toLowerCase();
    const f = floor.trim().toLowerCase();
    if (!b && !f) return [];
    return Object.values(apRegistry).filter(
      (entry) =>
        (!b || entry.building.trim().toLowerCase() === b) &&
        (!f || entry.floor.trim().toLowerCase() === f)
    );
  }, [apRegistry, building, floor]);

  const rows = useMemo(
    () =>
      Object.entries(registry).sort((a, b) => {
        const ka = `${a[1].building}|${a[1].floor}|${a[1].socket}`;
        const kb = `${b[1].building}|${b[1].floor}|${b[1].socket}`;
        return ka.localeCompare(kb, undefined, { sensitivity: "base", numeric: true });
      }),
    [registry]
  );

  const save = () => {
    const label = socket.trim() || suggested;
    if (!label) return;
    const key = slugify(label) || `port-${Date.now()}`;
    const adapter = info?.adapters[0];
    const gatewayIp = adapter?.gateway[0] ?? "";
    const gatewayNeighbor = info?.neighbors.find((n) => n.ip === gatewayIp);
    const entry: WiredRegistryEntry = {
      socket: label,
      building: building.trim(),
      floor: floor.trim(),
      location: location.trim(),
      switchName: switchName.trim() || info?.lldp?.systemName || "",
      switchPort: switchPort.trim() || info?.lldp?.portId || "",
      switchMgmtIp: info?.lldp?.mgmtAddress || "",
      vlan: vlan.trim() || info?.lldp?.vlan || "",
      gatewayIp,
      gatewayMac: gatewayNeighbor?.mac || "",
      gatewayVendor: gatewayNeighbor?.vendor || (gatewayNeighbor ? vendorFromMac(gatewayNeighbor.mac) ?? "" : ""),
      adapterMac: adapter?.mac || "",
      notes: notes.trim(),
      updatedAt: Date.now(),
    };
    const next = { ...registry };
    if (registered) {
      const oldKey = Object.keys(registry).find((registryKey) => registry[registryKey] === registered);
      if (oldKey && oldKey !== key) delete next[oldKey];
    }
    next[key] = entry;
    onChange(next);
  };

  const patch = (key: string, changes: Partial<WiredRegistryEntry>) => {
    const current = registry[key];
    if (!current) return;
    onChange({ ...registry, [key]: { ...current, ...changes } });
  };

  const remove = (key: string) => {
    const next = { ...registry };
    delete next[key];
    onChange(next);
  };

  const ingestPaste = () => {
    const parsed = parseWired(paste);
    if (parsed.adapters.length || parsed.neighbors.length || parsed.lldp) {
      onIngest(parsed);
    }
  };

  const ingestFile = async (file: File) => {
    try {
      onIngest(parseWired(await file.text()));
    } catch (err) {
      console.warn("Failed to read wired snapshot", err);
    }
  };

  const adapter = info?.adapters[0];
  const gatewayIp = adapter?.gateway[0] ?? "";
  const gatewayNeighbor = info?.neighbors.find((n) => n.ip === gatewayIp);
  const gatewayVendor = gatewayNeighbor?.vendor || (gatewayNeighbor ? vendorFromMac(gatewayNeighbor.mac) : null);
  const pastePreview = paste.trim() ? parseWired(paste) : null;
  const lldpCaptureStartedAt = info?.lldpCaptureStartedAt ?? null;

  useEffect(() => {
    if (lldpCaptureStartedAt === null || info?.lldp) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime - lldpCaptureStartedAt >= 40_000) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [info?.lldp, lldpCaptureStartedAt]);

  const lldpSecondsRemaining =
    lldpCaptureStartedAt === null
      ? null
      : Math.max(0, 40 - Math.floor((now - lldpCaptureStartedAt) / 1000));

  return (
    <div className="space-y-6">
      {/* Overview / source */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-slate-900 p-2 text-white">
            <Cable className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Wired LAN discovery</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Plug into a wall socket and FloorScope shows the adapter, gateway, LAN neighbours and
              — when the switch announces itself over <b>LLDP</b> — the exact switch and port. Save
              each socket to build a port map of the building and compare it with your Wi-Fi APs.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Mode"
            value={watch.bridge ? "Portable bridge" : watch.auto ? "Automatic" : "Manual"}
            hint={
              watch.bridge
                ? watch.watching
                  ? "connected to local scanner"
                  : "click Connect below"
                : watch.auto
                  ? "opened with ?wired="
                  : "paste a snapshot"
            }
          />
          <Stat
            label="Live updates"
            value={watch.watching ? "On" : "Off"}
            hint={watch.watching ? "reading wired.txt" : "not reading"}
            tone={watch.watching ? "good" : "muted"}
          />
          <Stat
            label="LAN neighbours"
            value={String(info?.neighbors.length ?? 0)}
            hint="devices in the ARP table"
          />
          <Stat
            label="Last update"
            value={watch.lastUpdate ? new Date(watch.lastUpdate).toLocaleTimeString() : "—"}
            hint={watch.lastUpdate ? "new snapshot received" : "waiting for data"}
          />
        </div>

        {info?.linkStatus === "disconnected" && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              No wired link detected. Check that the Ethernet cable is connected and the adapter is
              enabled.
            </p>
          </div>
        )}

        {info?.linkStatus === "unavailable" && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              No physical wired network adapter was detected on this computer.
            </p>
          </div>
        )}

        {lldpSecondsRemaining !== null && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              {lldpSecondsRemaining > 0
                ? `Waiting for an LLDP announcement — up to ${lldpSecondsRemaining} seconds remaining.`
                : "No LLDP announcement received in 40 seconds. The switch may not advertise LLDP on this port."}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {watch.available ? (
            <button
              onClick={watch.watching ? watch.stop : watch.start}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition",
                watch.watching ? "bg-rose-600 hover:bg-rose-500" : "bg-indigo-600 hover:bg-indigo-500"
              )}
            >
              {watch.watching ? <Square className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {watch.watching ? "Stop wired watch" : "Connect wired scanner"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
              No <code className="mx-1">?wired=</code> source in this URL — use the scanner or paste
              below
            </span>
          )}
          <button
            onClick={() => downloadBridgeBat("wired")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            <Download className="h-4 w-4" />
            Download wired scanner (.bat)
          </button>
        </div>

        {watch.bridge && watch.available && (
          <p className="mt-2 text-xs text-slate-400">
            The portable wired scanner writes <b>wired.txt</b> only. Allow local network access
            when the browser asks.
          </p>
        )}

        {watch.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">{watch.error}</p>
          </div>
        )}
      </div>

      {info ? (
        <>
          {/* Adapters + gateway */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Wired adapter</h2>
              </div>
              {info.adapters.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  No active wired adapter found. Plug in an Ethernet cable, or paste a snapshot
                  below.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {info.adapters.map((a) => (
                    <div key={`${a.name}-${a.mac}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {a.status || "Up"}
                        </span>
                        {a.linkSpeed && (
                          <span className="text-[11px] text-slate-500">{a.linkSpeed}</span>
                        )}
                      </div>
                      {a.description && (
                        <p className="mt-0.5 text-[11px] text-slate-400">{a.description}</p>
                      )}
                      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                        <Datum label="Adapter MAC" value={a.mac} mono />
                        <Datum
                          label="Vendor"
                          value={vendorFromMac(a.mac) ?? "Unknown"}
                        />
                        <Datum
                          label="IPv4"
                          value={a.ipv4.length ? a.ipv4.join(", ") + (a.prefix != null ? `/${a.prefix}` : "") : "—"}
                          mono
                        />
                        <Datum label="DHCP" value={a.dhcpEnabled == null ? "—" : a.dhcpEnabled ? "Yes" : "No"} />
                        <Datum label="DNS" value={a.dns.join(", ") || "—"} mono />
                        <Datum label="Gateway" value={a.gateway.join(", ") || "—"} mono />
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Router className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Gateway / first hop</h2>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <Datum label="Gateway IP" value={gatewayIp || "—"} mono />
                <Datum label="Gateway MAC" value={gatewayNeighbor?.mac || "—"} mono />
                <Datum label="Gateway vendor" value={gatewayVendor || "Unknown"} />
                <Datum
                  label="Subnet"
                  value={adapter?.ipv4[0] && adapter.prefix != null ? `${adapter.ipv4[0]}/${adapter.prefix}` : "—"}
                  mono
                />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                The gateway MAC and its OUI tell you the router/switch vendor, but not which port
                you are on. Only LLDP/CDP (or SNMP access to the switch) reveals the port.
              </p>
            </div>
          </div>

          {/* Switch identity */}
          <div
            className={cn(
              "rounded-2xl border p-5 shadow-sm",
              info.lldp ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-amber-200 bg-amber-50"
            )}
          >
            <div className="flex items-center gap-2">
              <Server className={cn("h-4 w-4", info.lldp ? "text-emerald-600" : "text-amber-600")} />
              <h2 className="text-sm font-semibold text-slate-900">Switch identity</h2>
              {info.lldp && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {info.lldp.source}
                </span>
              )}
            </div>

            {info.lldp ? (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                <Datum label="Switch name" value={info.lldp.systemName || "—"} />
                <Datum label="Port you are on" value={info.lldp.portId || "—"} mono />
                <Datum label="Management IP" value={info.lldp.mgmtAddress || "—"} mono />
                <Datum label="VLAN" value={info.lldp.vlan || "—"} />
                <Datum label="Chassis ID" value={info.lldp.chassisId || "—"} mono />
                <Datum label="Port description" value={info.lldp.portDescription || "—"} />
              </dl>
            ) : (
              <div className="mt-2 space-y-2 text-xs leading-relaxed text-amber-900">
                <p>
                  No <b>LLDP/CDP</b> heard on this port. The switch is not announcing itself, or no
                  capture tool is installed. You can still record the socket, gateway MAC and vendor.
                </p>
                <p className="text-amber-800/80">
                  To get the exact switch and port, install <b>Wireshark</b> (which includes{" "}
                  <b>tshark</b> + Npcap) and restart the scanner (<b>start-wired.bat</b> or the portable
                  .bat) — it captures LLDP once at startup and waits up to 40 seconds for the next
                  advertisement. Many enterprise switches also have LLDP disabled on access ports,
                  so this depends on the network.
                </p>
              </div>
            )}

            {registered && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> This port is registered as <b>{registered.socket}</b>
                {registered.building || registered.floor
                  ? ` — ${[registered.building, registered.floor, registered.location].filter(Boolean).join(" · ")}`
                  : ""}
              </p>
            )}
          </div>

          {/* Neighbours */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">LAN neighbours</h2>
              </div>
              <span className="text-xs text-slate-400">{info.neighbors.length} devices</span>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">IP</th>
                    <th className="px-4 py-2 font-medium">MAC</th>
                    <th className="px-4 py-2 font-medium">Vendor hint</th>
                    <th className="px-4 py-2 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {info.neighbors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                        Neighbour table is empty. Browse or ping a few LAN hosts to populate it.
                      </td>
                    </tr>
                  )}
                  {info.neighbors.map((n) => (
                    <tr key={`${n.ip}-${n.mac}`} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">
                        <span className="flex items-center gap-1.5">
                          {n.ip}
                          {n.isGateway && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                              GATEWAY
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{n.mac}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{n.vendor ?? "Unknown"}</td>
                      <td className="px-4 py-2 text-xs text-slate-400">{n.state ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            No wired snapshot yet. Use <b>start-wired.bat</b>, the portable scanner, or paste{" "}
            <code>ipconfig /all</code> plus <code>arp -a</code> below to inspect the LAN.
          </p>
        </div>
      )}

      {/* Save current socket */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Save className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Save this wall socket</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Give the socket a label you will recognise, then map it to a building/floor/room. Switch
          and port auto-fill from LLDP when available — type them yourself when it is not.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Socket label"
            value={socket}
            placeholder="e.g. 3F-R12-A"
            onChange={(v) => {
              socketTouched.current = true;
              setSocket(v);
            }}
          />
          <Field label="Building" value={building} placeholder="e.g. HQ" onChange={setBuilding} />
          <Field label="Floor" value={floor} placeholder="e.g. 3rd floor" onChange={setFloor} />
          <Field
            label="Switch name"
            value={switchName}
            placeholder="from LLDP, or type it"
            onChange={(v) => {
              switchTouched.current = true;
              setSwitchName(v);
            }}
          />
          <Field
            label="Switch port"
            value={switchPort}
            placeholder="from LLDP, or type it"
            onChange={(v) => {
              portTouched.current = true;
              setSwitchPort(v);
            }}
          />
          <Field
            label="VLAN"
            value={vlan}
            placeholder="optional"
            onChange={(v) => {
              vlanTouched.current = true;
              setVlan(v);
            }}
          />
          <Field
            label="Location / room"
            value={location}
            placeholder="e.g. Meeting room 12"
            onChange={setLocation}
          />
          <Field label="Notes" value={notes} placeholder="e.g. left wall, by the door" onChange={setNotes} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={!(socket.trim() || suggested)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
              !(socket.trim() || suggested)
                ? "cursor-not-allowed bg-slate-300"
                : "bg-indigo-600 hover:bg-indigo-500"
            )}
          >
            <Save className="h-4 w-4" />
            Save socket
          </button>
          <span className="text-xs text-slate-500">
            {apMatches.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                {apMatches.length} Wi-Fi AP{apMatches.length === 1 ? "" : "s"} registered in this
                building/floor — wired and Wi-Fi are in the same area.
              </span>
            ) : building.trim() || floor.trim() ? (
              "No Wi-Fi AP registered for this building/floor yet."
            ) : (
              "Set building/floor to cross-check against the AP registry."
            )}
          </span>
        </div>
      </div>

      {/* Registry */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Wired port map</h2>
          <span className="text-xs text-slate-400">{rows.length} sockets</span>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Socket</th>
              <th className="px-4 py-2 font-medium">Building</th>
              <th className="px-4 py-2 font-medium">Floor</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">Switch</th>
              <th className="px-4 py-2 font-medium">Port</th>
              <th className="px-4 py-2 font-medium">VLAN</th>
              <th className="px-4 py-2 font-medium">Gateway</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                  No sockets saved yet — connect a wired scanner and save the first one above.
                </td>
              </tr>
            )}
            {rows.map(([key, entry]) => (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">
                  <input
                    value={entry.socket}
                    onChange={(e) => patch(key, { socket: e.target.value })}
                    className="w-28 rounded-md border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.building}
                    onChange={(e) => patch(key, { building: e.target.value })}
                    className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.floor}
                    onChange={(e) => patch(key, { floor: e.target.value })}
                    className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.location}
                    onChange={(e) => patch(key, { location: e.target.value })}
                    className="w-32 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.switchName}
                    onChange={(e) => patch(key, { switchName: e.target.value })}
                    placeholder="switch"
                    className="w-28 rounded-md border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.switchPort}
                    onChange={(e) => patch(key, { switchPort: e.target.value })}
                    placeholder="port"
                    className="w-20 rounded-md border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={entry.vlan}
                    onChange={(e) => patch(key, { vlan: e.target.value })}
                    placeholder="vlan"
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {entry.gatewayMac ? (
                    <span title={entry.gatewayVendor || undefined}>{entry.gatewayMac}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => remove(key)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual paste */}
      <div
        className={cn(
          "rounded-2xl border bg-white p-5 shadow-sm transition",
          dragOver ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void ingestFile(file);
        }}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Paste / drop a wired snapshot</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Drop <b>wired.txt</b>, or paste <code>ipconfig /all</code> and <code>arp -a</code>{" "}
          output. The parser also accepts <code>Get-NetNeighbor</code> tables.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste wired snapshot, ipconfig /all, or arp -a output here…"
          className="mt-3 h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-xs"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {pastePreview ? (
              <>
                Preview: <span className="font-semibold text-slate-700">{pastePreview.format}</span> ·{" "}
                <span className="font-semibold text-slate-700">{pastePreview.adapters.length}</span>{" "}
                adapter(s) ·{" "}
                <span className="font-semibold text-slate-700">{pastePreview.neighbors.length}</span>{" "}
                neighbour(s)
                {pastePreview.lldp && (
                  <>
                    {" "}
                    · <span className="font-semibold text-emerald-700">{pastePreview.lldp.source} detected</span>
                  </>
                )}
              </>
            ) : (
              "Waiting for input…"
            )}
          </div>
          <button
            onClick={ingestPaste}
            disabled={!pastePreview || (!pastePreview.adapters.length && !pastePreview.neighbors.length && !pastePreview.lldp)}
            className={cn(
              "w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition sm:w-auto",
              !pastePreview || (!pastePreview.adapters.length && !pastePreview.neighbors.length && !pastePreview.lldp)
                ? "cursor-not-allowed bg-slate-300"
                : "bg-indigo-600 hover:bg-indigo-500"
            )}
          >
            Analyze snapshot →
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          Everything stays on this machine — wired snapshots and the port map are only read from the
          local scanner and stored in <code>localStorage</code>. Only map networks you are
          authorised to document.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "muted";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          tone === "good" ? "text-emerald-700" : "text-slate-800"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}

function Datum({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={cn("truncate text-slate-700", mono && "font-mono text-[11px]")} title={value}>
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
      />
    </label>
  );
}

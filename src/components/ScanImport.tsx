import { useState } from "react";
import {
  Activity,
  CircleAlert,
  Copy,
  Check,
  FileText,
  Play,
  Square,
  Upload,
  Info,
} from "lucide-react";
import { parseScan, type ConnectedInfo } from "../lib/parsers";
import type { AccessPoint } from "../lib/types";
import { cn } from "../utils/cn";
import type { LiveWatch } from "../lib/useLiveWatch";

const LOOP_CMD =
  "while ($true) { $(netsh wlan show networks mode=bssid; netsh wlan show interfaces) | Out-File scan.txt -Encoding utf8; Start-Sleep 5 }";

export function ScanImport({
  onParsed,
  live,
  aps,
}: {
  onParsed: (aps: AccessPoint[], format: string, connected?: ConnectedInfo) => void;
  live: LiveWatch;
  aps: AccessPoint[];
}) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const copyLoop = () => {
    navigator.clipboard?.writeText(LOOP_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const ingestPasted = () => {
    const res = parseScan(text);
    if (res.aps.length === 0 && !res.connected) return;
    onParsed(res.aps, res.format, res.connected);
  };

  const dropFile = async (file: File) => {
    onParsedText(await file.text());
  };

  const onParsedText = (t: string) => {
    const res = parseScan(t);
    if (res.aps.length === 0 && !res.connected) return;
    onParsed(res.aps, res.format, res.connected);
  };

  return (
    <div className="space-y-6">
      {/* OVERVIEW — what this tab does and what the numbers mean */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">What this tab is for</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              This tab is the <b>data source</b> for the dashboard — it controls how FloorScope
              reads <b>scan.txt</b>. When you launch with <b>start.bat</b>, the scan loop and live
              mode are already running, so you normally don&apos;t need to change anything here.
              Open it only if live updates stop, or if you want to switch to manual mode.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusItem
            label="Mode"
            value={live.auto ? "Automatic" : "Manual"}
            hint={live.auto ? "started by start.bat" : "you pick the file"}
          />
          <StatusItem
            label="Live updates"
            value={live.watching ? "On" : "Off"}
            hint={live.watching ? "reading scan.txt" : "not reading"}
            tone={live.watching ? "good" : "muted"}
          />
          <StatusItem
            label="APs in last scan"
            value={String(aps.length)}
            hint="unique BSSIDs"
          />
          <StatusItem
            label="Last update"
            value={live.lastUpdate ? new Date(live.lastUpdate).toLocaleTimeString() : "—"}
            hint={live.lastUpdate ? "new scan received" : "waiting for a scan"}
          />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-700">What the numbers mean</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>
              <b>{aps.length}</b> on the <b>Live setup</b> tab badge: unique access points in the
              most recent scan (not the number of scans).
            </li>
            <li>
              <b>Updated 14:32:05</b>: when a new scan was last read. If it stops changing, the
              loop or dev server is not running.
            </li>
            <li>
              <b>AP Registry</b> badge: how many BSSIDs you&apos;ve assigned a building, floor, or
              location.
            </li>
            <li>
              The loop writes a new scan every <b>5 s</b>; FloorScope checks for changes about every{" "}
              <b>1.2 s</b>.
            </li>
          </ul>
        </div>

        {live.auto && live.watching && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> All set — start.bat is feeding scans to the dashboard.
            You can go back to Dashboard.
          </p>
        )}
      </div>

      {/* STEP 1+2 — start the loop */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
            <Play className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">1 · Start the scan loop</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Run this in PowerShell on your laptop. It overwrites <b>scan.txt</b> (in the folder
              where you started PowerShell) every 5 seconds, including which AP you're connected to.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">
            {LOOP_CMD}
          </code>
          <button
            onClick={copyLoop}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Leave the PowerShell window open while you walk around. Stop it with Ctrl+C when done.
          Or just run <b>start.bat</b> in the project folder — it starts this loop, the dev server
          and live mode in one go.
        </p>
      </div>

      {/* STEP 3 — watch the file live */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-indigo-600 p-2 text-white">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">2 · Watch the file — live mode</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {live.auto ? (
                <>
                  Started by <b>start.bat</b> — FloorScope reads <b>scan.txt</b> straight from the
                  dev server and updates the dashboard the moment the loop writes a new scan.
                </>
              ) : (
                <>
                  Pick the <b>scan.txt</b> the loop is writing. FloorScope re-reads it the moment it
                  changes and updates the dashboard automatically.
                </>
              )}
            </p>
          </div>
        </div>

        {live.supported ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={live.watching ? live.stop : live.start}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition",
                live.watching ? "bg-rose-600 hover:bg-rose-500" : "bg-indigo-600 hover:bg-indigo-500"
              )}
            >
              {live.watching ? <Square className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {live.watching
                ? "Stop watching"
                : live.auto
                  ? "Restart live watch"
                  : "Pick scan.txt & go live"}
            </button>

            {live.watching && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono text-xs">{live.fileName}</span>
                {live.lastUpdate && (
                  <span className="text-xs text-slate-400">
                    · updated {new Date(live.lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              This browser can't watch files live (the File System Access API works on{" "}
              <b>Chrome / Edge</b> on desktop). Use the paste option below instead.
            </p>
          </div>
        )}

        {live.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">{live.error}</p>
          </div>
        )}
      </div>

      {/* FALLBACK — paste once */}
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
          const f = e.dataTransfer.files?.[0];
          if (f) void dropFile(f);
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Or paste once / drop scan.txt</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Drop the file anywhere on this card, or paste{" "}
              <code className="rounded bg-slate-100 px-1">netsh wlan show networks mode=bssid</code>{" "}
              output below.
            </p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste netsh output here…"
          className="mt-3 h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:text-xs"
        />
        <ImportFooter text={text} onImport={ingestPasted} />
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          Browsers can't scan WiFi directly — the loop + file-watch trick is what makes this live.
          Everything stays on your machine; scan.txt is only read locally, never uploaded. For a
          real fix to "sticky" devices across floors, enable 802.11k/v/r fast-roaming on your APs.
        </p>
      </div>
    </div>
  );
}

function ImportFooter({ text, onImport }: { text: string; onImport: () => void }) {
  const res = text.trim() ? parseScan(text) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-slate-500">
        {res ? (
          <>
            Preview: <span className="font-semibold text-slate-700">{res.format}</span> ·{" "}
            <span className="font-semibold text-slate-700">{res.aps.length}</span> APs
            {res.connected && (
              <>
                {" "}
                · <span className="font-semibold text-indigo-600">connected AP detected</span>
              </>
            )}
          </>
        ) : (
          "Waiting for input…"
        )}
      </div>
      <button
        onClick={onImport}
        disabled={!res || (res.aps.length === 0 && !res.connected)}
        className={cn(
          "w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition sm:w-auto",
          !res || (res.aps.length === 0 && !res.connected)
            ? "cursor-not-allowed bg-slate-300"
            : "bg-indigo-600 hover:bg-indigo-500"
        )}
      >
        Analyze {res && res.aps.length > 0 ? `${res.aps.length} APs` : ""} →
      </button>
    </div>
  );
}

function StatusItem({
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

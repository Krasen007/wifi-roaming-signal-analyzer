import { useEffect, useState } from "react";
import {
  Activity,
  Check,
  CircleAlert,
  Copy,
  Download,
  FileText,
  Link2,
  Play,
  Square,
  Upload,
  Wifi,
} from "lucide-react";
import { parseScan, type ConnectedInfo } from "../lib/parsers";
import type { AccessPoint } from "../lib/types";
import { cn } from "../utils/cn";
import type { LiveWatch } from "../lib/useLiveWatch";
import { LIVE_STALE_MS, queryLoopbackPermission, type LoopbackPermission } from "../lib/live";
import { downloadBridgeBat } from "../lib/bridgeBat";
import { Card } from "./ui/Card";

const LOOP_CMD =
  "while ($true) { $(netsh wlan show networks mode=bssid; netsh wlan show interfaces) | Out-File scan.txt -Encoding utf8; Start-Sleep 5 }";

export function ScanImport({
  onParsed,
  live,
  aps,
  onGoToDashboard,
}: {
  onParsed: (aps: AccessPoint[], format: string, connected?: ConnectedInfo) => void;
  live: LiveWatch;
  aps: AccessPoint[];
  onGoToDashboard: () => void;
}) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [permission, setPermission] = useState<LoopbackPermission>("unknown");

  useEffect(() => {
    if (!live.bridge) return;
    void queryLoopbackPermission().then(setPermission);
  }, [live.bridge, live.watching]);

  const scannerLive = live.watching && !live.stale && live.lastUpdate !== null;
  const scannerOffline = live.watching && live.stale;
  const scannerWaiting = live.watching && !live.stale && live.lastUpdate === null;
  const staleSeconds = Math.round(LIVE_STALE_MS / 1000);

  const copyLoop = () => {
    navigator.clipboard?.writeText(LOOP_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const ingestPasted = () => {
    const res = parseScan(text);
    if (res.aps.length === 0 && !res.connected) return;
    onParsed(res.aps, res.format, res.connected);
    if (res.aps.length > 0) onGoToDashboard();
  };

  const dropFile = async (file: File) => {
    try {
      onParsedText(await file.text());
    } catch (err) {
      console.warn("Failed to read dropped file", err);
    }
  };

  const onParsedText = (t: string) => {
    const res = parseScan(t);
    if (res.aps.length === 0 && !res.connected) return;
    onParsed(res.aps, res.format, res.connected);
    if (res.aps.length > 0) onGoToDashboard();
  };

  return (
    <div className="space-y-5">
      <Card tone="success">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-[var(--fs-success)] p-2 text-white">
            <Download className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--fs-text)]">
              Using a hosted copy? Run the portable scanner
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
              For GitHub Pages or any copy not running on this PC.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-[var(--fs-text-secondary)]">
            Download the scanner, run it, then click Connect. It serves the scan file only on this
            computer (127.0.0.1) behind a random token. Nothing is uploaded.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => downloadBridgeBat("wifi")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--fs-success)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Wi-Fi scanner (.bat)
            </button>
            {live.bridge && live.supported && (
              <button
                onClick={live.watching ? live.stop : live.start}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition",
                  live.watching
                    ? "bg-[var(--fs-danger)] hover:opacity-90"
                    : "bg-[var(--fs-primary)] hover:bg-[var(--fs-primary-hover)]"
                )}
              >
                {live.watching ? (
                  <Square className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                )}
                {live.watching ? "Stop scanner" : "Connect local scanner"}
              </button>
            )}
            {live.bridge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--fs-bg)] px-3 py-1 text-xs font-medium text-[var(--fs-success)] ring-1 ring-[var(--fs-border)]">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> scanner detected
              </span>
            )}
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
            <li>Download and run the scanner.</li>
            <li>Keep its window open.</li>
            <li>
              Click <b>Connect local scanner</b> and allow <b>local network access</b> when the
              browser asks.
            </li>
          </ol>
          {live.bridge && permission === "denied" && (
            <div className="flex items-start gap-2 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-danger-light)] p-3 text-[var(--fs-danger)]">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-xs leading-relaxed">
                Local network access is blocked for this site. Allow Local network / Loopback
                access in the browser&apos;s site settings, then click Connect again.
              </p>
            </div>
          )}
          {live.bridge && permission === "prompt" && (!live.watching || live.error) && (
            <p className="text-xs text-[var(--fs-success)]">
              The browser will ask for local network access when you click Connect.
            </p>
          )}
        </div>
      </Card>
      <Card>
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-[var(--fs-primary-light)] p-2 text-[var(--fs-primary)]">
            <Wifi className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--fs-text)]">
              Get live Wi-Fi readings
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
              FloorScope reads the scan file the loop writes to <b>scan.txt</b>. Start the loop,
              then watch the Dashboard tab.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatusItem
            label="Scanner"
            value={
              scannerLive
                ? "Running"
                : scannerOffline
                  ? "Offline"
                  : scannerWaiting
                    ? "Waiting"
                    : "Not running"
            }
            hint={
              scannerLive
                ? "readings are flowing in"
                : scannerOffline
                  ? `no new scan for ${staleSeconds} seconds`
                  : scannerWaiting
                    ? "waiting for the first reading"
                    : "follow the steps below"
            }
            tone={scannerLive ? "good" : scannerOffline ? "warning" : "muted"}
          />
          <StatusItem
            label="Last reading"
            value={live.lastUpdate ? new Date(live.lastUpdate).toLocaleTimeString() : "Waiting"}
            hint={
              live.lastUpdate
                ? scannerOffline
                  ? "last scan received"
                  : "new scan received"
                : "nothing received yet"
            }
          />
          <StatusItem
            label="Access points seen"
            value={String(aps.length)}
            hint="distinct Wi-Fi access points"
          />
        </div>

        {scannerLive ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--fs-success-light)] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--fs-success)]">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Readings are coming in. Open the Dashboard tab.
            </p>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--fs-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--fs-primary-hover)]"
            >
              Go to Dashboard
            </button>
          </div>
        ) : scannerOffline ? (
          <div className="mt-3 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-warning-light)] px-3 py-2.5 text-[var(--fs-warning)]">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Readings stopped arriving. The scanner window may have closed, or scan.txt stopped
              updating.
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              The last scan is still on Dashboard. Live readings resume automatically when a new
              scan appears.
            </p>
          </div>
        ) : scannerWaiting ? (
          <p className="mt-3 rounded-xl bg-[var(--fs-bg-secondary)] px-3 py-2.5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
            Scanner connected — waiting for its first reading.
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-[var(--fs-bg-secondary)] px-3 py-2.5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
            Nothing is coming in yet. Follow step 1, then step 2. If live reading is not available
            in this browser, use the paste option in step 3.
          </p>
        )}
      </Card>

      <Card>
        <StepHeading
          number={1}
          icon={Play}
          title="Start the scanner"
          text="Open PowerShell in this folder, paste the command below, and leave the window open while you walk."
        />
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">
            {LOOP_CMD}
          </code>
          <button
            onClick={copyLoop}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--fs-text-secondary)]">
          Writes <b>scan.txt</b> every 5 seconds. Stop with Ctrl+C when you are done.
        </p>
      </Card>

      <Card tone="accent">
        <StepHeading
          number={2}
          icon={Activity}
          title="Turn on live reading"
          text={
            live.bridge
              ? "Opened by the portable scanner. Click Connect and allow local network access when prompted."
              : live.auto
                ? "Started by start-wifi.bat. FloorScope re-reads scan.txt as it changes."
                : "Pick the scan.txt file the command is writing. FloorScope re-reads it as it changes."
          }
        />

        {live.supported ? (
          (!live.bridge || live.watching) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!live.bridge && (
                <button
                  onClick={live.watching ? live.stop : live.start}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition",
                    live.watching
                      ? "bg-[var(--fs-danger)] hover:opacity-90"
                      : "bg-[var(--fs-primary)] hover:bg-[var(--fs-primary-hover)]"
                  )}
                >
                  {live.watching ? (
                    <Square className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  )}
                  {live.watching
                    ? "Stop live reading"
                    : live.auto
                      ? "Restart live reading"
                      : "Pick scan.txt and go live"}
                </button>
              )}

              {scannerLive && (
                <div className="flex items-center gap-2 text-sm text-[var(--fs-text-secondary)]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-mono text-xs">{live.fileName}</span>
                  {live.lastUpdate && (
                    <span className="text-xs">
                      · updated {new Date(live.lastUpdate).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {scannerOffline && (
                <div className="flex items-center gap-2 text-sm text-[var(--fs-warning)]">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs">{live.fileName}</span>
                  <span className="text-xs">
                    · offline
                    {live.lastUpdate
                      ? ` · last scan ${new Date(live.lastUpdate).toLocaleTimeString()}`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-warning-light)] p-3 text-[var(--fs-warning)]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-relaxed">
              This browser cannot watch a file live. Use Chrome or Edge on a desktop, or paste a
              scan in step 3.
            </p>
          </div>
        )}

        {live.error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-danger-light)] p-3 text-[var(--fs-danger)]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="text-xs">{live.error}</p>
          </div>
        )}
      </Card>

      <Card
        className={cn(
          "transition",
          dragOver && "border-[var(--fs-primary)] ring-2 ring-[var(--fs-primary-light)]"
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
        <StepHeading
          number={3}
          icon={Upload}
          title="Or use a scan once"
          text="Drop scan.txt here, or paste netsh output below. Fallback when live reading is not available."
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the Wi-Fi scan output here…"
          className="mt-3 h-40 w-full resize-y rounded-xl border border-[var(--fs-border)] bg-[var(--fs-bg-secondary)] p-3 font-mono text-xs leading-relaxed text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
        />
        <ImportFooter text={text} onImport={ingestPasted} />
      </Card>



    </div>
  );
}

function StepHeading({
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
    <div className="flex items-start gap-2.5">
      <div className="rounded-lg bg-[var(--fs-primary-light)] p-2 text-[var(--fs-primary)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-[var(--fs-text)]">
          {number}. {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--fs-text-secondary)]">{text}</p>
      </div>
    </div>
  );
}

function ImportFooter({ text, onImport }: { text: string; onImport: () => void }) {
  const res = text.trim() ? parseScan(text) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-[var(--fs-text-secondary)]">
        {res ? (
          <>
            Ready: <span className="font-semibold text-[var(--fs-text)]">{res.format}</span> ·{" "}
            <span className="font-semibold text-[var(--fs-text)]">{res.aps.length}</span> access
            points
            {res.connected && (
              <>
                {" "}
                · <span className="font-semibold text-[var(--fs-success)]">connected AP found</span>
              </>
            )}
          </>
        ) : (
          "Waiting for a scan…"
        )}
      </div>
      <button
        onClick={onImport}
        disabled={!res || (res.aps.length === 0 && !res.connected)}
        className={cn(
          "min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto",
          !res || (res.aps.length === 0 && !res.connected)
            ? "cursor-not-allowed bg-[var(--fs-bg-tertiary)] text-[var(--fs-text-muted)]"
            : "bg-[var(--fs-primary)] text-white hover:bg-[var(--fs-primary-hover)]"
        )}
      >
        Use this scan and open Dashboard
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
  tone?: "good" | "warning" | "muted";
}) {
  return (
    <div className="rounded-xl bg-[var(--fs-bg-secondary)] px-3 py-2">
      <p className="label-caps text-[var(--fs-text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          tone === "good"
            ? "text-[var(--fs-success)]"
            : tone === "warning"
              ? "text-[var(--fs-warning)]"
              : "text-[var(--fs-text)]"
        )}
      >
        {value}
      </p>
      <p className="text-micro text-[var(--fs-text-secondary)]">{hint}</p>
    </div>
  );
}

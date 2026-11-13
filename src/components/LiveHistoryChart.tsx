import { useLayoutEffect, useRef, useState } from "react";
import type { Band, History, LiveMeta, Registry, RoamEvent, SamplePoint } from "../lib/types";
import { bssidDisplayName } from "../lib/labels";
import { quality } from "../lib/signal";
import { BandTag } from "./BandTag";
import { Card } from "./ui/Card";
import { cn } from "../utils/cn";

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7"];

function colorFor(bssid: string): string {
  let h = 0;
  for (const c of bssid) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const Y_MIN = -95;
const Y_MAX = -30;

/** Sliding window: the chart only ever shows the most recent 20 minutes. */
const WINDOW_MS = 20 * 60 * 1000;

interface RealPoint {
  t: number;
  dbm: number;
}

interface Segments {
  segs: RealPoint[][];
  /** dotted connector between the end of one segment and the start of the next */
  gapLinks: { from: RealPoint; to: RealPoint }[];
}

function splitSegments(pts: SamplePoint[]): Segments {
  const segs: RealPoint[][] = [];
  let cur: RealPoint[] = [];
  for (const p of pts) {
    if (p.dbm != null) {
      cur.push({ t: p.t, dbm: p.dbm });
    } else if (cur.length > 0) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) segs.push(cur);

  const gapLinks: { from: RealPoint; to: RealPoint }[] = [];
  for (let i = 0; i < segs.length - 1; i++) {
    gapLinks.push({ from: segs[i][segs[i].length - 1], to: segs[i + 1][0] });
  }
  return { segs, gapLinks };
}

export function LiveHistoryChart({
  history,
  live,
  match,
  connectedBssid,
  registry,
  bandOf,
  connectionEvents,
  onClear,
  activeSsid,
  ssids,
  chartAllWifi,
  onSelectChartScope,
}: {
  history: History;
  live: LiveMeta;
  match: (bssid: string) => boolean;
  connectedBssid: string;
  registry: Registry;
  bandOf: (bssid: string) => Band;
  connectionEvents: RoamEvent[];
  onClear?: () => void;
  activeSsid: string;
  ssids: string[];
  chartAllWifi: boolean;
  onSelectChartScope: (all: boolean) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 340 });

  // Measure the container so one SVG user unit is one CSS pixel at every width.
  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(280, Math.round(entry.contentRect.width));
      const h = w < 480 ? 260 : 340;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const matched = Object.entries(history).filter(([bssid]) => match(bssid));
  let windowEnd = -Infinity;
  for (const [, pts] of matched) {
    for (const p of pts) if (p.t > windowEnd) windowEnd = p.t;
  }
  if (!Number.isFinite(windowEnd)) windowEnd = Date.now();

  const windowStart = windowEnd - WINDOW_MS;
  const series = matched
    .map(([bssid, allPts]) => {
      const pts = allPts.filter((p) => p.t >= windowStart && p.t <= windowEnd);
      const reals = pts.filter((p) => p.dbm != null);
      return {
        bssid,
        pts,
        lastReal: reals.length > 0 ? reals[reals.length - 1] : null,
        inRange: pts.length > 0 && pts[pts.length - 1].dbm != null,
        segments: splitSegments(pts),
      };
    })
    .filter((s) => s.pts.some((p) => p.dbm != null))
    .sort((a, b) => (b.lastReal?.dbm ?? -999) - (a.lastReal?.dbm ?? -999));

  const W = size.w;
  const H = size.h;
  const PAD_L = W < 480 ? 42 : 46;
  const PAD_R = 14;
  const PAD_T = 10;
  const PAD_B = 22;

  const xMax = windowEnd;
  const x0 = windowStart;
  const span = WINDOW_MS;

  const x = (t: number) => PAD_L + ((t - x0) / span) * (W - PAD_L - PAD_R);
  const y = (dbm: number) => PAD_T + (1 - (dbm - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);

  const visibleEvents = connectionEvents.filter((e) => e.t >= x0 && e.t <= xMax);

  const path = (pts: RealPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.dbm).toFixed(1)}`).join(" ");

  const ticks = [
    { dbm: Y_MAX, label: "Strong" },
    { dbm: -65, label: "Okay" },
    { dbm: Y_MIN, label: "Weak" },
  ];
  const spanMin = Math.round(span / 60000) || 1;
  const timeTicks = Array.from(
    { length: Math.max(0, Math.floor(spanMin / 5) - 1) },
    (_, index) => (Math.floor(spanMin / 5) - index - 1) * 5
  );
  const toggle = (bssid: string) => setFocus((f) => (f === bssid ? null : bssid));

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--fs-text)]">Signal over time</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--fs-text-secondary)]">
            Higher lines mean a stronger connection. Each line is one access point. A dotted gap means it went out of range, a red vertical
            line is a disconnect, and an amber line is a roam to another access point. Select a line
            or a name below to highlight just that access point.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="chart-scope" className="sr-only">
            Choose what the chart shows
          </label>
          <select
            id="chart-scope"
            value={chartAllWifi ? "all" : "active"}
            onChange={(event) => onSelectChartScope(event.target.value === "all")}
            className="min-h-11 max-w-[13rem] rounded-lg border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2 text-xs text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
          >
            <option value="active">Only “{activeSsid}”</option>
            <option value="all" disabled={ssids.length < 2}>
              All Wi-Fi networks
            </option>
          </select>
          {focus && (
            <button
              onClick={() => setFocus(null)}
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--fs-primary)] px-3 text-xs font-medium text-[var(--fs-primary)] hover:bg-[var(--fs-primary-light)]"
            >
              Show all lines
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--fs-border)] px-3 text-xs font-medium text-[var(--fs-text-secondary)] hover:border-[var(--fs-danger)] hover:bg-[var(--fs-danger-light)] hover:text-[var(--fs-danger)]"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      <div ref={chartRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 block w-full" style={{ height: H }}>
          {ticks.map(({ dbm, label }) => (
            <g key={label}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(dbm)}
                y2={y(dbm)}
                stroke="var(--fs-border)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={y(dbm) - 1}
                textAnchor="end"
                fontSize={11}
                fill="var(--fs-text-muted)"
              >
                <title>{dbm} dBm</title>
                <tspan x={PAD_L - 6} dy="0">{label}</tspan>
                <tspan x={PAD_L - 6} dy="12" fontSize={11}>{dbm}</tspan>
              </text>
            </g>
          ))}
          {timeTicks.map((minutes) => {
            const tickX = x(xMax - minutes * 60_000);
            return (
              <g key={minutes}>
                <line
                  x1={tickX}
                  x2={tickX}
                  y1={PAD_T}
                  y2={H - PAD_B}
                  stroke="var(--fs-border)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  opacity={0.65}
                />
                <text
                  x={tickX}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--fs-text-muted)"
                >
                  -{minutes} min
                </text>
              </g>
            );
          })}
          <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={12} fill="var(--fs-text-muted)">
            {live.watching && live.stale ? "offline" : "now"}
          </text>
          <text x={PAD_L} y={H - 6} textAnchor="start" fontSize={12} fill="var(--fs-text-muted)">
            -{spanMin} min
          </text>

          {/* "now" marker — vertical line at the right edge */}
          <line
            x1={W - PAD_R}
            x2={W - PAD_R}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="var(--fs-primary)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.6}
          />

          {series.map((s) => {
            const isConn = s.bssid === connectedBssid;
            const isFocused = focus === s.bssid;
            const dimmed = focus != null && !isFocused;
            const c = colorFor(s.bssid);
            const width = isFocused ? 4.5 : isConn ? 4 : 2.8;
            const baseOpacity = dimmed ? 0.12 : 0.9;
            const lastSeg = s.segments.segs[s.segments.segs.length - 1];
            const lastPt = lastSeg?.[lastSeg.length - 1];
            const seriesName = bssidDisplayName(registry, s.bssid);
            return (
              <g
                key={s.bssid}
                className="cursor-pointer"
                onClick={() => toggle(s.bssid)}
                role="img"
                aria-label={s.lastReal ? `${seriesName}, ${s.lastReal.dbm} dBm` : seriesName}
              >
                {/* gap connectors — dotted, "AP was out of range here" */}
                {s.segments.gapLinks.map((g, i) => (
                  <line
                    key={`gap-${i}`}
                    x1={x(g.from.t)}
                    y1={y(g.from.dbm)}
                    x2={x(g.to.t)}
                    y2={y(g.to.dbm)}
                    stroke={c}
                    strokeWidth={dimmed ? 1.4 : 2}
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    opacity={dimmed ? 0.1 : 0.5}
                  />
                ))}
                {/* solid segments — AP in range */}
                {s.segments.segs.map((seg, i) =>
                  seg.length === 1 ? (
                    <circle
                      key={`seg-${i}`}
                      cx={x(seg[0].t)}
                      cy={y(seg[0].dbm)}
                      r={3}
                      fill={c}
                      opacity={baseOpacity}
                    />
                  ) : (
                    <g key={`seg-${i}`}>
                      {/* invisible fat hit-area for easier clicking */}
                      <path
                        d={path(seg)}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                        pointerEvents="stroke"
                      >
                        <title>{bssidDisplayName(registry, s.bssid)}</title>
                      </path>
                      <path
                        d={path(seg)}
                        fill="none"
                        stroke={c}
                        strokeWidth={width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={baseOpacity}
                      />
                    </g>
                  )
                )}
                {/* end marker only, at the last real reading */}
                {lastPt && (
                  <g>
                    {/* connected AP gets a visible ring — "you are attached to this line" */}
                    {isConn && (
                      <circle
                        cx={x(lastPt.t)}
                        cy={y(lastPt.dbm)}
                        r={9}
                        fill="none"
                        stroke={c}
                        strokeWidth={2.5}
                        opacity={dimmed ? 0.15 : 1}
                      />
                    )}
                    <circle
                      cx={x(lastPt.t)}
                      cy={y(lastPt.dbm)}
                      r={isConn || isFocused ? 5 : 3.5}
                      fill={c}
                      stroke="#fff"
                      strokeWidth={1.2}
                      opacity={dimmed ? 0.15 : 1}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {visibleEvents.map((e, i) => {
            const dropped = !e.to;
            const color = dropped ? "#f43f5e" : "#f59e0b";
            const label = dropped
              ? `Connection dropped from ${bssidDisplayName(registry, e.from)}`
              : `Roamed ${bssidDisplayName(registry, e.from)} → ${bssidDisplayName(registry, e.to)}`;
            return (
              <g key={`event-${e.t}-${i}`}>
                <line
                  x1={x(e.t)}
                  x2={x(e.t)}
                  y1={PAD_T}
                  y2={H - PAD_B}
                  stroke={color}
                  strokeWidth={1.6}
                  strokeDasharray="3 4"
                  opacity={0.9}
                >
                  <title>
                    {label} · {new Date(e.t).toLocaleTimeString()}
                  </title>
                </line>
                <circle cx={x(e.t)} cy={PAD_T} r={3} fill={color} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {series.length === 0 && (
          <p className="text-xs text-[var(--fs-text-secondary)]">
            No signal history yet. It will appear as soon as the scanner sends a few updates.
          </p>
        )}
        {series.map((s) => {
          const isFocused = focus === s.bssid;
          const c = colorFor(s.bssid);
          const seriesName = bssidDisplayName(registry, s.bssid);
          return (
            <button
              key={s.bssid}
              onClick={() => toggle(s.bssid)}
              aria-pressed={isFocused}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition",
                isFocused
                  ? "border-[var(--fs-primary)] bg-[var(--fs-primary-light)] text-[var(--fs-primary)]"
                  : "border-[var(--fs-border)] text-[var(--fs-text-secondary)] hover:border-[var(--fs-border-hover)] hover:bg-[var(--fs-bg-secondary)]",
                focus != null && !isFocused && "opacity-50"
              )}
              title="Select to highlight this access point in the chart"
            >
              <span className="sr-only">Highlight </span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.inRange ? c : "#94a3b8" }}
              />
              {seriesName}
              <BandTag band={bandOf(s.bssid)} />
              {s.lastReal && s.lastReal.dbm != null ? (
                <span
                  className="font-mono font-semibold text-[var(--fs-text-secondary)]"
                  title={quality(s.lastReal.dbm).label}
                >
                  {s.lastReal.dbm} dBm
                </span>
              ) : null}
              {!s.inRange && (
                <span className="rounded bg-[var(--fs-bg-tertiary)] px-1 py-0.5 text-micro font-semibold text-[var(--fs-text-secondary)]">
                  not seen
                </span>
              )}
              {s.bssid === connectedBssid && (
                <span className="rounded bg-[var(--fs-primary-light)] px-1 py-0.5 text-micro font-bold text-[var(--fs-primary)]">
                  connected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

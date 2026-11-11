import { useLayoutEffect, useRef, useState } from "react";
import type { Band, History, Registry, RoamEvent, SamplePoint } from "../lib/types";
import { bssidDisplayName } from "../lib/labels";
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
  match,
  connectedBssid,
  registry,
  bandOf,
  connectionEvents,
  onClear,
}: {
  history: History;
  match: (bssid: string) => boolean;
  connectedBssid: string;
  registry: Registry;
  bandOf: (bssid: string) => Band;
  connectionEvents: RoamEvent[];
  onClear?: () => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 280 });

  // Measure the container so one SVG user unit is one CSS pixel at every width.
  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(280, Math.round(entry.contentRect.width));
      const h = w < 480 ? 220 : 280;
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
  const PAD_L = W < 480 ? 34 : 38;
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

  const ticks = [Y_MAX, -65, Y_MIN];
  const spanMin = Math.round(span / 60000) || 1;
  const toggle = (bssid: string) => setFocus((f) => (f === bssid ? null : bssid));

  return (
    <Card padding="lg">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Live signal history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Signal per AP over the last ~{spanMin} min. Dotted parts = AP out of range. Vertical
            lines mark a connection drop (red) or a roam to another AP (amber). Click a line or
            legend chip to isolate it.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {focus && (
            <button
              onClick={() => setFocus(null)}
              className="inline-flex min-h-11 items-center rounded-lg border border-indigo-200 px-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Show all
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              Clear chart
            </button>
          )}
        </div>
      </div>

      <div ref={chartRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 block w-full" style={{ height: H }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize={11} fill="#94a3b8">
                {t}
              </text>
            </g>
          ))}
          <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={11} fill="#94a3b8">
            now
          </text>
          <text x={PAD_L} y={H - 6} textAnchor="start" fontSize={11} fill="#94a3b8">
            -{spanMin} min
          </text>

          {series.map((s) => {
            const isConn = s.bssid === connectedBssid;
            const isFocused = focus === s.bssid;
            const dimmed = focus != null && !isFocused;
            const c = colorFor(s.bssid);
            const width = isFocused ? 3.4 : isConn ? 3 : 1.8;
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
                    strokeWidth={dimmed ? 1 : 1.4}
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    opacity={dimmed ? 0.08 : 0.4}
                  />
                ))}
                {/* solid segments — AP in range */}
                {s.segments.segs.map((seg, i) =>
                  seg.length === 1 ? (
                    <circle
                      key={`seg-${i}`}
                      cx={x(seg[0].t)}
                      cy={y(seg[0].dbm)}
                      r={2.5}
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
                        r={7.5}
                        fill="none"
                        stroke={c}
                        strokeWidth={2}
                        opacity={dimmed ? 0.15 : 1}
                      />
                    )}
                    <circle
                      cx={x(lastPt.t)}
                      cy={y(lastPt.dbm)}
                      r={isConn || isFocused ? 4 : 2.5}
                      fill={c}
                      stroke="#fff"
                      strokeWidth={1}
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
                  strokeWidth={1.4}
                  strokeDasharray="3 4"
                  opacity={0.85}
                >
                  <title>
                    {label} · {new Date(e.t).toLocaleTimeString()}
                  </title>
                </line>
                <circle cx={x(e.t)} cy={PAD_T} r={2.5} fill={color} />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {series.length === 0 && (
          <p className="text-xs text-slate-400">
            No signal history yet — new scans will draw the lines again.
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
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition",
                isFocused
                  ? "border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                focus != null && !isFocused && "opacity-50"
              )}
              title="Click to isolate this AP in the chart"
            >
              <span className="sr-only">Isolate </span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.inRange ? c : "#cbd5e1" }}
              />
              {seriesName}
              <BandTag band={bandOf(s.bssid)} />
              {s.lastReal ? (
                <span className="font-mono text-micro text-slate-400">
                  {s.lastReal.dbm}dBm
                </span>
              ) : null}
              {!s.inRange && (
                <span className="rounded bg-slate-100 px-1 py-0.5 text-micro font-semibold text-slate-500">
                  out of range
                </span>
              )}
              {s.bssid === connectedBssid && (
                <span className="rounded bg-indigo-100 px-1 py-0.5 text-micro font-bold text-indigo-700">
                  HERE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

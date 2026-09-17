import { useState } from "react";
import type { Band, History, Registry, SamplePoint } from "../lib/types";
import { bssidDisplayName } from "../lib/labels";
import { BandTag } from "./BandTag";
import { cn } from "../utils/cn";

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7"];

function colorFor(bssid: string): string {
  let h = 0;
  for (const c of bssid) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

const Y_MIN = -95;
const Y_MAX = -30;

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
}: {
  history: History;
  match: (bssid: string) => boolean;
  connectedBssid: string;
  registry: Registry;
  bandOf: (bssid: string) => Band;
}) {
  const [focus, setFocus] = useState<string | null>(null);

  const series = Object.entries(history)
    .filter(([bssid, pts]) => match(bssid) && pts.some((p) => p.dbm != null))
    .map(([bssid, pts]) => {
      const sliced = pts.slice(-120);
      const reals = sliced.filter((p) => p.dbm != null);
      return {
        bssid,
        pts: sliced,
        lastReal: reals.length > 0 ? reals[reals.length - 1] : null,
        inRange: sliced.length > 0 && sliced[sliced.length - 1].dbm != null,
        segments: splitSegments(sliced),
      };
    })
    .sort((a, b) => (b.lastReal?.dbm ?? -999) - (a.lastReal?.dbm ?? -999))
    .slice(0, 6);

  if (series.length === 0) return null;

  const W = 640;
  const H = 180;
  const PAD_L = 38;
  const PAD_R = 14;
  const PAD_T = 10;
  const PAD_B = 22;

  const xMax = Math.max(...series.map((s) => s.pts[s.pts.length - 1]?.t ?? 0));
  const xMin = Math.min(...series.map((s) => s.pts[0]?.t ?? 0));
  const span = Math.max(xMax - xMin, 30_000);
  const x0 = xMax - span;

  const x = (t: number) => PAD_L + ((t - x0) / span) * (W - PAD_L - PAD_R);
  const y = (dbm: number) => PAD_T + (1 - (dbm - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);

  const path = (pts: RealPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.dbm).toFixed(1)}`).join(" ");

  const ticks = [Y_MAX, -65, Y_MIN];
  const spanMin = Math.round(span / 60000) || 1;
  const toggle = (bssid: string) => setFocus((f) => (f === bssid ? null : bssid));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Live signal history</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Signal per AP over the last ~{spanMin} min. Dotted parts = AP out of range. Click a line
            or legend chip to isolate it.
          </p>
        </div>
        {focus && (
          <button
            onClick={() => setFocus(null)}
            className="shrink-0 rounded-lg border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Show all
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-44 w-full" preserveAspectRatio="none">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
              {t}
            </text>
          </g>
        ))}
        <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={9} fill="#94a3b8">
          now
        </text>
        <text x={PAD_L} y={H - 6} textAnchor="start" fontSize={9} fill="#94a3b8">
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
          return (
            <g key={s.bssid} className="cursor-pointer" onClick={() => toggle(s.bssid)}>
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
      </svg>

      <div className="mt-2 flex flex-wrap gap-2">
        {series.map((s) => {
          const isFocused = focus === s.bssid;
          const c = colorFor(s.bssid);
          return (
            <button
              key={s.bssid}
              onClick={() => toggle(s.bssid)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                isFocused
                  ? "border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                focus != null && !isFocused && "opacity-50"
              )}
              title="Click to isolate this AP in the chart"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.inRange ? c : "#cbd5e1" }}
              />
              {bssidDisplayName(registry, s.bssid)}
              <BandTag band={bandOf(s.bssid)} />
              {s.lastReal ? (
                <span className="font-mono text-[10px] text-slate-400">
                  {s.lastReal.dbm}dBm
                </span>
              ) : null}
              {!s.inRange && (
                <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-500">
                  out of range
                </span>
              )}
              {s.bssid === connectedBssid && (
                <span className="rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-bold text-indigo-700">
                  HERE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

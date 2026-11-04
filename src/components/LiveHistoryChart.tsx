import type { Band, History, Registry, RoamEvent, SamplePoint } from "../lib/types";
import { bssidDisplayName } from "../lib/labels";
import { BandTag } from "./BandTag";
import { cn } from "../utils/cn";

const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7"];
const colorFor = (bssid: string) => {
  let h = 0;
  for (const c of bssid) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
};

const Y_MIN = -95;
const Y_MAX = -30;
const W = 640;
const H = 180;
const PAD_L = 38;
const PAD_R = 14;
const PAD_T = 10;
const PAD_B = 22;

interface RealPoint {
  t: number;
  dbm: number;
}

function getSegments(pts: SamplePoint[]): RealPoint[][] {
  const segs: RealPoint[][] = [];
  let cur: RealPoint[] = [];
  for (const p of pts) {
    if (p.dbm != null) cur.push({ t: p.t, dbm: p.dbm });
    else if (cur.length > 0) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length > 0) segs.push(cur);
  return segs;
}

export interface LiveHistoryChartProps {
  history: History;
  match: (bssid: string) => boolean;
  connectedBssid: string;
  registry: Registry;
  bandOf: (bssid: string) => Band;
  connectionEvents: RoamEvent[];
}

export function LiveHistoryChart({
  history,
  match,
  connectedBssid,
  registry,
  bandOf,
  connectionEvents,
}: LiveHistoryChartProps) {
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
        segments: getSegments(sliced),
      };
    })
    .sort((a, b) => (b.lastReal?.dbm ?? -999) - (a.lastReal?.dbm ?? -999));

  if (series.length === 0) return null;

  const xMax = Math.max(...series.map((s) => s.pts[s.pts.length - 1]?.t ?? 0));
  const xMin = Math.min(...series.map((s) => s.pts[0]?.t ?? 0));
  const span = Math.max(xMax - xMin, 30_000);
  const x0 = xMax - span;

  const x = (t: number) => PAD_L + ((t - x0) / span) * (W - PAD_L - PAD_R);
  const y = (dbm: number) => PAD_T + (1 - (dbm - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);
  const path = (pts: RealPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.dbm).toFixed(1)}`).join(" ");

  const visibleEvents = connectionEvents.filter((e) => e.t >= x0 && e.t <= xMax);
  const spanMin = Math.round(span / 60000) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Live signal history</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Signal per AP over the last ~{spanMin} min. Vertical dashed lines mark a connection drop (red) or a roam to another AP (amber).
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-44 w-full" preserveAspectRatio="none">
        {[Y_MAX, -65, Y_MIN].map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{t}</text>
          </g>
        ))}
        <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={9} fill="#94a3b8">now</text>
        <text x={PAD_L} y={H - 6} textAnchor="start" fontSize={9} fill="#94a3b8">-{spanMin} min</text>

        {series.map((s) => {
          const isConn = s.bssid === connectedBssid;
          const c = colorFor(s.bssid);
          const lastSeg = s.segments[s.segments.length - 1];
          const lastPt = lastSeg?.[lastSeg.length - 1];

          return (
            <g key={s.bssid}>
              {s.segments.map((seg, i) =>
                seg.length === 1 ? (
                  <circle key={`seg-${i}`} cx={x(seg[0].t)} cy={y(seg[0].dbm)} r={2.5} fill={c} opacity={0.9} />
                ) : (
                  <path key={`seg-${i}`} d={path(seg)} fill="none" stroke={c} strokeWidth={isConn ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                )
              )}
              {lastPt && (
                <g>
                  {isConn && <circle cx={x(lastPt.t)} cy={y(lastPt.dbm)} r={7.5} fill="none" stroke={c} strokeWidth={2} />}
                  <circle cx={x(lastPt.t)} cy={y(lastPt.dbm)} r={isConn ? 4 : 2.5} fill={c} stroke="#fff" strokeWidth={1} />
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
              <line x1={x(e.t)} x2={x(e.t)} y1={PAD_T} y2={H - PAD_B} stroke={color} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.85}>
                <title>{label} · {new Date(e.t).toLocaleTimeString()}</title>
              </line>
              <circle cx={x(e.t)} cy={PAD_T} r={2.5} fill={color} />
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-2">
        {series.map((s) => {
          const isConn = s.bssid === connectedBssid;
          const c = colorFor(s.bssid);
          return (
            <div
              key={s.bssid}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                isConn
                  ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-800 ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white text-slate-600"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.inRange ? c : "#cbd5e1" }} />
              {bssidDisplayName(registry, s.bssid)}
              <BandTag band={bandOf(s.bssid)} />
              {s.lastReal ? <span className="font-mono text-[10px] text-slate-400">{s.lastReal.dbm}dBm</span> : null}
              {!s.inRange && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-500">out of range</span>}
              {isConn && <span className="rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-bold text-indigo-700">HERE</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

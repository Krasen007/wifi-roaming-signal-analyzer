import type { AccessPoint } from "../lib/types";
import { cn } from "../utils/cn";

function Group({ title, aps, hue }: { title: string; aps: AccessPoint[]; hue: string }) {
  const byChannel = new Map<number, AccessPoint[]>();
  for (const ap of aps) {
    if (ap.channel == null) continue;
    const arr = byChannel.get(ap.channel) ?? [];
    arr.push(ap);
    byChannel.set(ap.channel, arr);
  }
  const channels = Array.from(byChannel.entries()).sort((a, b) => a[0] - b[0]);
  const max = Math.max(1, ...channels.map(([, v]) => v.length));

  if (channels.length === 0)
    return (
      <div className="flex-1">
        <h4 className="text-xs font-semibold text-slate-500">{title}</h4>
        <p className="mt-4 text-xs text-slate-400">No APs on this band.</p>
      </div>
    );

  return (
    <div className="flex-1">
      <h4 className="text-xs font-semibold text-slate-500">{title}</h4>
      <div className="mt-3 flex items-end gap-2" style={{ height: 90 }}>
        {channels.map(([ch, list]) => (
          <div key={ch} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-slate-500">{list.length}</span>
            <div
              className={cn("w-full rounded-t", hue)}
              style={{ height: `${(list.length / max) * 64 + 4}px` }}
              title={`Channel ${ch}: ${list.length} AP(s)`}
            />
            <span className="text-[10px] text-slate-400">{ch}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelChart({ aps }: { aps: AccessPoint[] }) {
  const b24 = aps.filter((a) => a.band === "2.4");
  const b5 = aps.filter((a) => a.band === "5");
  const b6 = aps.filter((a) => a.band === "6");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Channel congestion</h3>
      <p className="mt-1 text-xs text-slate-500">
        How many nearby APs share each channel. Fewer neighbors on your channel = less interference.
      </p>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <Group title="2.4 GHz" aps={b24} hue="bg-amber-400" />
        <Group title="5 GHz" aps={b5} hue="bg-sky-400" />
        {b6.length > 0 && <Group title="6 GHz" aps={b6} hue="bg-violet-400" />}
      </div>
    </div>
  );
}

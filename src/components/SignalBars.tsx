import { quality } from "../lib/signal";
import { cn } from "../utils/cn";

export function SignalBars({ dbm, className }: { dbm: number; className?: string }) {
  const q = quality(dbm);
  const active = q.tier + 1; // 1-5 bars
  return (
    <div className={cn("flex items-end gap-[3px]", className)} title={`${q.label} (${dbm} dBm)`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-sm transition-colors",
            i < active ? q.bg : "bg-slate-200"
          )}
          style={{ height: `${6 + i * 4}px` }}
        />
      ))}
    </div>
  );
}

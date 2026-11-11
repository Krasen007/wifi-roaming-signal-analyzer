import { quality } from "../lib/signal";
import { cn } from "../utils/cn";

const BAR_BASE_HEIGHT = 6;
const BAR_STEP = 4;

export function SignalBars({ dbm, className }: { dbm: number; className?: string }) {
  const q = quality(dbm);
  const active = q.tier + 1; // 1-5 bars
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-end gap-[3px]", className)}
      title={`${q.label} (${dbm} dBm)`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-sm transition-colors",
            i < active ? q.bg : "bg-slate-200"
          )}
          style={{ height: `${BAR_BASE_HEIGHT + i * BAR_STEP}px` }}
        />
      ))}
    </div>
  );
}

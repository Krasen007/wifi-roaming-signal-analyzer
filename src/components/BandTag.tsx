import type { Band } from "../lib/types";
import { cn } from "../utils/cn";

const styles: Record<Band, string> = {
  "2.4": "bg-amber-100 text-amber-700",
  "5": "bg-sky-100 text-sky-700",
  "6": "bg-violet-100 text-violet-700",
  "?": "bg-slate-100 text-slate-500",
};

export function BandTag({ band }: { band: Band }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", styles[band])}>
      {band === "?" ? "?GHz" : `${band}GHz`}
    </span>
  );
}

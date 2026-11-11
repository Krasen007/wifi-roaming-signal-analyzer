import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export type CardTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "hero"
  | "dashed";

export type CardPadding = "none" | "sm" | "md" | "lg";

const tones: Record<CardTone, string> = {
  default: "border-slate-200 bg-white",
  accent: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white",
  success: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
  warning: "border-amber-200 bg-amber-50",
  danger: "border-rose-200 bg-rose-50",
  muted: "border-slate-200 bg-slate-50",
  hero: "border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white",
  dashed: "border-dashed border-slate-300 bg-white",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  tone = "default",
  padding = "md",
  className,
  children,
  ...rest
}: {
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border shadow-sm", tones[tone], paddings[padding], className)}
      {...rest}
    >
      {children}
    </div>
  );
}

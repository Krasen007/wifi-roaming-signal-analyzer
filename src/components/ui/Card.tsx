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
  default: "border-[var(--fs-border)] bg-[var(--fs-bg)]",
  accent: "border-[var(--fs-border)] bg-[var(--fs-primary-light)]",
  success: "border-[var(--fs-border)] bg-[var(--fs-success-light)]",
  warning: "border-[var(--fs-border)] bg-[var(--fs-warning-light)]",
  danger: "border-[var(--fs-border)] bg-[var(--fs-danger-light)]",
  muted: "border-[var(--fs-border)] bg-[var(--fs-bg-secondary)]",
  hero: "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 text-white",
  dashed: "border-dashed border-[var(--fs-border)] bg-[var(--fs-bg)]",
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

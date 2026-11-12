import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "indigo";

const variants: Record<BadgeVariant, string> = {
  default:
    "border border-[var(--fs-border)] bg-[var(--fs-bg-tertiary)] text-[var(--fs-text-secondary)]",
  secondary:
    "bg-[var(--fs-bg-tertiary)] text-[var(--fs-text)]",
  success:
    "bg-[var(--fs-success-light)] text-[var(--fs-success)]",
  warning:
    "bg-[var(--fs-warning-light)] text-[var(--fs-warning)]",
  danger:
    "bg-[var(--fs-danger-light)] text-[var(--fs-danger)]",
  indigo:
    "bg-[var(--fs-primary-light)] text-[var(--fs-primary)]",
};

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold tracking-wide whitespace-nowrap",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

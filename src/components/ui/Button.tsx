import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--fs-primary-action)] text-white border-transparent hover:bg-[var(--fs-primary-action-hover)] hover:shadow-sm",
  outline:
    "border border-[var(--fs-border)] bg-[var(--fs-bg)] text-[var(--fs-text)] hover:bg-[var(--fs-bg-secondary)]",
  ghost:
    "bg-transparent text-[var(--fs-text-secondary)] hover:bg-[var(--fs-bg-tertiary)]",
  danger:
    "bg-[var(--fs-danger-action)] text-white border-transparent hover:opacity-90",
  success:
    "bg-[var(--fs-success-action)] text-white border-transparent hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[var(--text-micro)]",
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-5 py-2.5 text-base",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  children,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--fs-radius-md)] border-transparent font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

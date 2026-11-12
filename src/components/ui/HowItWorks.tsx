import type { ReactNode } from "react";
import { Card } from "./Card";

export function HowItWorks({
  summary = "How it works",
  children,
  open = true,
}: {
  summary?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <Card>
      <details open={open}>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-900">
          {summary}
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">{children}</div>
      </details>
    </Card>
  );
}

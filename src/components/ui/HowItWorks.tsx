import type { ReactNode } from "react";
import { Card } from "./Card";

export function HowItWorks({
  summary = "How it works",
  children,
}: {
  summary?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">
          {summary}
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">{children}</div>
      </details>
    </Card>
  );
}

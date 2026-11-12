import {
  LayoutDashboard,
  FileText,
  Database,
  Network,
  Settings,
  Wifi,
  Radio,
  TriangleAlert,
} from "lucide-react";
import type { LiveWatch } from "../../lib/useLiveWatch";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../../utils/cn";

type Tab = "dashboard" | "import" | "registry" | "wired";

const TABS: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "import", label: "Scan import", icon: FileText },
  { key: "registry", label: "AP registry", icon: Database },
  { key: "wired", label: "Wired LAN", icon: Network },
];

interface HeaderProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  live: LiveWatch;
  format: string;
  watching: boolean;
  badges?: Record<Tab, number | undefined>;
}

export function Header({
  tab,
  setTab,
  live,
  format,
  watching,
  badges,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-[var(--fs-border)] bg-[var(--fs-bg-secondary)]/80 backdrop-blur-backdrop supports-[backdrop-filter]:bg-[var(--fs-bg-secondary)]/60 text-[var(--fs-text)]"
      )}
    >
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="rounded-[var(--fs-radius-md)] bg-[var(--fs-primary)] px-2 py-1.5 text-white">
            <Wifi className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight text-[var(--fs-text)]">
              FloorScope
            </p>
            <p className="text-[var(--text-micro)] text-[var(--fs-text-muted)] leading-none">
              WiFi roaming signal analyzer
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 sm:flex shrink-0">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            const count = badges?.[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-[var(--fs-radius-md)] transition-colors",
                  active
                    ? "bg-[var(--fs-primary-light)] text-[var(--fs-primary)] shadow-sm"
                    : "text-[var(--fs-text-secondary)] hover:bg-[var(--fs-bg-tertiary)] hover:text-[var(--fs-text)]"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
                {count != null && count > 0 && (
                  <Badge
                    variant="indigo"
                    className="ml-1.5 text-[var(--text-micro)] px-1.5 py-0.5 font-bold shadow-xs"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile fallback: compact segment-style selector */}
        <div className="flex items-center gap-2 sm:hidden">
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="min-h-10 rounded-lg border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2.5 py-1.5 text-xs text-[var(--fs-text)] focus:border-[var(--fs-primary)] outline-none"
          >
            {TABS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
          {(watching || live.watching) && (
            <Badge variant="indigo" className="text-xs shrink-0">
              <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
              Live
              {live.lastUpdate && (
                <span className="ml-0.5 font-normal opacity-80">
                  {new Date(live.lastUpdate).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </Badge>
          )}
          {((live.error && !live.watching) || (watching === false && live.error)) && (
            <Badge variant="danger" className="text-xs shrink-0">
              <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
              File lost
            </Badge>
          )}
          {format && (
            <Badge variant="default" className="text-xs shrink-0">
              {format}
            </Badge>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            title="Open settings"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}

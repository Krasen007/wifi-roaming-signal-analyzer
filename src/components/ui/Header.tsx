import { useCallback, useState } from "react";
import {
  BookOpen,
  Database,
  FileText,
  LayoutDashboard,
  Network,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import type { LiveWatch } from "../../lib/useLiveWatch";
import { Badge } from "../ui/Badge";
import { ThemeToggle } from "./ThemeToggle";
import { HelpDialog } from "./HelpDialog";
import { cn } from "../../utils/cn";

type Tab = "dashboard" | "import" | "registry" | "wired";

const TABS: {
  key: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "import", label: "Scanner", icon: FileText },
  { key: "registry", label: "Locations", icon: Database },
  { key: "wired", label: "Wired", icon: Network },
];

interface HeaderProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  live: LiveWatch;
  format: string;
  watching: boolean;
  badges?: Record<Tab, number | undefined>;
}

export function Header({ tab, setTab, live, format, watching, badges }: HeaderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--fs-border)] bg-[var(--fs-bg-secondary)]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--fs-bg-secondary)]/65">
        <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Brand */}
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="rounded-[var(--fs-radius-md)] bg-[var(--fs-primary)] p-2 text-white">
                <Wifi className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--fs-text)]">
                  FloorScope
                </h1>

              </div>
            </div>

            {/* Navigation */}
            <nav
              aria-label="Sections"
              className="hidden items-center gap-1 lg:flex"
            >
              {TABS.map((item) => {
                const active = tab === item.key;
                const Icon = item.icon;
                const count = badges?.[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-[var(--fs-radius-md)] px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--fs-primary-light)] text-[var(--fs-primary)] shadow-sm"
                        : "text-[var(--fs-text-secondary)] hover:bg-[var(--fs-bg-tertiary)] hover:text-[var(--fs-text)]"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                    {count != null && count > 0 && (
                      <Badge
                        variant="indigo"
                        className="ml-0.5 px-1.5 py-0.5 text-[var(--text-micro)] font-bold"
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {watching && (
                <Badge variant="success" className="h-7 gap-1.5 px-2.5 text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                  </span>
                  Live
                  <span className="sr-only">
                    {live.lastUpdate
                      ? `, last scan at ${new Date(live.lastUpdate).toLocaleTimeString()}`
                      : ""}
                  </span>
                </Badge>
              )}
              {live.stale && !watching && (
                <Badge variant="warning" className="h-7 gap-1 px-2 text-xs">
                  <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Offline
                  <span className="sr-only">
                    {live.lastUpdate
                      ? `, last scan at ${new Date(live.lastUpdate).toLocaleTimeString()}`
                      : ""}
                  </span>
                </Badge>
              )}
              {live.error && !live.watching && !live.stale && (
                <Badge variant="danger" className="h-7 gap-1 text-xs">
                  <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Scanner stopped</span>
                  <span className="sr-only sm:hidden">Scanner stopped</span>
                </Badge>
              )}
              {format && <span className="sr-only">Scan format: {format}</span>}
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--fs-radius-md)] border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2.5 text-sm font-medium text-[var(--fs-text-secondary)] transition-colors hover:bg-[var(--fs-bg-tertiary)] hover:text-[var(--fs-text)]"
                aria-label="About FloorScope"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">About</span>
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile section picker */}
          <div className="mt-2 lg:hidden">
            <label htmlFor="section-select" className="sr-only">
              Choose a section
            </label>
            <select
              id="section-select"
              value={tab}
              onChange={(event) => setTab(event.target.value as Tab)}
              className="min-h-11 w-full rounded-lg border border-[var(--fs-border)] bg-[var(--fs-bg)] px-3 py-1.5 text-sm font-medium text-[var(--fs-text)] focus:border-[var(--fs-primary)]"
            >
              {TABS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>


        </div>
      </header>

      <HelpDialog open={helpOpen} onClose={closeHelp} />
    </>
  );
}

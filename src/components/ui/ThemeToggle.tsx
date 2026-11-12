import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../../utils/cn";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("fs-theme") as
      | "light"
      | "dark"
      | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)")
      .matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("fs-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, [theme]);

  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[var(--fs-radius-md)] border border-[var(--fs-border)] bg-[var(--fs-bg)] px-2.5 py-1.5 text-[var(--fs-text-secondary)] hover:bg-[var(--fs-bg-secondary)] hover:text-[var(--fs-text)] transition-colors",
        theme === "dark" && "text-[var(--fs-primary)] border-[var(--fs-primary)]"
      )}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

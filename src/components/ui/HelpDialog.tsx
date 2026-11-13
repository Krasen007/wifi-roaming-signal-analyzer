import { useEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}



export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    const siblings = Array.from(overlayRef.current?.parentElement?.children ?? [])
      .filter((element) => element !== overlayRef.current)
      .map((element) => ({
        element: element as HTMLElement,
        inert: (element as HTMLElement).inert,
      }));
    for (const { element } of siblings) element.inert = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      for (const { element, inert } of siblings) element.inert = inert;
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        aria-describedby="help-intro"
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--fs-border)] bg-[var(--fs-bg)] shadow-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--fs-border)] bg-[var(--fs-bg)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--fs-primary-light)] p-2 text-[var(--fs-primary)]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="help-title" className="text-base font-semibold text-[var(--fs-text)]">
                FloorScope in plain English
              </h2>
              <p className="mt-0.5 text-xs text-[var(--fs-text-secondary)]">
                What it does, how to start, and what the words mean.
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--fs-text-secondary)] hover:bg-[var(--fs-bg-tertiary)] hover:text-[var(--fs-text)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-7 px-5 py-5 text-sm text-[var(--fs-text-secondary)]">
          <section aria-labelledby="help-what">
            <h3 id="help-what" className="text-sm font-semibold text-[var(--fs-text)]">
              What FloorScope does
            </h3>
            <p id="help-intro" className="mt-1.5 leading-relaxed">
              Windows shows one Wi-Fi name, but a building can have dozens of access points sharing
              that name. FloorScope reads the Wi-Fi scan on your PC and tells you{" "}
              <b className="text-[var(--fs-text)]">which box you are really connected to</b>, whether
              it is the best one nearby, and whether it matches the floor you say you are on. Nothing
              leaves your computer.
            </p>
          </section>





          <section
            aria-labelledby="help-privacy"
            className="flex items-start gap-2.5 rounded-xl border border-[var(--fs-border)] bg-[var(--fs-bg-secondary)] p-3"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fs-success)]" aria-hidden="true" />
            <div>
              <h3 id="help-privacy" className="text-xs font-semibold text-[var(--fs-text)]">
                Private by design
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--fs-text-secondary)]">
                Scans, locations and saved sockets stay in this browser. FloorScope has no server and
                uploads nothing.
              </p>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--fs-primary-action)] px-5 text-sm font-semibold text-white hover:bg-[var(--fs-primary-action-hover)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

# FloorScope - UI Hardening Implementation Plan

- **Created:** 2026-11-11
- **Source:** 5-dimension audit (11/20 - Acceptable)
- **Scope:** 12 selected findings (2 systemic patterns + 10 issues)
- **Status:** Ready to execute

All line numbers below are **pre-change** references. After Phase 1 the numbers shift; locate sites by the quoted class string or symbol name.

---

## 1. Objective

Resolve exactly the findings selected from the audit, without touching the unselected dimensions. Done means every acceptance criterion in section 9 is met, `npx tsc --noEmit` exits 0, and there is no visual regression at 375 / 768 / 1280 px.

---

## 2. Scope

### 2.1 In scope (selected)

| ID | Finding | Original severity |
|----|---------|-------------------|
| S1 | Uniform card container everywhere + nested mini-cards | Systemic #4 |
| S2 | Micro-typography as the default label treatment + px font units | Systemic #5 + P3 |
| A1 | Live alerts and scan updates never announced | P1 |
| R1 | Signal chart geometrically distorted on narrow viewports | P1 |
| A2 | Focus indicators suppressed and under-contrast | P2 |
| A3 | Heading hierarchy skips a level / misused elements | P2 |
| A4 | Invalid manual BSSID fails silently | P2 |
| R2 | Touch targets below 44 px | P2 |
| P1 | Redundant instructional copy | P2 |
| P2 | Perpetual `animate-ping` | P3 |
| P3 | Disabled buttons look enabled | P3 |
| P4 | Information conveyed only by `title` | P3 |

### 2.2 Explicitly out of scope (not selected)

- **P1 Contrast** (`text-slate-400` at 2.45-2.56:1) - the highest-impact remaining item.
- **P1 Unlabeled table inputs** (`RegistryManager.tsx:221-244`, `WiredPanel.tsx:642-691`).
- **P2 Tab `aria-current` / `aria-selected`**.
- **P2 Theming / dark mode / token layer**.
- **P2 Table reflow on phones** (stacked rows below `md`).
- **P3 Memoization** (`React.memo` on the chart).
- **P3 Chart line keyboard operability** (`<g onClick>` focusability). WS6 changes chart geometry only; it does not add keyboard handling.

> **One sequencing note, stated once:** the contrast sweep is a ~30-minute mechanical change (`text-slate-400` -> `slate-500`/`slate-600`) that touches the *same class strings* as WS2. If you intend to do it soon, fold it into WS2 and avoid a second pass over 10 files. It is not included here because it was not selected.

---

## 3. Preconditions and baseline

- Work on a branch off `main`; do not mix this with the contrast/input-label work.
- `tsconfig.json` is `strict` with `noUnusedLocals` / `noUnusedParameters`. Refactors that delete JSX will leave unused imports - `tsc` will catch them; fix them in the same edit.
- **Build output goes to `docs/`**, not `dist/` (`vite.config.ts:116`). `docs/` is committed and published. Do **not** run `npm run build` as routine verification, or you will dirty the published bundle on every check. `dist/` is stale output from an older config - ignore it.
- **No test suite exists** (`package.json` has no `test` script). Verification is type-check + build + manual QA. This plan does not introduce a test harness.
- The repo imports relatively (`../utils/cn`), not via the `@` alias, even though `vite.config.ts:121` defines it. Match that convention in new files.

---

## 4. Workstreams

### WS1 - Card primitive and nested-card rule

**Goal:** one container component; nothing inside a card may carry both a border and a shadow.

#### 4.1.1 Create `src/components/ui/Card.tsx`

```tsx
import type { ReactNode } from "react";
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
}: {
  tone?: CardTone;
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border shadow-sm", tones[tone], paddings[padding], className)}>
      {children}
    </div>
  );
}
```

`cn()` uses `tailwind-merge`, so `className="p-10"` correctly overrides the `p-5` default.

**Rejected alternative:** a `CardHeader` abstraction (icon chip + title + description). The header markup varies too much (icon chip colors, trailing actions, `dl` layouts) and the only real win - heading levels - is four one-word edits in WS4. Do not add it.

#### 4.1.2 Replace every top-level container

| File | Line | New element |
|------|------|-------------|
| `Dashboard.tsx` | 80 | `<Card tone="dashed" className="p-10 text-center">` |
| `DashboardControls.tsx` | 33 | `<Card padding="sm" className="flex flex-wrap items-center gap-3">` |
| `RoamPanel.tsx` | 63 | `<Card>` |
| `LiveHistoryChart.tsx` | 118 | `<Card padding="lg">` |
| `DevicesPanel.tsx` | 20 | `<Card>` |
| `AllApsList.tsx` | 33 | `<Card>` |
| `OtherNetworks.tsx` | 16 | `<Card>` |
| `SignalHero.tsx` | 21 | `<Card tone="hero" padding="lg" className="lg:col-span-2">` |
| `ScanImport.tsx` | 73 | `<Card>` |
| `ScanImport.tsx` | 154 | `<Card tone="success">` |
| `ScanImport.tsx` | 237 | `<Card>` |
| `ScanImport.tsx` | 274 | `<Card tone="accent">` |
| `ScanImport.tsx` | 365 | `<Card className="transition">` + keep drag handlers on it |
| `ScanImport.tsx` | 402 | `<Card tone="muted" padding="sm" className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">` |
| `WiredPanel.tsx` | 219 | `<Card>` |
| `WiredPanel.tsx` | 342 | `<Card>` |
| `WiredPanel.tsx` | 389 | `<Card>` |
| `WiredPanel.tsx` | 414 | `<Card tone={info.lldp ? "success" : "warning"}>` |
| `WiredPanel.tsx` | 464 | `<Card padding="none" className="overflow-hidden">` |
| `WiredPanel.tsx` | 513 | `<Card tone="muted" padding="sm" className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">` |
| `WiredPanel.tsx` | 523 | `<Card tone="accent">` |
| `WiredPanel.tsx` | 612 | `<Card padding="none" className="overflow-x-auto">` |
| `WiredPanel.tsx` | 718 | `<Card className="transition">` + keep drag handlers |
| `WiredPanel.tsx` | 782 | `<Card tone="muted" padding="sm" className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">` |
| `RegistryManager.tsx` | 124 | `<Card tone="accent" padding="sm" className="text-sm text-indigo-900">` |
| `RegistryManager.tsx` | 143 | `<Card padding="none" className="overflow-x-auto">` |

`SignalHero` keeps `text-white` via the `hero` tone; do not re-add it in `className`.

#### 4.1.3 Nested-card rule (same pass)

Rule: inside a `Card`, a child may use a tinted background **or** a border, never border + shadow. **Semantic alerts are exempt** - the amber/rose/emerald callouts in `RoamPanel` and `WiredPanel` communicate severity and stay as-is.

Convert:

- `ScanImport.tsx:463` `StatusItem`: drop `border border-slate-200`, keep `rounded-xl bg-slate-50 px-3 py-2`. Parent grid (`:90`) gains `divide-x divide-slate-200` (and `divide-y sm:divide-y-0` if it wraps).
- `WiredPanel.tsx:806` `Stat`: identical treatment.
- `WiredPanel.tsx:355` adapter block: `rounded-xl bg-slate-50 p-3` (remove `border border-slate-100`).
- `DevicesPanel.tsx:39` device block: `rounded-xl p-3` + `dev.connected ? "bg-indigo-50/40" : "bg-slate-50"`; separate members with `divide-y divide-slate-100` on the member container (`:68`).
- `AllApsList.tsx:59` AP rows: container `:40` becomes `mt-4 divide-y divide-slate-100` (remove `space-y-2`); row becomes `flex items-center gap-3 px-3 py-2.5` with no border; connected row keeps `bg-indigo-50/50` and adds `border-l-2 border-indigo-400` (an accent rule, not a card).

**Acceptance:** `grep -rn "rounded-2xl border" src` matches only `src/components/ui/Card.tsx`; no element inside a card has both `border` and `shadow-sm`.

---

### WS2 - Typography scale

**Goal:** no arbitrary px font sizes; 11 px floor; sizes scale with the user's font preference.

#### 4.2.1 `src/index.css`

```css
@import "tailwindcss";

@theme {
  --text-micro: 0.6875rem;              /* 11px at default root */
  --text-micro--line-height: 1rem;
}

@utility label-caps {
  font-size: var(--text-micro);
  line-height: var(--text-micro--line-height);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

@layer base {
  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

`--text-*` in `@theme` generates the `text-micro` utility in Tailwind v4. `label-caps` is a custom utility (v4 `@utility`).

#### 4.2.2 Sweep rules

| From | To |
|------|----|
| `text-[9px]` | `text-micro` |
| `text-[10px]` | `text-micro` |
| `text-[11px]` | `text-xs` |
| `text-[10px] font-semibold uppercase tracking-wide` | `label-caps` (drop the redundant tracking/weight classes) |

Sites (44 total):

- `App.tsx:258`
- `AllApsList.tsx:74, 81, 86, 92, 110, 125, 131, 136`
- `BandTag.tsx:13`
- `DevicesPanel.tsx:48, 55, 62, 81, 86, 92, 96`
- `LiveHistoryChart.tsx:297, 312, 317, 322`
- `RegistryManager.tsx:212`
- `RoamPanel.tsx:67, 133, 143, 155, 158`
- `ScanImport.tsx:397, 464, 473`
- `WiredPanel.tsx:358, 362, 366, 404, 422, 496, 745, 807, 816, 824, 825, 845`

**Do not** apply `text-micro` to prose. It is for badges, chips, and uppercase labels only; body/meta text uses `text-xs`.

**Acceptance:** `grep -rn "text-\[[0-9]*px\]" src` returns nothing. Computed font-size in DevTools for a badge is 11 px, and changing the browser default font size from 16 to 20 scales it.

---

### WS3 - Focus indicators

**Goal:** every interactive element shows a 2 px indigo-600 ring at 2 px offset (5.9:1 against white).

#### 4.3.1 `src/index.css` (append inside `@layer base`)

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 2px solid var(--color-indigo-600);
  outline-offset: 2px;
}
```

`@layer base` sits below utilities, so any surviving `outline-none` would win - hence step 2.

#### 4.3.2 Remove the suppressors

Delete `outline-none` from every input/select/textarea class string:

- `DashboardControls.tsx:42, 60, 81, 101`
- `RegistryManager.tsx:226, 235, 243, 268`
- `WiredPanel.tsx:645, 652, 659, 666, 674, 682, 690, 745, 850`
- `ScanImport.tsx:397`

Also remove the low-contrast ring on the two textareas (`ScanImport.tsx:397`, `WiredPanel.tsx:745`): `focus:ring-2 focus:ring-indigo-100`.

**Decision:** keep `focus:border-indigo-400` (harmless secondary cue) on selects/inputs. Do not remove it in this pass; it costs nothing and preserves the existing visual intent.

**Acceptance:** Tab through all four tabs - every button, select, input, textarea, and `<summary>` shows the ring. No element shows a doubled UA outline.

---

### WS4 - Heading hierarchy

**Goal:** one `h1`, then `h2` per section, `h3` for subsections. No orphan labels.

1. **`App.tsx:217-243`** - split the logo button:
   - Button wraps **only** the icon mark; `aria-label="Go to dashboard"` stays.
   - `<h1>FloorScope</h1>` and the tagline become siblings of the button inside the same flex row.
   - Side effect: this also resolves the *unselected* P2 "accessible name contradicts visible label" (2.5.3). It is unavoidable when the `h1` leaves the button - note it in the PR description.
2. **Dashboard card titles `h3` -> `h2`:** `RoamPanel.tsx:65`, `LiveHistoryChart.tsx:121`, `DevicesPanel.tsx:26`, `AllApsList.tsx:34`.
3. **`RegistryManager.tsx`** - add `<h2 className="sr-only">AP Registry</h2>` as the first child of the returned fragment, so every view has an `h2`.
4. **`RoamPanel.tsx:141`** - replace the orphan `<label>` with `<h3 className="text-xs font-medium text-slate-500">Connection events</h3>`.
5. `ScanImport` and `WiredPanel` already use `h2` for their card titles - leave them.

**Acceptance:** heading outline (browser a11y tree or a heading-list extension) reads `h1 FloorScope` -> `h2` sections -> `h3 Connection events`; zero `<label>` elements without `htmlFor` or a wrapped control.

---

### WS5 - Live regions

**Goal:** verdict changes are announced once; polling never spams.

#### 4.5.1 `RoamPanel.tsx`

Add a **persistent** live region before the verdict branches (`:73`). It must exist in the DOM on every render - a live region that mounts together with its content is announced unreliably.

```tsx
const statusMessage = stickyWarning
  ? "Sticky client detected. A stronger access point is available."
  : wrongBuilding || wrongFloor
    ? `Wrong ${wrongBuilding ? "building" : "floor"} attachment.`
    : connected
      ? "Connected to the best access point."
      : "Connected access point is unknown.";

<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</p>
```

The string deliberately excludes dBm values and timestamps, so it only changes on a verdict transition. Identical strings produce no DOM mutation, so no announcement.

#### 4.5.2 `App.tsx` header

Add one persistent region next to the existing pills (`:265`):

```tsx
<div className="sr-only" role="status" aria-live="polite">
  {watching || wiredLive.watching ? "Live scanning active. " : ""}
  {(live.error && !watching) || (wiredLive.error && !wiredLive.watching)
    ? "Scan file lost."
    : ""}
</div>
```

Do **not** put `aria-live` on the visible `Live` / `File lost` pills - they mount and unmount with state, which makes announcements unreliable.

#### 4.5.3 `DashboardControls.tsx:111-123`

Wrap only the state word in the live region; keep the timestamp out of it:

```tsx
<div className="flex items-center gap-2 ...">
  <span className="relative flex h-2 w-2">...</span>
  <span role="status" aria-live="polite">LIVE</span>
  {live.lastUpdate && <span aria-hidden="true" ...>{time}</span>}
</div>
```

**Acceptance:** with NVDA + Chrome (or VoiceOver + Safari), walk into a sticky-client state - announced once. Leave it polling for 30 s - no repeat announcements. Toggle live watch off - "Scan file lost" (when applicable) announced once.

---

### WS6 - Chart responsive geometry

**Goal:** 1 SVG user unit = 1 CSS pixel, at every width. No distortion, no letterboxing.

`LiveHistoryChart.tsx` currently hard-codes `W = 640`, `H = 280`, `PAD_L = 38` and uses `preserveAspectRatio="none"` with `h-72 w-full` (`:148`).

1. Add imports: `useLayoutEffect, useRef, useState`.
2. Replace the constants with measured state:

```tsx
const chartRef = useRef<HTMLDivElement>(null);
const [size, setSize] = useState({ w: 640, h: 280 });

useLayoutEffect(() => {
  const el = chartRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    const w = Math.max(280, Math.round(entry.contentRect.width));
    const h = w < 480 ? 220 : 280;
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

const W = size.w;
const H = size.h;
const PAD_L = W < 480 ? 34 : 38;
```

The `prev` guard prevents a render loop from sub-pixel resize churn.

3. Wrap the SVG:

```tsx
<div ref={chartRef}>
  <svg
    viewBox={`0 0 ${W} ${H}`}
    className="mt-4 block w-full"
    style={{ height: H }}
  >
```

**Remove `preserveAspectRatio="none"`.** Because the viewBox width equals the measured container width, no scaling occurs - the default `xMidYMid meet` never kicks in.

4. Axis label sizes: `fontSize={9}` -> `fontSize={11}` at `:152`, `:157`, `:160`.

5. `PAD_L` is used by the tick label `x={PAD_L - 6}`; at 34 it still clears an 11 px `-95` label.

**Acceptance:** at 375 px, circles are circular (measure a `<circle r={7.5}>` bounding box), axis labels render >= 9 px, no horizontal page scroll, no blank letterbox bands. Resizing the window reflows smoothly with no flash of a wrong-size chart.

---

### WS7 - Manual BSSID validation

`RegistryManager.tsx:114-120` silently returns on a regex miss.

```tsx
const [bssidError, setBssidError] = useState<string | null>(null);

const addManual = () => {
  const raw = manualBssid.trim();
  if (!raw) {
    setBssidError("Enter a BSSID first.");
    return;
  }
  const b = raw.toLowerCase().replace(/-/g, ":");
  if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(b)) {
    setBssidError("Use six hex octets, e.g. aa:bb:cc:dd:ee:ff.");
    return;
  }
  setBssidError(null);
  update(b, {});
  setManualBssid("");
};
```

Input (`:264-269`):

```tsx
<input
  aria-label="BSSID"
  aria-invalid={Boolean(bssidError)}
  aria-describedby={bssidError ? "manual-bssid-error" : undefined}
  onChange={(e) => {
    setManualBssid(e.target.value);
    if (bssidError) setBssidError(null);
  }}
  className={cn(/* existing */, bssidError && "border-rose-400")}
/>
```

Error node directly under the row:

```tsx
{bssidError && (
  <p id="manual-bssid-error" role="alert" className="text-xs text-rose-600">
    {bssidError}
  </p>
)}
```

`aria-label="BSSID"` is included here because an error attached to an unnamed field is not actionable. It is the only unlabeled-input fix in scope.

**Acceptance:** submit empty -> error; submit `zz:...` -> error; submit `AA-BB-CC-DD-EE-FF` -> row added, error cleared; the error is announced by a screen reader.

---

### WS8 - Touch targets

**Decision:** 44 px (`min-h-11`) for standalone controls; 36 px (`min-h-9`) for controls inside data tables and the chart legend. A 44 px table row would double table height; 36 px still clears WCAG 2.5.8 AA (24 px) with margin. If strict 44 px is required everywhere, it depends on the unselected stacked-row reflow work.

| Site | Change |
|------|--------|
| `App.tsx:250` tab buttons | add `min-h-11` |
| `LiveHistoryChart.tsx:130, 138` Show all / Clear chart | add `min-h-11 px-3` |
| `LiveHistoryChart.tsx:293` legend chips | add `min-h-9 py-1.5` |
| `RegistryManager.tsx:248-254` Clear | `inline-flex min-h-9 items-center px-2` |
| `WiredPanel.tsx:701-707` Delete | `inline-flex min-h-9 items-center px-2` |
| `RegistryManager.tsx:221, 230, 239` table inputs | `py-1` -> `py-2` |
| `WiredPanel.tsx:642-690` table inputs | `py-1` -> `py-2` |
| `DashboardControls.tsx:42, 60, 81, 101` | `py-1.5` -> `py-2` |
| Primary action buttons (ScanImport 435, WiredPanel 582, 767) | add `min-h-11` |

**Acceptance:** measure with DevTools; standalone controls >= 44 px tall, in-table controls >= 36 px, no row height jump that breaks the sticky table header.

---

### WS9 - Copy consolidation

**Goal:** one intro per tab, one `How it works` disclosure, one privacy statement (the footer).

#### 4.9.1 Create `src/components/ui/HowItWorks.tsx`

```tsx
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
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          {summary}
        </summary>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">{children}</div>
      </details>
    </Card>
  );
}
```

Keep the native disclosure marker - do not add `list-none`/`marker:hidden`.

#### 4.9.2 `ScanImport.tsx`

- Card 1 (`:73-151`): keep the header and the four status tiles. Move "What this tab is for" (`:74-88`) and "What the numbers mean" (`:122-142`) into a single `HowItWorks` at the end of the tab.
- Delete the privacy card (`:402-410`) - the app footer already states it verbatim.
- Trim `:266-270` to one sentence: "Leave the PowerShell window open while you walk; stop it with Ctrl+C when done."

#### 4.9.3 `WiredPanel.tsx`

- Delete the privacy strip (`:782-789`).
- Move the gateway/OUI explainer (`:404-407`) into `HowItWorks`.
- Shorten `:528-531` to one sentence.
- Keep the LLDP explanation (`:438-449`) - it is the "why is there no data" state, not duplication.

**Acceptance:** `grep -c "never leave your PC\|stays on this machine\|stays on your machine" src` -> 1 (the footer). Each tab has exactly one intro card and one `HowItWorks`.

---

### WS10 - Reduced motion

`DashboardControls.tsx:114` and `ScanImport.tsx:331`: `animate-ping` -> `motion-safe:animate-ping`.

Pausing when the tab is hidden is **not** included - it needs a `visibilitychange` listener for negligible gain, and `prefers-reduced-motion` covers the accessibility case.

**Acceptance:** DevTools -> Rendering -> `prefers-reduced-motion: reduce` -> no animation; the static inner dot remains visible.

---

### WS11 - Disabled states

`ScanImport.tsx:441`, `WiredPanel.tsx:588`, `WiredPanel.tsx:773`:

```
cursor-not-allowed bg-slate-300
  ->
cursor-not-allowed bg-slate-200 text-slate-500
```

The `disabled` attribute is already present; no `aria-disabled` needed.

**Acceptance:** disabled buttons read as inactive (muted fill + muted text), clearly distinct from the indigo enabled state. Disabled text contrast is WCAG-exempt but lands around 3.9:1 for legibility.

---

### WS12 - Tooltip semantics

1. `SignalBars.tsx:11` - add `aria-hidden="true"` to the wrapper. The bars are decorative; the dBm value is adjacent at all six call sites (verified: `AllApsList.tsx:109`, `DevicesPanel.tsx:92`, `OtherNetworks.tsx:24`, `RegistryManager.tsx:202`, `SignalHero.tsx:47` + `:52`). Keep the `title` for mouse hover.
2. `AllApsList.tsx:73-79` - inside the `D{n}` badge add `<span className="sr-only"> - shares this radio with other SSIDs</span>`.
3. `LiveHistoryChart.tsx:293-326` - the legend button gets `aria-pressed={isFocused}` and `aria-label={`Isolate ${name}`}`; keep `title`.
4. `LiveHistoryChart.tsx:174` - add `role="img"` and `aria-label={`${name}, ${lastDbm} dBm`}` to each series `<g>` so browse-mode screen readers can reach the summary. Keyboard operability remains out of scope.
5. `LiveHistoryChart.tsx:211` - the `<title>` inside `<path>` is valid SVG semantics; leave it.

**Acceptance:** review every `title=` attribute - each one either duplicates adjacent text or has a `sr-only`/`aria-label` equivalent.

---

## 5. File change matrix

| File | WS1 | WS2 | WS3 | WS4 | WS5 | WS6 | WS7 | WS8 | WS9 | WS10 | WS11 | WS12 |
|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|------|------|------|
| `src/index.css` | | x | x | | | | | | | | | |
| `src/components/ui/Card.tsx` (new) | x | | | | | | | | | | | |
| `src/components/ui/HowItWorks.tsx` (new) | | | | | | | | | x | | | |
| `src/App.tsx` | | x | | x | x | | | x | | | | |
| `src/components/Dashboard.tsx` | x | | | | | | | | | | | |
| `src/components/DashboardControls.tsx` | x | x | x | | x | | | x | | x | | |
| `src/components/SignalHero.tsx` | x | | | | | | | | | | | |
| `src/components/RoamPanel.tsx` | x | x | | x | x | | | | | | | |
| `src/components/LiveHistoryChart.tsx` | x | x | | x | | x | | x | | | | x |
| `src/components/DevicesPanel.tsx` | x | x | | x | | | | | | | | |
| `src/components/AllApsList.tsx` | x | x | | x | | | | | | | | x |
| `src/components/OtherNetworks.tsx` | x | | | | | | | | | | | |
| `src/components/RegistryManager.tsx` | x | x | x | x | | | x | x | | | | |
| `src/components/ScanImport.tsx` | x | x | x | | | | | x | x | x | x | |
| `src/components/WiredPanel.tsx` | x | x | x | | | | | x | x | | x | |
| `src/components/BandTag.tsx` | | x | | | | | | | | | | |

---

## 6. Execution order

| Phase | Workstreams | Why this order |
|-------|-------------|----------------|
| 1 - Foundation | WS2 -> WS3 -> WS10 -> WS11 | Pure class-string sweeps, no structural risk; they stabilise the strings WS1 will touch. |
| 2 - Structure | WS1 -> WS4 -> WS9 | WS9 depends on `Card`; WS4's heading edits are cheaper after the containers are unified. |
| 3 - Behaviour | WS5 -> WS7 -> WS12 | Independent of layout; easy to verify in isolation. |
| 4 - Layout | WS6 -> WS8 | WS6 changes measured geometry; WS8 depends on final padding from WS1/WS2. |

Run `npx tsc --noEmit` at the end of each phase. Do not batch all four phases into one commit - each phase is independently reviewable and revertible.

---

## 7. Verification

### 7.1 Automated

```powershell
npx tsc --noEmit
npx vite build --outDir .tmp-build --emptyOutDir
Remove-Item -Recurse -Force .tmp-build
```

`lsp_diagnostics` on every changed file after each phase.

### 7.2 Manual QA matrix

| Check | Method | Pass condition |
|-------|--------|----------------|
| Keyboard only | Tab / Shift+Tab through all four tabs | 2 px indigo ring on every control, logical order, no traps |
| Screen reader | NVDA + Chrome or VoiceOver + Safari | verdict announced once; heading list is h1 -> h2 -> h3 |
| Reduced motion | DevTools rendering emulation | no ping animation |
| Widths | 375 / 768 / 1280 px | chart circles round, axis labels legible, no page-level horizontal scroll |
| Copy | visual scan of all tabs | privacy statement appears once |
| Card rule | `grep -rn "rounded-2xl border" src` | only `ui/Card.tsx` |
| Typography | `grep -rn "text-\[[0-9]*px\]" src` | no matches |
| Touch | DevTools element measurement | standalone >= 44 px, in-table >= 36 px |
| Regressions | `git diff --stat` | only files in the matrix changed |

---

## 8. Risks and rollback

| Risk | Mitigation |
|------|------------|
| Card refactor shifts spacing globally | `md` = `p-5` matches the majority; screenshot 1280 px before/after Phase 2 and diff |
| Removing `outline-none` reveals a doubled UA ring | the `:focus-visible` rule replaces it; verify on Chrome + Firefox |
| `aria-live` spam from 5 s polling | live-region text excludes dBm and timestamps; verified by a 30 s idle test |
| `ResizeObserver` render loop | observe the wrapper, guard `setSize` with an equality check |
| `text-micro` not generated | confirm in DevTools that the badge computes to 11 px; if not, `@theme` is in the wrong file or the build cache is stale |
| `docs/` dirtied | verify with `--outDir .tmp-build`, never `npm run build` |
| Unused imports after JSX deletion | `noUnusedLocals` fails the type-check; fix in the same edit |

Rollback: each phase is a separate commit; revert the phase, not the whole branch.

---

## 9. Acceptance criteria (definition of done)

- [ ] Zero `rounded-2xl border` outside `src/components/ui/Card.tsx`
- [ ] Zero `text-[Npx]` class strings; minimum rendered size 11 px
- [ ] Every interactive element shows a 2 px indigo-600 focus ring with 2 px offset
- [ ] Heading outline is one `h1`, then `h2` per section, `h3` for subsections; no orphan `<label>`
- [ ] Verdict transitions announced exactly once by a screen reader; no announcements while polling
- [ ] Chart is undistorted and legible at 375 px; no letterboxing at 1280 px
- [ ] Invalid or empty manual BSSID produces a visible, announced error
- [ ] Standalone touch targets >= 44 px; in-table controls >= 36 px
- [ ] Privacy copy appears exactly once (footer)
- [ ] No `animate-ping` under `prefers-reduced-motion: reduce`
- [ ] Disabled buttons are visually distinct from enabled buttons
- [ ] No information is conveyed only by a `title` attribute
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx vite build --outDir .tmp-build` exits 0
- [ ] Manual QA matrix (7.2) passes

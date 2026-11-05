# AI Slop Audit Report — wifi-roaming-signal-analyzer

**Scope:** `src/` (25 files, ~3,171 lines)  
**Date:** 2026-11-05  
**Guide:** AI Slop Inspection Guide (repo-local)  
**Result:** TypeScript compiles cleanly (`tsc --noEmit` exit 0). No TODO/FIXME/HACK comments. No `eslint-disable` directives. Build artefact (`dist/`) contains no unresolved `@media --` constructs.

This is an audit-only pass: no source files were modified. Findings are grouped by rule number per the guide's schema.

---

## Executive summary

- **High:** 2 (swallowed errors in `storage.ts`)
- **Medium:** 6 (inconsistent error handling, duplicated logic, bloat, type-safety theater, async boundary, dead code)
- **Low:** 5 (trivial comments, hardcoded values, indirection, React state staleness, unused export)

No 🔒 security-sensitive findings: the app is a client-side-only tool with no auth/ownership/deletion flows beyond `localStorage`.

---

### Rule #2 — Swallowed errors 🔴 High

#### #2.1 — `loadRegistry` swallows parse/storage failures
- **File:** src/lib/storage.ts
- **Line(s):** 39–41
- **Severity:** 🔴 High
- **Snippet:** `} catch { return {}; }`
- **Verdict:** slop
- **Action:** flagged for follow-up
- **Mechanism verified against source:** `loadRegistry` wraps `JSON.parse` + `localStorage.getItem`; on any throw (corrupt JSON, private-mode storage) it returns `{}`, silently discarding a possibly-recoverable registry. There is no log and no user signal.

#### #2.2 — `saveRegistry` swallows write failures
- **File:** src/lib/storage.ts
- **Line(s):** 47–49
- **Severity:** 🟡 Medium
- **Snippet:** `catch { /* ignore */ }`
- **Verdict:** slop (intentional silence, but no log)
- **Action:** flagged for follow-up
- **Mechanism verified against source:** `localStorage.setItem` can throw on quota/private mode; the empty catch means a failed save is indistinguishable from success. At minimum a `console.warn` is warranted.

### Rule #4 — Dead / unreachable code 🔴 High

#### #4.1 — `bandFromFreq` exported but never used
- **File:** src/lib/signal.ts
- **Line(s):** 45–50
- **Severity:** 🟡 Medium
- **Snippet:** `export function bandFromFreq(freqMhz: number): Band { … }`
- **Verdict:** slop
- **Action:** flagged for follow-up
- **Mechanism verified against source:** `rg "bandFromFreq"` across `src/` returns zero callsites; only its own definition. Safe to delete or wire into a future freq-based path.

### Rule #5 — Hardcoded values that bypass the design system ⚪ Low

#### #5.1 — Chart palette and geometry are raw literals
- **File:** src/components/LiveHistoryChart.tsx
- **Line(s):** 7, 15–16, 83–88
- **Severity:** ⚪ Low
- **Snippet:** `const PALETTE = ["#6366f1", …]; const Y_MIN = -95; … const W = 640;`
- **Verdict:** intentional (no design-token system exists in this repo; colours are chart-specific)
- **Action:** left as-is (reason: repo has no `COLORS`/`SPACING` tokens — `src/utils/constants.js` does not exist here; raw values are the project's convention)

#### #5.2 — Signal bar heights are magic numbers
- **File:** src/components/SignalBars.tsx
- **Line(s):** 16
- **Severity:** ⚪ Low
- **Snippet:** `style={{ height: \\"${6 + i * 4}px\\" }}`
- **Verdict:** slop (cosmetic)
- **Action:** flagged for follow-up

### Rule #6 — Indirection with zero added logic 🟡 Medium

#### #6.1 — `apDisplayName` is a zero-logic alias
- **File:** src/lib/labels.ts
- **Line(s):** 27–29
- **Severity:** ⚪ Low
- **Snippet:** `export function apDisplayName(registry, ap) { return bssidDisplayName(registry, ap.bssid); }`
- **Verdict:** slop (single-expression wrapper adding no transformation/error handling)
- **Action:** flagged for follow-up (could be inlined at the 4 callsites, but churn is low value)

### Rule #7 — Inconsistent error-handling patterns 🟡 Medium

#### #7.1 — Storage module handles errors inconsistently
- **File:** src/lib/storage.ts
- **Line(s):** 9–72 (whole module)
- **Severity:** 🟡 Medium
- **Snippet:** `loadRegistry` wraps in try/catch; `loadCurrentFloor`/`loadCurrentBuilding`/`loadConnected` do not; `saveRegistry` wraps; `saveCurrentFloor`/`saveCurrentBuilding`/`saveConnected` do not.
- **Verdict:** slop
- **Action:** flagged for follow-up
- **Mechanism verified against source:** reading `storage.ts` top-to-bottom confirms the asymmetry; sibling loaders (`loadCurrentFloor` etc.) call `localStorage.getItem` with no guard, so a thrown storage access on one path but not another.

### Rule #9 — Duplicated logic instead of reuse 🟡 Medium

#### #9.1 — Floor/building set derivation duplicated
- **File:** src/components/Dashboard.tsx (L55–63) and src/components/RegistryManager.tsx (L104–112)
- **Severity:** ⚪ Low
- **Snippet:** `Object.values(registry).forEach((e) => { e.floor && f.add(e.floor); … })`
- **Verdict:** slop (near-identical blocks)
- **Action:** flagged for follow-up (extract a shared helper if a third callsite appears)

### Rule #12 — Type-safety theater 🔴 High (TypeScript)

#### #12.1 — Non-null assertion on `document.getElementById("root")`
- **File:** src/main.tsx
- **Line(s):** 6
- **Severity:** ⚪ Low
- **Snippet:** `createRoot(document.getElementById("root")!).render(…)`
- **Verdict:** intentional (standard Vite bootstrap; element guaranteed by `index.html`)
- **Action:** left as-is (reason: conventional and safe given the HTML template)

#### #12.2 — Casts to `Band` / `PermissionName` without runtime validation
- **File:** src/components/Dashboard.tsx (L74) and src/lib/live.ts (L178)
- **Severity:** ⚪ Low
- **Snippet:** `lastSeenBand[bssid] as Band`; `name: name as PermissionName`
- **Verdict:** slop (minor; values originate from controlled internal data, low risk)
- **Action:** flagged for follow-up

### Rule #13 — React-specific slop 🟡 Medium

#### #13.1 — `useState(defaultSsid)` initialises once and can drift
- **File:** src/components/Dashboard.tsx
- **Line(s):** 43–46
- **Severity:** ⚪ Low
- **Snippet:** `const [ssid, setSsid] = useState(defaultSsid); const activeSsid = ssids.includes(ssid) ? ssid : defaultSsid;`
- **Verdict:** intentional (the `activeSsid` fallback already guards against stale state)
- **Action:** left as-is (reason: fallback handles the drift; not a bug)

### Rule #14 — File / module bloat 🟡 Medium

#### #14.1 — `ScanImport.tsx` mixes many responsibilities
- **File:** src/components/ScanImport.tsx
- **Line(s):** 1–467 (467 lines)
- **Severity:** ⚪ Low
- **Snippet:** (whole file)
- **Verdict:** slop (correlate, not a defect by itself)
- **Action:** flagged for follow-up (split into status/bridge/paste sections if it grows further; currently under the 500-line guideline)

### Rule #15 — Async boundary bugs 🔴 High

#### #15.1 — `dropFile` does not handle `file.text()` rejection
- **File:** src/components/ScanImport.tsx
- **Line(s):** 56–58
- **Severity:** ⚪ Low
- **Snippet:** `const dropFile = async (file: File) => { onParsedText(await file.text()); };`
- **Verdict:** slop (unhandled rejection on read failure; no user feedback)
- **Action:** flagged for follow-up
- **Mechanism verified against source:** `dropFile` awaits `file.text()` with no try/catch; a failed read becomes an unhandled rejection. Low impact because drag-drop of a readable text file is the common path.

### Rule #1 — Trivial / narrative comments ⚪ Low

#### #1.1 — Restating comments in `App.tsx`
- **File:** src/App.tsx
- **Line(s):** 63, 99, 133
- **Severity:** ⚪ Low
- **Snippet:** `/** Append one scan to APs + history … */`, `/** Core ingest: … */`, `// Detect connection changes: …`
- **Verdict:** slop (cosmetic; comments restate the function/variable names)
- **Action:** flagged for follow-up

---

## Not audited / out of scope

- **Rule #16 (build pipeline):** checked `dist/assets/*.css` for unresolved `@media --` constructs → 0 hits; no purge-safelist issues observed. Source CSS is a single `@import "tailwindcss"` line, so no manual media queries to audit.
- **Rule #8 (module-load side effects):** no top-level DOM writes or listeners found outside `main.tsx`.
- **Rule #10 (try/catch as control flow):** all `try` blocks guard genuinely fallible operations (JSON.parse, fetch, URL construction, permission queries).
- **Rule #11 (stale TODOs):** none present.

## Traceability

Every finding above is either scheduled for follow-up (flagged) or explicitly left as-is with a reason. No 🔒 security-sensitive findings exist in this codebase. No destructive changes were made.
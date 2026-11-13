# Implementation Plan: Hide Transport/Implementation Details in UI

Date: 2026-11-13  
Related: `todo/tasteful-software-analysis.md` ("UI exposes implementation/transport concepts...")  
Status: Proposed (analysis/planning only)

## 1. Goal

Make Wi-Fi/Wired live-ingest feel "invisible by default" while preserving all platform-required setup and recovery paths for Windows/local-first/browser constraints.

## 2. Scope

In scope (primary UI + user-facing messages):
- `src/components/ScanImport.tsx`
- `src/components/WiredPanel.tsx`
- `src/components/ui/Header.tsx`
- `src/lib/live.ts` (user-facing `LiveSourceError`/picker/error text)
- `src/lib/useLiveWatch.ts`, `src/lib/useWiredWatch.ts` (fallback error copy)
- `src/App.tsx` (plumbing needed to stop surfacing format/debug info)
- Optional copy alignment: `README.md` only if UI terminology changes materially (keep technical details in docs)

Out of scope:
- Changing scan/wired file formats, parser behavior, URL/query bootstrap mechanisms, or local bridge protocol (must remain compatible with existing launchers/scripts).
- Reworking core product scope (wired subsystem) beyond presentation of its setup/transport details.
- Non-Windows platform support.

## 3. Principles / UX Contract

- **Intent first:** show task state and next action (Running / Waiting / Offline / Not connected, Connect/Download/Open Dashboard), not plumbing.
- **Progressive disclosure:** transport specifics (filenames, loopback address/token, query params, PowerShell commands, file picker mechanics) live under "Advanced setup" / "Troubleshooting" / "Details", collapsed by default.
- **Contextual surfaces:** show only the path relevant to current mode (`live.auto`, `live.bridge`, hosted unconnected, manual fallback). Avoid presenting all modes at once.
- **Actionable recovery:** permission/connect errors explain what to do in plain language; technical reason available on demand.
- **Debug data internalized:** parser/scan `format` kept in state/logic if needed, but not rendered (including sr-only/paste previews) except developer diagnostics.
- **Preserve fallbacks:** manual command, file pick/drop, and paste remain available; never remove a recovery path to gain simplicity.

## 4. Current Touchpoints (inventory)

| Area | Exposed detail | Location |
|---|---|---|
| Wi-Fi setup | `scan.txt`, PowerShell/`netsh` loop, file picker naming, bridge on `127.0.0.1` + random token, "scanner detected", local-network/loopback permission wording | `src/components/ScanImport.tsx` |
| Wired setup | `wired.txt`, `?wired=` URL note, portable bridge writes `wired.txt` only, LLDP capture timing/availability messaging mixed with transport | `src/components/WiredPanel.tsx` |
| Header | `Scan format: {format}` (sr-only) | `src/components/ui/Header.tsx`, prop from `src/App.tsx` |
| Live errors/picker | Mentions dev server, `scan.txt`, scanner window, pick file again; picker description names `scan.txt` | `src/lib/live.ts`, `src/lib/useLiveWatch.ts`, `src/lib/useWiredWatch.ts` |
| Paste preview | Shows parser `format` labels | `ScanImport.tsx`, `WiredPanel.tsx` |
| Bootstrap | `?live`/`?wired` params and tokenized loopback URLs required | `src/lib/live.ts`, launchers/`bridgeBat.ts` (no UI mention needed except advanced docs) |

## 5. Implementation Phases

### Phase 0 — Design decisions & copy spec (small, unblocker)
- Define canonical user-facing vocabulary: "local scanner", "live readings", "this computer only", "allow browser to connect to local scanner", "manual setup (advanced)".
- Decide "Details" container pattern (reuse existing card/details styles) and where it appears per panel.
- Classify terms: **hide by default** (filenames, paths, IPs, tokens, query params, commands, parser format names) vs **domain/acceptable** (e.g. Wi-Fi access point, switch/port/VLAN/LLDP as wired findings — keep, but avoid transport mechanics like capture script/file names in primary copy).
- **Exit criteria:** agreed copy map for each state (idle/waiting/live/offline/error/permission denied|prompt, hosted bridge, local auto, manual).

### Phase 1 — Contextual, state-first setup surfaces
**Files:** `src/components/ScanImport.tsx`, `src/components/WiredPanel.tsx`

- Refactor cards into a primary status + single CTA region driven by mode:
  - `live.auto`/local launcher: "Live readings are on" (or start/restart) — no hosted download, no PowerShell, no file name.
  - `live.bridge` (hosted portable): primary "Download scanner" / "Connect scanner" flow; hide `127.0.0.1`, token, and `scan.txt` text; mention "stays on this computer" generically.
  - Hosted, no bridge source: show "Use local scanner" path; move manual paste/file to secondary.
  - Manual/fallback: "Advanced setup" disclosure containing command, file picker/drop, and paste.
- Keep existing `scannerLive/scannerOffline/scannerWaiting` logic; simplify status cards to one clear message + CTA (e.g. offline: "Live readings stopped. Last scan still shown. Reconnect when ready.").
- Wired: mirror state-first treatment; move `?wired=` note and "writes wired.txt only" into advanced/troubleshooting details; keep LLDP *result* prominent but de-emphasize capture mechanics except when waiting/failing (plain "Waiting for switch information..." with optional details).

**Acceptance:** default view for a launcher-opened session shows no filenames/commands/URLs/IPs/tokens; manual recovery remains reachable in ≤2 interactions.

### Phase 2 — Progressive disclosure componentization (lightweight)
**Files:** `src/components/ScanImport.tsx`, `src/components/WiredPanel.tsx`, optionally small shared UI helper in `src/components/ui/` if duplication is high

- Extract or add a consistent "Advanced setup & troubleshooting" expandable section containing:
  - PowerShell/`netsh` loop and "keep window open" instructions.
  - File-picker prompt ("Choose the scan file created by the scanner") without hardcoding `scan.txt` in primary label where possible.
  - Hosted/bridge technical note (local-only, permission prompt) and, if needed for trust, a short inspectable detail line (kept collapsed).
  - `?live`/`?wired`/source diagnostics for support scenarios.
- Ensure mobile/keyboard accessibility (button/summary semantics, focus, min target sizes consistent with existing UI).

**Acceptance:** all previously exposed transport strings still present but only inside collapsed advanced/troubleshooting UI (or docs), not in primary flow.

### Phase 3 — Errors, permissions, and metadata cleanup
**Files:** `src/lib/live.ts`, `src/lib/useLiveWatch.ts`, `src/lib/useWiredWatch.ts`, `src/components/ScanImport.tsx`, `src/components/WiredPanel.tsx`, `src/components/ui/Header.tsx`, `src/App.tsx`

- **Errors:** refactor `LiveSourceError` usage to carry user-facing message + optional technical detail (e.g. structured error or `cause`/detail string). Primary UI shows action-first copy; "Details" reveals underlying reason (HTTP status, reachability, file access) without leading with filenames/URLs.
  - Examples: bridge unreachable → "Can't connect to the local scanner. Make sure the scanner window is open, then try again." Detail may include request failed/dev-server note.
  - Lost file access → "Live readings were interrupted. Reconnect the scanner." (manual picker path only when relevant).
- **Picker:** change `showOpenFilePicker` description/labels in `live.ts` to generic "Scanner output" while keeping accepted extensions.
- **Permissions:** replace "Allow Local network / Loopback access in the browser's site settings" primary text with plain-language prompt; keep specific permission names in details for Chrome/Edge troubleshooting.
- **Parser format:** remove `Scan format` sr-only from header and format badges/labels from paste previews (`ScanImport.tsx` "Ready: {res.format}", `WiredPanel.tsx` "Preview: {pastePreview.format}") in favor of success/failure states (e.g. "Scan recognized • N access points"). Stop passing `format` to `Header` if unused; keep parser return values intact for internal logic.
- **Hooks:** align `useWiredWatch` with live staleness semantics only if needed for consistent messaging (optional, but review for "offline" clarity).

**Acceptance:** no filenames, IPs, tokens, query params, PowerShell, or parser format strings visible in default UI states; diagnostics still explain failures.

### Phase 4 — Verification, docs, and polish
**Files:** all touched + `README.md` (optional)

- Manual test matrix:
  1. `start-wifi.bat` / local `?live=scan.txt` flow: auto-live, waiting, live, stale/offline, recovery.
  2. Hosted/portable bridge: download/connect, permission prompt, permission denied, scanner closed/unreachable.
  3. Manual: file picker, drag/drop, paste (valid/invalid) — no format label, clear success/error.
  4. Wired parallels: `start-wired.bat`, `?wired=`, bridge connect, no-link/unavailable, LLDP waiting/received/not received, paste/file.
  5. Regression: dashboard verdict/history still updates; registries persist; header badges/states correct.
- A11y pass: status announcements (`aria-live`) remain meaningful without transport jargon; details controls labeled.
- Docs: if UI terms change, add/adjust a short troubleshooting note in README (technical details belong there, not primary UI).
- Build/typecheck: run project scripts if available (`npm run build`).

**Acceptance:** UX contract in §3 met across modes; no functional regressions in ingest.

## 6. Suggested File-Level Task List

1. `ScanImport.tsx` — split/mode-gate sections; introduce collapsed Advanced/Troubleshooting; rewrite copy; replace format preview with recognized/parsed summary.
2. `WiredPanel.tsx` — same treatment; separate domain LLDP status from transport/capture mechanics; remove `?wired=`/`wired.txt` from primary text.
3. `Header.tsx` + `App.tsx` — remove format display plumbing/prop if redundant.
4. `live.ts` — generic picker description; structured/clearer `LiveSourceError` messages with separable detail.
5. `useLiveWatch.ts`, `useWiredWatch.ts` — align fallback error copy with plain-language + recoverable actions.
6. (Optional) `src/components/ui/Disclosure` or similar — only if it reduces duplication/keeps consistency.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hiding details makes power-user/trust debugging harder | Keep full details in collapsible troubleshooting and README; include "what's happening" facts (local-only, no upload) plainly. |
| Mode detection edge cases show wrong CTA | Drive UI strictly from existing flags (`auto`, `bridge`, `available`, `supported`, `watching`, `stale`, `error`, `permission`); test matrix covers all. |
| Over-hiding domain terms in wired view | Preserve switch/port/VLAN/LLDP findings; only hide file/URL/script/token mechanics. |
| Error refactor breaks existing handling (`instanceof LiveSourceError`) | Preserve class/contract; extend non-breakingly (message + optional detail). |

## 8. Effort / Sequencing (rough)

- Phase 0: 0.5 day (copy/UX decisions)
- Phase 1–2: 1–1.5 days (UI restructuring + disclosure)
- Phase 3: 0.5–1 day (errors/metadata plumbing)
- Phase 4: 0.5 day (verification/polish)

Total: ~2.5–3.5 focused dev days, incremental and shippable by phase.

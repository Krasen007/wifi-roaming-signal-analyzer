# FloorScope — Taste Decisions & Recommendations

## Decision Log

### Decision 1: Remove the Channels Tab
**Status:** Proposed
**Taste principle:** Necessity, Externalities, Coherence, Omission

**Problem:** The Channels tab is a full navigation destination for channel congestion analysis. This is adjacent to the core problem ("which floor am I on?") but not essential to it.

**Taste argument:**
- The core theory is: BSSID → physical location → floor detection
- Channel congestion is useful for network planning, not for floor detection
- Building a dedicated tab costs: a nav button, a new component, an empty state, and user attention
- The value (channel info) is already partially visible on the dashboard (channel shown on each AP card)

**Recommendation:** Fold channel information into the Dashboard. Each AP card already shows its channel. Add a small channel congestion indicator to the "Best AP" hero card. Remove the Channels tab entirely.

**Omission trade-off:** By removing the Channels tab, we omit a standalone channel analysis view. But the information is still accessible on each AP card, and the core experience is faster and more focused.

---

### Decision 2: Show All Devices in DevicesPanel, Not Just Multi-SSID
**Status:** Proposed
**Taste principle:** Necessity, Calibration, Unarticulated Need

**Problem:** The DevicesPanel filters to only show devices with multiple SSID members. When all nearby APs are single-SSID devices, the panel shows "Physical devices (1)" with no content — a confusing empty state.

**Taste argument:**
- Users need to see all physical devices, not just multi-SSID ones
- A single-SSID device is still a physical device that matters for floor detection
- The panel exists to answer "what hardware am I near?" — this question applies to all devices
- The `void registry` dead parameter suggests the component was partially refactored

**Recommendation:** Remove the `multi` filter. Show all devices in the panel. Multi-SSID devices get a visual highlight (the D-number badge). The explanatory text should adapt: "Each nearby device is listed below" when there are no multi-SSID groups.

---

### Decision 3: Remove Hardcoded Registry Suggestions
**Status:** Proposed
**Taste principle:** Defaults, Unarticulated Need, Omission

**Problem:** RegistryManager hardcodes default suggestions like "Basement", "Ground floor", "HQ", "Branch office A". These impose the developer's vocabulary on the user's building.

**Taste argument:**
- The app should serve the user's building names, not the other way around
- "HQ" assumes a corporate environment; a university, hospital, or home has different vocabulary
- Free-text inputs with datalist suggestions are fine, but the defaults should be empty
- Letting users define their own vocabulary is more tasteful than providing ours

**Recommendation:** Remove all hardcoded suggestions from `floorSuggestions` and `buildingSuggestions`. The datalist should only contain values the user has already entered. The empty state should say "Type to add a building/floor" instead of suggesting ours.

---

### Decision 4: Simplify LiveHistoryChart
**Status:** Proposed
**Taste principle:** Calibration, Externalities, Coherence

**Problem:** The LiveHistoryChart is 276 lines of SVG with manual scaling, gap connectors, focus modes, and click-to-isolate. This is excessive complexity for what is fundamentally a signal-over-time chart.

**Taste argument:**
- The core information is: "how has my signal changed over time?"
- Gap connectors (dotted lines for out-of-range APs) are a nice-to-have, not essential
- Focus mode (clicking to isolate one AP) adds interactivity but the chart already shows all APs
- The 6-series cap suggests the complexity was anticipated but not needed
- The manual SVG scaling means the chart doesn't adapt to different container sizes well

**Recommendation:** Remove the focus mode and gap connectors. Keep the solid line chart with end markers and connected AP rings. The chart should simply show signal history for all APs on the active SSID, with the connected AP highlighted. Reduce complexity from 276 lines to ~120 lines.

---

### Decision 5: Split Dashboard into Sub-Components
**Status:** Proposed
**Taste principle:** Coherence, Execution, Invisible Design

**Problem:** Dashboard.tsx is 489 lines handling SSID selection, building/floor inputs, hero card, roaming detection, roam event log, history chart, device panel, same-SSID ranking, and other networks.

**Taste argument:**
- Each section has a distinct job and should be its own component
- A 489-line component is hard to navigate, test, and modify
- The component's single responsibility should be "compose the dashboard" — not implement every section
- Sub-components make the taste decisions more visible and reversible

**Recommendation:** Extract into sub-components:
- `DashboardControls` — SSID selector, building/floor inputs
- `SignalHero` — best AP card with quality indicator
- `RoamPanel` — connected AP selector, sticky-client warning, roam events
- `AllApsList` — ranked AP cards with trend indicators
- `OtherNetworks` — adjacent APs on different SSIDs

The Dashboard component becomes a composition of these parts. Each part can be tasted independently.

---

### Decision 6: Remove the "Load Sample Data" Button
**Status:** Proposed
**Taste principle:** Necessity, Omission, Unarticulated Need

**Problem:** The `SAMPLE_NETSH` constant and "Load sample data" button in ScanImport invite users to play with fake data instead of their real environment.

**Taste argument:**
- The sample data serves the developer (testing), not the user
- Users who click "Load sample data" are not learning how to use FloorScope with their real scan.txt
- The sample creates a false first impression — users think the app is a demo, not a tool
- The real first experience should always be with their own data

**Recommendation:** Remove the sample data button and the `SAMPLE_NETSH` constant from the user-facing UI. Keep the sample data in tests only. The empty state should direct users to run the scan loop — no shortcut to fake data.

---

### Decision 7: Remove the Service Worker
**Status:** Proposed
**Taste principle:** Necessity, Externalities

**Problem:** `index.html` registers a service worker (`sw.js`). FloorScope is a browser-only tool that reads local files. There's no need for offline caching, push notifications, or background sync.

**Taste argument:**
- The app's data is already local — scan.txt never leaves the PC
- The service worker adds complexity without serving the core problem
- It could cause stale-cache issues if the service worker caches old scan data
- For a tool that runs entirely in-browser, a service worker is unnecessary surface area

**Recommendation:** Remove the service worker registration and `sw.js`. If offline capability is ever needed, it should be a deliberate taste decision, not a default inclusion.

---

### Decision 8: Remove `vite-plugin-singlefile`
**Status:** Proposed
**Taste principle:** Necessity, Externalities, Calibration

**Problem:** The project uses `vite-plugin-singlefile` to produce a single HTML file build. This adds build complexity and a dependency for a distribution model that may not be needed.

**Taste argument:**
- FloorScope is an internal tool (the user starts it with `start.bat`)
- It doesn't need to be distributed as a single HTML file
- The standard Vite build produces static files that work fine served by any web server
- The single-file plugin adds a dependency and potential maintenance burden

**Recommendation:** Remove `vite-plugin-singlefile`. Use the standard Vite build. The `start.bat` already handles the dev server workflow; the build output can be served the same way.

---

### Decision 9: Merge `DevicesPanel` Dead Code
**Status:** Proposed
**Taste principle:** Coherence, Execution

**Problem:** `DevicesPanel` accepts a `registry` prop but immediately does `void registry;`. This dead parameter is a code smell indicating a refactoring that left behind an interface.

**Taste argument:**
- Every interaction should feel considered — a dead parameter is the opposite of that
- The `registry` was likely used for device display names before the component was simplified
- Keeping dead code signals that the product's design evolved without fully committing to the new direction

**Recommendation:** Remove the `registry` prop from `DevicesPanel` entirely. If device names need registry data, pass only the specific fields needed (e.g., a `labels` map) rather than the entire registry object.

---

## The Tasteful Path Forward

The core product — FloorScope as a WiFi floor-roaming analyzer — is already tasteful. The BSSID-as-truth theory is a clear point of view. The sticky-client detection serves an unarticulated need. The privacy-first stance is a coherent argument.

The main work is **subtraction**: remove the Channels tab, remove sample data, remove hardcoded suggestions, simplify the chart, split the dashboard, remove unnecessary plugins. Each subtraction brings the product closer to its essential thesis: **"Which floor am I on, and am I connected to the right AP?"**

After subtraction, the product shape should be:
1. **Import tab** — scan loop, file watch, paste. The critical path.
2. **Dashboard** — hero card (best AP, signal, location), roam detection, all-AP ranking, history chart (simplified), physical devices (all of them).
3. **Registry tab** — BSSID → building/floor/name mapping. The truth layer.

Three tabs. Three things. One theory. That's tasteful.

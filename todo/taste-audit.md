# FloorScope — Taste Audit

## Core Problem

FloorScope solves one problem: **when all WiFi APs share the same SSID, you can't tell which physical AP you're connected to, so you can't tell which floor you're on.** The app parses `netsh wlan` output, tracks signal history, and detects sticky-client roaming problems.

This is a clean, singular problem statement. The product has a coherent theory about its problem domain: **BSSID is the truth, SSID is the lie.**

---

## Taste Sayings (What's Working)

### 1. The Core Abstraction is Tasteful
The registry maps **BSSID → building/floor/name**. Since all APs broadcast the same SSID, BSSID is the only reliable identifier. This is a bold, correct taste decision — the entire product is built on this one insight.

### 2. Device Grouping by BSSID Middle Octets
Grouping radios by the middle 4 octets of their BSSID (ignoring the first and last) is a heuristic that reveals physical devices from BSSID data alone. This serves an **unarticulated need** — users don't know they're looking at 5 APs when they're really looking at 2 devices with 3 SSIDs each.

### 3. The Scan Loop + File Watch Pattern
Browsers can't scan WiFi directly. The `start.bat` + PowerShell loop + file watch architecture is the minimum viable solution. It's not elegant, but it's the exact minimum required to make the core problem solvable. No abstraction for other formats, no mock data modes beyond a sample — taste is present here.

### 4. Privacy-First by Default
"FloorScope runs entirely in your browser. scan.txt never leaves your PC." This is not a feature — it's a **point of view**. The app makes a clear argument about how the world should work: your WiFi data stays on your machine.

### 5. Empty State is Welcoming
The dashboard and channels tab both show clear, instructive empty states with actionable guidance ("Open Live setup, start the PowerShell loop..."). The first ten seconds feel effortless because the user knows exactly what to do.

### 6. Single Point of Start
`start.bat` starts the scan loop, dev server, and app in live mode in one click. This removes all friction from the critical path. The `?live=scan.txt` URL parameter is a tasteful convention — no file picker, no permission prompts.

### 7. Sticky-Client Detection Serves Unarticulated Need
Users don't know they have sticky client problems. The app detects when you're connected to a weaker AP when a stronger one is available and alerts you. This is exactly the kind of unarticulated need the Taste guide calls for.

### 8. Defaults are Considered
The signal quality tiers (Excellent/Good/Fair/Weak/Poor at -55/-65/-72/-80 dBm) are calibrated defaults. The 5-second scan interval matches typical PowerShell loop cadence. The 120-point history cap balances visibility with performance.

---

## Taste Failures (What's Off-Calibration)

### 1. The Channels Tab is Feature Bloat
The Channels tab shows channel congestion. This is **adjacent** to the core problem but not essential to it. The core problem is "which floor am I on?" — channel interference is a nice-to-have that increases surface area without serving the central theory.

**Taste test:**
- Necessity: Not essential to solving which floor you're on
- Externalities: Adds a whole tab, a new chart component, and UI complexity
- Coherence: Doesn't align with the "BSSID is truth" theory
- Omission: By building this, we omit the opportunity to deepen the dashboard

**Recommendation:** Fold channel info into the dashboard (it's already referenced in the "Best AP" card). Remove the dedicated tab.

### 2. Devices Panel Shows Only Multi-Device Groups
The `DevicesPanel` returns `null` when there are no multi-device groups. Single-device APs are invisible in this panel. This creates a confusing gap — the dashboard shows all APs, but the "Physical devices" panel only shows devices with multiple SSIDs.

**Taste test:**
- Necessity: The grouping heuristic only matters when there are multi-SSID devices, but the panel's existence implies it should show all devices
- Externalities: Hides information that users may want to see
- Calibration: The panel should show all devices, with multi-SSID ones highlighted

### 3. RegistryManager Hardcoded Default Suggestions
The RegistryManager hardcodes default suggestions like "Basement", "Ground floor", "1st floor", "HQ", "Branch office A". These are **imposed taste decisions** that may not serve the user's actual buildings.

**Taste test:**
- Unarticulated need: Users may work in buildings with names like "The Annex" or "Lab Wing C"
- Coherence: Free-text inputs with datalist suggestions is fine, but the defaults should be empty — let the user define their own vocabulary
- Omission: By providing defaults, we're choosing what the user's world looks like

### 4. LiveHistoryChart is Over-Engineered
The `LiveHistoryChart` component has ~276 lines of SVG code with manual scaling, gap connectors, focus modes, click-to-isolate, gap links, and color palette hashing. For a signal history chart, this is excessive complexity.

**Taste test:**
- Necessity: Focus mode and gap connectors are nice but not essential
- Externalities: 276 lines of SVG for what could be a simpler visualization
- Calibration: The core information (signal over time) could be conveyed with less visual complexity
- The `PALETTE` array of 6 colors and the `colorFor` hash function suggest the chart will need more than 6 APs eventually — but it already limits to 6 series

### 5. Dashboard.tsx is a 489-Line God Component
The Dashboard component handles: SSID selection, building/floor inputs, signal hero card, roaming detection, roam event log, history chart, device panel, same-SSID ranking, and other networks. This is too much for one component.

**Taste test:**
- Coherence: Each section has a distinct job
- Externalities: 489 lines makes the component hard to navigate, modify, and test
- The component is doing the work of at least 4 sub-components

### 6. DevicesPanel Has `void registry` — Dead Parameter
The `DevicesPanel` component accepts a `registry` prop but immediately does `void registry;`, effectively ignoring it. This is a code smell indicating that a feature was partially removed or refactored without cleaning up the interface.

### 7. The `DevicesPanel` Only Shows Multi-Device Groups
The panel filters `devices.filter((d) => d.members.length > 1)`. Single-SSID devices are completely invisible. Users see "Physical devices (1)" with no content — a confusing empty state.

### 8. ScanImport Has a Hardcoded Sample
`SAMPLE_NETSH` is a real-world example baked into the code. While useful for testing, it's a sample that serves the developer more than the user. The "Load sample data" button invites users to play with fake data instead of their real environment.

---

## Anti-Pattern Assessment

### Feature Factory Risk: MEDIUM
The app has 4 tabs (Dashboard, Import, Registry, Channels). The Channels tab is the primary risk — it adds a full navigation item, a chart component, and a new empty state for what is essentially a secondary analysis feature. The Registry tab is essential (it's the registry of physical APs). The Import tab is the critical path.

### The CRUD App Risk: LOW
FloorScope is not a CRUD app — it has a clear analytical purpose. The registry is a supporting feature, not the main value proposition.

### The Aesthetic-Only Product Risk: LOW
The app has genuine analytical depth (signal history, device grouping, sticky-client detection). The Tailwind styling serves the data, not the other way around.

### The Data-Driven Without Vision Risk: MEDIUM
The app collects a lot of data (signal history, roam events, channel congestion) but the vision is clear: "which floor are you on?" The data serves this vision. However, the Channels tab and the complexity of the history chart risk expanding the data collection without a corresponding expansion of the vision.

### The Everything Machine Risk: MEDIUM
The app has: signal history charts, channel congestion charts, device grouping, roam detection, registry management, live scanning, paste input, drag-and-drop, sample data, and a full Windows launcher. Each feature is individually justified, but collectively they create a surface area that may exceed the core problem's scope.

---

## Summary Scorecard

| Principle | Score | Notes |
|-----------|-------|-------|
| Core problem clarity | ✅ Excellent | "Which floor am I on?" is unambiguous |
| Feature necessity | ⚠️ Good with concerns | Channels tab is the main offender |
| Default calibration | ⚠️ Good with concerns | Hardcoded suggestions in registry |
| Empty state | ✅ Excellent | Clear, instructive, welcoming |
| First ten seconds | ✅ Excellent | start.bat makes it instant |
| Coherence | ⚠️ Good | BSSID theory is strong; channels tab weakens it |
| Point of view | ✅ Excellent | Privacy-first, BSSID-as-truth |
| Design by subtraction | ⚠️ Partial | Channels tab and sample data are additions, not subtractions |
| Unarticulated needs | ✅ Excellent | Sticky-client detection, device grouping |
| Invisible design | ⚠️ Partial | Dashboard is complex but functional |

**Overall: Tasteful with a few bloat risks.** The core product is excellent. The main risk is the Channels tab and the complexity of the LiveHistoryChart. The app should consider whether these features earn their place or whether the dashboard can absorb their value without the surface area cost.

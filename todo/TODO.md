# FloorScope — Comprehensive Audit, Taste Decisions & Roadmap

> **Core Philosophy:** *BSSID is truth, SSID is a lie.*
> When all enterprise or campus access points broadcast the same SSID, client devices cannot distinguish which physical radio they are attached to. FloorScope resolves this by anchoring location and roaming intelligence to physical BSSIDs rather than virtual network names.

---

## 1. Executive Summary & Codebase Reality Check

This document consolidates and supersedes all prior audit notes, taste checklists, omission proposals, and status logs (`taste-audit.md`, `taste-decisions.md`, `omissions-and-subtractions.md`, and `anti-pattern-checklist.md`).

A deep-dive audit of the current codebase reveals both successfully implemented subtractions and discrepancies between prior documentation claims and the actual state of the source tree.

### 1.1 Verified Implemented Subtractions
- **Channels Tab Removed from Navigation:** `App.tsx` now exposes exactly three tabs (`dashboard`, `import`, `registry`). The Channels tab is completely removed from navigation.
- **Sample Data Removed:** The "Load sample data" button, `SAMPLE_NETSH` fixture, and `sample.ts` module have been removed from the user interface and codebase.
- **Hardcoded Registry Suggestions Removed:** Hardcoded building/floor lists ("HQ", "Basement", "Branch office A") were purged. Datalist autocompletion in `RegistryManager.tsx` now derives dynamically only from values the user has already entered.
- **Service Worker Purged:** Offline worker registration (`sw.js` and script tags in `index.html`) has been deleted. The app functions strictly as a local client.
- **Single-File Plugin Removed:** `vite-plugin-singlefile` was excised from `package.json` and `vite.config.ts`. The standard Vite production preview build pipeline is used.
- **Registry `note` Field Removed:** The extraneous `note` property was removed from `RegistryEntry` (`src/lib/types.ts`) and `RegistryManager.tsx`.
- **DevicesPanel Modernized:** Shows all nearby hardware units (not just multi-SSID radios), highlighting devices sharing physical hardware (D-numbers). Dead `registry` prop and `void registry;` statements have been eradicated.

### 1.2 Discrepancies & Unfinished Items (Found in Codebase Audit)
1. **Unsplit Dashboard God Component:** Prior documentation claimed `Dashboard.tsx` had been decomposed into `DashboardControls.tsx`, `AllApsList.tsx`, and `OtherNetworks.tsx` (~87 lines). **In reality, `Dashboard.tsx` is still an undivided 514-line monolithic component** implementing controls, hero verdict, roam logging, chart embedding, device list, same-network ranking, and other network lists in a single file.
2. **Orphaned Dead Component:** `src/components/ChannelChart.tsx` is still present on disk despite being unreferenced by any component or route.
3. **Over-Engineered Chart (Deferred):** `LiveHistoryChart.tsx` remains ~307 lines with complex SVG gap connectors, focus modes, and color palette hashing.

---

## 2. Taste Audit & Architectural Review

### 2.1 Taste Strengths (What Is Working)
1. **BSSID-as-Truth Abstraction:** Mapping physical MAC addresses directly to building/floor/location coordinates solves the core problem without needing infrastructure controller access.
2. **Hardware Disambiguation Heuristic:** Radios on the same physical hardware typically share their middle four octets (`src/lib/devices.ts`). Grouping BSSIDs into unified device units (`D1`, `D2`, etc.) reveals physical infrastructure topology without vendor APIs.
3. **Minimum Viable Ingestion Pipeline:** Browsers cannot natively poll local Wi-Fi radios. The tandem architecture—`start.bat` running PowerShell `netsh` scans into `scan.txt`, paired with the custom Vite middleware (`serveScanFile`) serving `scan.txt` with HTTP cache headers (`?live=scan.txt`)—provides automated live scanning with zero user prompts.
4. **Actionable Roaming & Sticky-Client Detection:** The application flags when a user is attached to an AP with significantly weaker signal (>= 8 dBm deficit) than a co-channel or same-SSID neighbor, and alerts when attached to an AP registered on a different floor or building.
5. **Strict Local Privacy:** Zero telemetric or network egress. All scan data stays entirely on localhost.

### 2.2 Taste Weaknesses & Anti-Pattern Risks
1. **The Feature Factory Temptation:** Prior additions (such as the Channels tab and sample data) added UI noise and cognitive overhead without answering the primary question: *"Which floor am I on, and am I attached to the right AP?"*
2. **God Component Density:** `Dashboard.tsx` handles multiple independent domains: network selection, building/floor inputs, hero scorecards, roaming logic, roam history lists, ranking, and neighbor networks.
3. **Dead Weight in Repository:** Unreferenced components (`ChannelChart.tsx`) create cognitive drag and maintenance ambiguity.

---

## 3. The Taste Decision Framework & Anti-Pattern Checklist

Before adding or modifying any feature, abstraction, or dependency, apply this checklist:

### 3.1 The 6-Question Taste Filter
1. **Necessity:** Does this directly solve the primary question (*"Which floor am I on, and am I connected to the right AP?"*)?
2. **Externalities:** Does this add new tabs, state flags, or visual complexity that distracts from the core workflow?
3. **Coherence:** Does it align with the core thesis that *BSSID is physical truth and SSID is a broadcast label*?
4. **Calibration:** Is the quantity of information optimal (e.g. 120 history samples, 5-second polling interval, -55/-65/-72/-80 dBm tiers)?
5. **Omission:** What are we deliberately choosing **not** to build (e.g. no cloud accounts, no protocol packet sniffers)?
6. **Unarticulated Need:** Does this address a genuine user problem that isn't solved by basic OS Wi-Fi pickers (e.g. sticky roaming, AP floor mismatch)?

### 3.2 Default Rules of Omission
- **Tabs:** Default to no new tabs. Keep the app bounded to three core tabs: Live Setup, Dashboard, AP Registry.
- **Data Fields:** Avoid expanding `RegistryEntry`. Keep fields limited to `bssid`, `building`, `floor`, and `location`.
- **Dependencies:** Reject extra charting or UI libraries. Native SVG and Tailwind keep the runtime lean and maintainable.
- **Mock/Sample Fixtures:** Keep sample fixtures strictly in test suites; the live app must always encourage inspecting real environments.

---

## 4. Master Consolidated Roadmap

### Phase 1: High Priority (Immediate Cleanup)
- [ ] **Delete Orphaned Component:** Remove unreferenced `src/components/ChannelChart.tsx`.
- [ ] **Decompose `Dashboard.tsx`:** Extract the 514-line monolithic component into clear, isolated units:
  - `DashboardControls.tsx`: SSID selection, current building/floor input fields, and live status badge.
  - `SignalHero.tsx`: Best AP card, signal strength, and dBm status.
  - `RoamPanel.tsx`: Sticky-client alerts, wrong floor/building alerts, connection selector, and roam event log.
  - `AllApsList.tsx`: Ranked table/cards of same-SSID access points with signal deltas.
  - `OtherNetworks.tsx`: Collapsed/compact view of adjacent SSIDs.

### Phase 2: Medium Priority (Chart Calibration)
- [ ] **Simplify `LiveHistoryChart.tsx`:**
  - Strip focus-mode toggles and complex gap link rendering if they cause visual clutter.
  - Maintain solid trend lines, connected AP ring indicator, and roam event tick marks.
  - Target: reduce file from ~307 lines to ~120-150 clean lines.

### Phase 3: Low Priority & Maintenance
- [ ] **Registry Export/Import:** Provide simple JSON export and import for transferring mapped AP registries between devices without backend infrastructure.
- [ ] **Calibration Verification:** Review signal tiers (-55, -65, -72, -80 dBm) and roam delta threshold (8 dBm) against Wi-Fi 6/6E/7 enterprise deployments.

---

## 5. Scope Boundaries (Strict Non-Goals)
- ❌ **No Cloud Sync or Accounts:** FloorScope remains an offline-first browser tool running against local `scan.txt`.
- ❌ **No Packet Sniffing / Monitor Mode:** Does not require specialized adapters or pcap drivers. Native `netsh` is the only requirement.
- ❌ **No Dedicated Channel Congestion Tab:** Frequency details are surfaced directly on individual AP cards where relevant, avoiding dedicated network-planner views.


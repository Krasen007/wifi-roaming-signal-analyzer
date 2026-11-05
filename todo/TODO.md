# FloorScope — Comprehensive Audit, Taste Decisions & Roadmap

> **Core Philosophy:** _BSSID is truth, SSID is a lie._
> When all enterprise or campus access points broadcast the same SSID, client devices cannot distinguish which physical radio they are attached to. FloorScope resolves this by anchoring location and roaming intelligence to physical BSSIDs rather than virtual network names.

---

### 1.2 Discrepancies & Unfinished Items (Found in Codebase Audit)

1. **Dashboard Decomposition (Completed):** Dashboard controls, signal hero, roaming check, same-SSID AP ranking, and neighboring networks are implemented in and imported from their dedicated component files. `Dashboard.tsx` coordinates those components with the history chart and physical-device panel.
2. **Chart Scope:** The history timeline is scoped to the selected SSID so neighboring networks do not introduce a second charting model.
3. **Over-Engineered Chart (Deferred):** `LiveHistoryChart.tsx` has complex SVG gap connectors, focus modes, and color palette hashing.

---

### 2.2 Taste Weaknesses & Anti-Pattern Risks

1. **The Feature Factory Temptation:** Prior additions (such as the Channels tab and sample data) added UI noise and cognitive overhead without answering the primary question: _"Which floor am I on, and am I attached to the right AP?"_
2. **Dashboard Coordination:** Keep `Dashboard.tsx` focused on selected-network state, derived data, and composing the extracted dashboard components.
3. **Dead Weight in Repository:** Keep component files either in active use or remove them; avoid parallel implementations that create maintenance ambiguity.

---

## 3. The Taste Decision Framework & Anti-Pattern Checklist

Before adding or modifying any feature, abstraction, or dependency, apply this checklist:

### 3.1 The 6-Question Taste Filter

1. **Necessity:** Does this directly solve the primary question (_"Which floor am I on, and am I connected to the right AP?"_)?
2. **Externalities:** Does this add new tabs, state flags, or visual complexity that distracts from the core workflow?
3. **Coherence:** Does it align with the core thesis that _BSSID is physical truth and SSID is a broadcast label_?
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

- [x] **Decompose `Dashboard.tsx`:** Extract controls, signal hero, roaming check, same-SSID AP ranking, and neighboring networks into dedicated imported components.

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

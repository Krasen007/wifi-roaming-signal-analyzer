# FloorScope — Omissions & Subtractions

## The Tasteful Argument

FloorScope's point of view is: **BSSID is truth, SSID is a lie.** When all APs share one SSID, the BSSID (the physical MAC address) is the only reliable identifier for which floor you're on. The product makes this argument consistently across every layer.

---

## ✅ Implemented Subtractions (Completed)

These changes have been applied to the codebase:

### 1. ✅ Removed the Channels Tab
- Removed `channels` from `App.tsx` Tab type and tab navigation
- Removed `ChannelChart` component import and the channels section rendering
- Removed `BarChart3` icon import

### 2. ✅ Removed the "Load Sample Data" Button
- Removed `SAMPLE_NETSH` import from `ScanImport.tsx`
- Removed the "Load sample data" button
- Removed the `sample.ts` file entirely
- Kept drag-and-drop and paste functionality intact

### 3. ✅ Removed Hardcoded Registry Suggestions
- Removed the `useMemo` with hardcoded suggestions ("Basement", "Ground floor", "HQ", etc.)
- Removed `<datalist>` elements for floor and building suggestions
- Removed `list` attributes from building/floor inputs
- All fields are now free-text only, letting users define their own vocabulary

### 4. ✅ Removed `vite-plugin-singlefile`
- Removed from `package.json` dependencies
- Removed import and usage from `vite.config.ts`
- The standard Vite build is now used

### 5. ✅ Removed the Service Worker
- Removed service worker registration script from `index.html`
- Deleted `public/sw.js`

### 6. ✅ Removed the `note` Field from Registry
- Removed `note?: string` from `RegistryEntry` type in `types.ts`
- Removed `!next.note` check in `RegistryManager.tsx` delete condition

### 7. ✅ Show All Devices in DevicesPanel
- Removed `const multi = devices.filter((d) => d.members.length > 1)` filter
- Changed `{multi.length > 0 && ...}` to `{devices.map(...)}` — all devices shown
- Removed `void registry;` dead parameter and `registry` prop entirely
- Updated `DevicesPanel` props interface to remove `registry`
- Updated `Dashboard.tsx` to not pass `registry` to `DevicesPanel`

### 8. ✅ Split Dashboard into Sub-Components
- Created `DashboardControls.tsx` — controls bar, hero card, roaming check, roam events
- Created `AllApsList.tsx` — same-SSID ranked AP list with trend indicators
- Created `OtherNetworks.tsx` — adjacent networks on different SSIDs
- `Dashboard.tsx` now composes these components (reduced from 489 lines to ~87 lines)

### 9. ✅ Cleaned Up Dead Code
- Removed `sample.ts` module
- Removed `DashboardHero.tsx` (redundant with DashboardControls)
- Fixed `void registry` dead parameter in DevicesPanel
- Removed unused imports throughout

---

## ⏳ Deferred (Not Yet Implemented)

### 4. Defer: Simplify LiveHistoryChart
- **Status:** DEFERRED per user request
- The 276-line SVG chart with focus mode and gap connectors remains unchanged
- Will be addressed separately

---

## The Tasteful Product Shape (After Subtractions)

### Three Tabs
1. **Live setup** — scan loop, file watch, paste. The critical path.
2. **Dashboard** — controls, hero card, roam detection, live history chart, all physical devices, all-AP ranking, other networks.
3. **AP Registry** — BSSID → building/floor/name mapping. The truth layer.

### No Channels Tab
Channel information lives on each AP card. No dedicated view needed.

### No Sample Data
Users work with real data from the start.

### No Hardcoded Suggestions
Users define their own building/floor vocabulary.

### Clean Components
Dashboard split into focused sub-components: DashboardControls, AllApsList, OtherNetworks. DevicesPanel shows all devices. No dead parameters.

### No Service Worker, No Single-File Plugin
Just Vite, React, and Tailwind.

---

## The Omission Principle

> "When the cost of building approaches zero, the ability to decide what NOT to build becomes the entire product."

FloorScope's tasteful future is built on **what it omits**:
- ✅ No channels tab
- ✅ No sample data
- ✅ No hardcoded suggestions
- ⏳ No over-engineered chart (DEFERRED)
- ✅ No dead code
- ✅ No unnecessary plugins
- ✅ No service worker

What remains is a tool that does one thing exceptionally well: **tells you which floor you're on, and whether you're connected to the right AP.**

That's taste.

---

## Note on "Lost access to the file" Error

If the app shows "Lost access to the file. The scan may have moved or the loop stopped — pick the file again", this is a runtime issue, not a code smell. The `serveScanFile` plugin in `vite.config.ts` serves `scan.txt` from the project root. To fix:

1. Use `start.bat` to launch the app — it starts the PowerShell scan loop AND the Vite dev server together
2. The app opens automatically with `?live=scan.txt` which connects to the dev server
3. Without `start.bat`, the dev server may not serve `scan.txt` properly
4. Ensure `scan.txt` exists in the project root before opening the app

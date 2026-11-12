# FloorScope v2.0 — Version 2 of the idea

## Audit of the current codebase

This repo is already solving a real, well-defined problem: in multi-floor wireless environments, a device can show a strong signal while being attached to the wrong physical access point or the wrong floor. The codebase reflects that clearly:

- Wi-Fi scanning is implemented around BSSID-first analysis rather than SSID-only assumptions.
- The app is intentionally local-first and privacy-conscious, keeping all data in the browser/local storage.
- The architecture is already split into sensible parts: scan ingestion, parsing, storage, dashboarding, registry management, and wired LAN correlation.
- The product surface is built around a good operational workflow: detect the current AP, compare it against nearby APs, map the location, and warn on sticky-client or wrong-floor behavior.

In short: the codebase already proves the core problem is valid and the data model is solid.

## What is working well

The strongest parts of the current implementation are:

- Real operational emphasis on physical truth: BSSID over SSID.
- A clear distinction between radio identity and logical network name.
- Local registry management for building/floor/location mapping.
- Wired LAN correlation via LLDP, gateway, ARP, and socket mapping.
- Live signal history that turns the issue into something observable over time.
- Good separation between parsing, storage, and UI concerns.

This is not a toy app; it is a serious troubleshooting tool for a specific environment class.

## What is missing in v1

The current product is strong as a diagnostic dashboard, but it still reads as a single-purpose monitoring tool rather than a full platform. The main gaps are:

- It is optimized for immediate troubleshooting, not repeatable operations and reporting.
- There is no richer multi-site or multi-building model.
- There’s no distinction between one-time scans and a persistent signal intelligence baseline.
- The experience still feels more like a technical utility than a polished operational product.
- It lacks higher-level outcomes such as trend analysis, issue history, and move-to-roam guidance.

In other words: v1 is a good live analyzer; v2 should become a decision-support system.

## V2.0 product idea: FloorScope as a building-aware roaming intelligence cockpit

FloorScope v2.0 should evolve from “live Wi-Fi analyzer” into a full building-aware roaming intelligence platform for facilities, IT support, and on-site troubleshooting.

### Core concept

Instead of only showing “what AP am I on right now,” FloorScope v2.0 should tell you:

- where the user/device likely is physically,
- whether the current AP is expected for that location,
- whether the device is likely sticky or roaming incorrectly,
- which neighboring APs are more suitable,
- whether the wired drop or switch port matches the wireless behavior,
- whether conditions are worsening over time and whether this is a recurring problem.

This turns the app from a raw signal dashboard into a “roam health and coverage intelligence system.”

### V2.0 feature set

#### 1. Multi-building and multi-floor intelligence

- Support multiple buildings, each with floors and room maps.
- Associate APs with expected coverage zones instead of isolated registry rows.
- Flag when an AP is known for one floor but current signal implies another.
- Keep historical context per site so trends are visible across time.

#### 2. Roam health scoring

Add a single, explainable health score for each connection:

- Coverage quality
- Roam stability
- Floor consistency
- AP suitability
- Signal quality trend

This gives users a simple “healthy / at risk / degraded” state instead of a wall of technical numbers.

#### 3. Event timeline with cause and context

Instead of just listing roam events, V2 should pair them with context:

- weak signal before roam
- stronger neighboring AP found
- wrong floor match
- sticky client warning
- switch/port mismatch
- historical pattern repeated in the same location

This turns telemetry into actionable diagnosis.

#### 4. Coverage map and expected path model

For each building/floor, create an “expected coverage” model using known AP signatures and locations.

- Show which APs should be dominant in a room or hallway.
- Highlight dead spots and over-coverage zones.
- Compare live observations against expected coverage to find anomalies.

This is the bridge from signal data to physical building understanding.

#### 5. A persistent issue ledger

The app should maintain recurring issue records, for example:

- “Sticky client near stairwell, 3rd floor”
- “AP H-24 weak in east wing”
- “Roam oscillation between A01 and A05”

These become repeatable operational artifacts instead of temporary events.

#### 6. Wired + wireless correlation

Keep the current wired panel, but extend it into a physical infrastructure view:

- switch-to-wall-port-to-floor mapping
- AP-to-switch correlation
- room-level assumptions
- cross-checking of wired and wireless path integrity

The user should be able to ask: “Is the issue in the port, the AP, or the roaming path?”

#### 7. Exportable building reports

Not every user wants to stare at a live dashboard. V2 should support:

- PDF or shareable summary reports
- per-location troubleshooting snapshots
- issue export for IT tickets
- before/after comparison for remediation work

This gives the app operational value beyond live diagnostics.

## Why this is the right v2 direction

The current repo already contains the right ingredients:

- AP registry
- signal history
- building/floor model
- Wired LAN diagnostics
- device grouping logic
- local persistence

The missing step is not new raw data sources; it is a better layer of interpretation and product framing.

V2 should be about “how to act on the signal,” not just “how to read the signal.”

## V2.0 positioning

### From
“Live Wi-Fi floor-roaming analyzer”

### To
“Building-aware wireless health and roaming intelligence platform”

This reframes the tool from a niche utility into an operational system that can serve:

- IT and helpdesk teams
- facilities and building operations
- network troubleshooting
- Wi-Fi health validation during design changes or remodels

## Suggested V2 product principles

1. Keep it local-first and privacy-friendly.
2. Treat physical location as first-class data.
3. Turn raw signal data into explainable decisions.
4. Make troubleshooting workflow-driven, not dashboard-driven.
5. Provide both operational live views and archival summary views.
6. Design for accessibility and mobile readability from the start.

## Recommended near-term evolution

A strong V2 roadmap would be:

- Phase 1: polish the current dashboard and make it more trustworthy and accessible.
- Phase 2: add persistent site profiles and roam-health scoring.
- Phase 3: add historical issue tracking and reports.
- Phase 4: add map-based coverage understanding and deeper wired/wireless correlation.

## Final summary

The current codebase proves the original idea is valid: users need a way to understand the physical reality behind wireless connectivity. That is the foundation for a strong product.

Version 2.0 should expand the repo from a diagnostic dashboard into a building-aware intelligence system that explains not only where the device is connected, but why that connection is healthy or unhealthy, and what action should be taken next.

That is the real product opportunity.

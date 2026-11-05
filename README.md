# FloorScope

> **Live Wi-Fi Signal & Floor-Roaming Analyzer**  
> *BSSID is physical truth; SSID is just a label.*

FloorScope is a lightweight, local-first web application designed to diagnose Wi-Fi roaming behavior and determine which physical access point (and floor) your device is actually connected to in multi-AP environments.

---

## The Problem

In enterprise offices, university campuses, and multi-story buildings, dozens of Wi-Fi access points (APs) typically share a single SSID (network name). 

This introduces two common issues:
1. **The "Full Bars, Wrong Floor" Trap:** Your laptop may show a strong signal, but it is attached to an AP on the floor above or below you, leading to degraded throughput or packet loss.
2. **Sticky Client Roaming:** Client Wi-Fi devices often hold on to a weakening access point even when walking directly beneath a much stronger one.

Operating systems only show the network name (SSID). FloorScope inspects the physical radio MAC address (**BSSID**), tracks real-time signal strength, maps APs to building/floor locations, and alerts you immediately when a roaming issue occurs.

---

## Key Features

- **Automated Live Scanning:** Starts with a single click via `start.bat`. A background PowerShell loop queries Windows `netsh` and feeds real-time scans directly into the web UI without manual file prompts.
- **Sticky Client Detection:** Compares your active connection against all visible APs on the same SSID. If a neighbor AP is significantly stronger ($\ge 8\text{ dBm}$ difference), FloorScope flags a sticky-client warning.
- **Wrong-Floor Attachment Alerts:** Set your current building and floor; FloorScope verifies whether your connected AP matches your physical location based on your mapped AP registry.
- **Physical Device Disambiguation:** Enterprise APs typically broadcast multiple SSIDs and bands across the same physical hardware, sharing middle BSSID octets (`xx:AA:BB:CC:DD:yy`). FloorScope groups these into unified hardware units (`D1`, `D2`, etc.), so you know how many distinct access points are actually nearby.
- **Live Signal History Chart:** SVG-based timeline rendering up to 120 polling intervals with live dBm trajectories, connection indicators, and roam/drop event flags.
- **Local AP Registry:** Map BSSIDs to specific buildings, floors, and descriptive room/hallway locations. Fields use dynamic autocomplete based on previously entered locations.
- **Strict Privacy & Offline Execution:** 100% in-browser. All scan data and registry records remain entirely on your local machine (`localStorage`).

---

## Quick Start (Windows)

### Option 1: One-Click Launch (Recommended)

Double-click `start.bat` in the repository root.

The launcher script automatically:
1. Checks and installs npm dependencies if missing (`npm install`).
2. Starts the background PowerShell Wi-Fi scan loop writing to `scan.txt` every 5 seconds.
3. Launches the Vite server with custom scan-serving middleware.
4. Opens your default browser at `http://localhost:<port>/?live=scan.txt` with live streaming already active.

*To stop FloorScope, close the spawned PowerShell and server command windows.*

---

### Option 2: Hosted / Portable Mode (GitHub Pages)

When FloorScope is served as a static site (for example GitHub Pages), there is no local dev
server to read `scan.txt`. Open the deployed site, go to **Live setup**, and click
**Download Windows scanner (.bat)**.

Double-click the downloaded `floorscope-scanner.bat`. It:

1. starts the `netsh` scan loop writing to `%LOCALAPPDATA%\FloorScope\scan.txt`,
2. serves that file on `127.0.0.1` behind a random token,
3. reopens the hosted page with `?live=http://127.0.0.1:<port>/<token>/scan.txt`.

In the page, click **Connect local scanner** and allow **local network access** when the browser
asks (Chrome/Edge; Safari blocks loopback requests). Windows SmartScreen (and some antivirus
tools) may warn because the `.bat` was downloaded — choose **More info → Run anyway** if you
trust the source. The file is plain text, so you can inspect it in Notepad. Keep the scanner
window open while analyzing; closing it stops both the loop and the bridge.

---

### Option 3: Manual / Development Mode

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Start the scan loop in a PowerShell terminal:**
   ```powershell
   while ($true) { $(netsh wlan show networks mode=bssid; netsh wlan show interfaces) | Out-File scan.txt -Encoding utf8; Start-Sleep 5 }
   ```

3. **Start the Vite dev server:**
   ```powershell
   npm run dev
   ```

4. **Open the application:**
   Navigate to [http://localhost:5173/?live=scan.txt](http://localhost:5173/?live=scan.txt) in Chrome or Edge.

---

## Application Structure & Views

FloorScope is organized into three focused tabs:

### 1. Dashboard
- **Active Network & Floor Selector:** Filter by SSID, switch chart scopes, and set your current location ("Building" and "Floor").
- **Best AP Hero Card:** Displays the strongest AP for the active network, showing signal in dBm, qualitative rating (Excellent, Good, Fair, Weak, Poor), channel, frequency band (2.4 GHz, 5 GHz, 6 GHz), and 802.11 radio protocol.
- **Roaming Check & Event Log:** Immediate feedback on connection state (Optimal, Sticky Client, or Wrong Floor attachment) and a chronological list of recent roams and disconnects.
- **Signal History Timeline:** Live multi-series SVG chart tracking signal trends over time.
- **Physical Devices Panel:** Disambiguates co-located radios and multi-SSID broadcasts into physical device units.
- **Ranked AP List:** Compares all access points on the selected SSID, sorted by real signal strength with real-time $\Delta$ indicators.
- **Other Networks:** Overview of neighboring SSIDs detected in the area.

### 2. Live Setup
- Status monitor for live scan ingestion (mode, update cadence, AP count, last timestamp).
- Portable scanner generator for hosted/GitHub Pages deployments (`.bat` + loopback bridge).
- PowerShell loop command runner and quick-copy shortcut.
- Fallback manual upload (drag-and-drop `scan.txt` or paste `netsh` output directly).

### 3. AP Registry
- Comprehensive registry table mapping each detected or manually entered BSSID to a **Building**, **Floor**, and **Location**.
- Sortable by signal, BSSID, SSID, building, floor, or location.
- Stored permanently in browser `localStorage`.

---

## Tech Stack

- **Runtime & UI:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tooling:** [Vite 7](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Platform Ingestion:** Windows Native `netsh wlan` CLI + Vite HTTP file streaming middleware

---

## Project Layout

```text
wifi-roaming-signal-analyzer/
├── start.bat                     # Single-click launcher (PowerShell loop + Vite server)
├── vite.config.ts                # Vite config with custom serveScanFile plugin
├── package.json
├── todo/
│   └── TODO.md                   # Consolidated audit findings, taste decisions & roadmap
├── src/
│   ├── App.tsx                   # Main layout and tab navigation
│   ├── components/
│   │   ├── Dashboard.tsx         # Dashboard view (hero, roam check, AP ranking)
│   │   ├── DevicesPanel.tsx      # Physical hardware grouping (middle octet heuristic)
│   │   ├── LiveHistoryChart.tsx  # SVG signal-over-time timeline
│   │   ├── RegistryManager.tsx   # AP location registry table
│   │   ├── ScanImport.tsx        # Ingest controls, scan loop copy, paste/drop
│   │   ├── SignalBars.tsx        # Signal visualizer bars
│   │   └── BandTag.tsx           # Frequency band badges (2.4G / 5G / 6G)
│   ├── lib/
│   │   ├── bridgeBat.ts          # Portable scanner .bat + loopback HTTP bridge generator
│   │   ├── devices.ts            # Physical device grouping algorithm
│   │   ├── labels.ts             # Display label formatters
│   │   ├── live.ts               # File System Access, HTTP fetch & loopback bridge handles
│   │   ├── parsers.ts            # netsh output parsers & BSSID normalizer
│   │   ├── signal.ts             # Signal math (dBm <-> percentage, band detection)
│   │   ├── storage.ts            # LocalStorage persistence helpers
│   │   ├── types.ts              # Core TypeScript interfaces
│   │   └── useLiveWatch.ts       # Polling hook for live scan.txt updates
│   └── utils/
│       └── cn.ts                 # Classname merge utility
└── README.md
```

---

## License

Private / Internal utility.


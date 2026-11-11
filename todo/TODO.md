I read all 12 components, both polling hooks, the signal/device libraries, index.css, index.html, and the built bundle; computed the actual contrast ratios for every palette pair in use; and grepped for ARIA, dark-mode, and focus handling. Everything below is verified against source, not inferred.
Anti-Patterns Verdict
Does it look AI-generated? Yes — mildly, but unmistakably. This is a competent AI-scaffolded Tailwind dashboard, not a designed product.
Specific tells, in order of prominence:
1. Indigo→violet gradient brand mark (App.tsx:223, from-indigo-500 to-violet-600) with indigo-600 as the global primary — the single most recognizable "AI default palette" signature.
2. Card soup. Every block on every tab is rounded-2xl border border-slate-200 bg-white p-5 shadow-sm. Dashboard = 6 stacked cards, Live Setup = 6, Wired = 8. Nothing is grouped by anything other than "put it in a card."
3. Nested cards. StatusItem/Stat mini-cards sit inside the overview card (ScanImport.tsx:463, WiredPanel.tsx:806); adapter blocks nest inside the adapter card (WiredPanel.tsx:355).
4. Ubiquitous 10px uppercase tracked micro-labels — text-[10px] font-semibold uppercase tracking-wide text-slate-400 appears ~12 times as the default label treatment.
5. Redundant instructional copy. The "everything stays on your machine" privacy line appears in three places; the scan-loop instructions appear twice per tab; "What this tab is for" and "What the numbers mean" restate the same thing.
What is NOT there (crediting the negative space): no glassmorphism, no gradient text, no bounce/overshoot easing, no emoji, no fake vanity metrics. The giant -42 dBm in SignalHero is the instrument's primary readout, not a hero-metric decoration — that one is legitimate. No "gray on colored background" either; body copy on tinted panels uses *-900 on *-50 (e.g. amber-900/amber-50 = 8.75:1).
Verdict: 3–4 weak tells, zero severe ones. Reads as template-derived, not garish.
Audit Health Score
#	Dimension	Score	Key Finding
1	Accessibility	2	Secondary text runs at 2.45–2.56:1 (slate-400) and 1.48:1 (slate-300) across timestamps, hints, and footers — fails 1.4.3 AA at scale.
2	Performance	4	No layout thrashing, no scroll listeners, system fonts (0 font requests), SVG chart instead of a chart lib, capped history. 284 KB raw JS / 27.8 KB CSS.
3	Responsive Design	2	preserveAspectRatio="none" on the chart squashes axis text to ~54% width on a 375px viewport — the flagship visual breaks on mobile.
4	Theming	1	Zero design tokens, zero CSS variables, zero dark mode. Colors are inline Tailwind utilities in 12 components plus raw hex in the chart.
5	Anti-Patterns	2	AI-default indigo/violet palette + uniform card stack + nested mini-cards + repeated micro-labels. Restrained otherwise.
Total	 	11/20	Acceptable (significant work needed)
Executive Summary
Audit Health Score: 11/20 (Acceptable — significant work needed)
19 issues: 0 P0 · 4 P1 · 9 P2 · 6 P3
The app is functionally sound and unusually disciplined for its size — no blocking defects, clean data flow, and genuinely good table/empty-state craft. What holds it back is visual-system debt: it is a single-theme, hard-coded Tailwind surface with no token layer, and its accessibility work stopped at "add labels where obvious" — contrast, live-region announcements, and table-input naming were never addressed.
Top issues:
1. P1 — Contrast. text-slate-400 on white is 2.56:1 (needs 4.5:1). It carries real information: last-update timestamps, "waiting for a scan", "unique BSSIDs", "offline", the footer privacy statement, and the chart's axis labels.
2. P1 — No status announcements. The core value proposition — "sticky client detected", "wrong floor attachment", live scan updates — lands in DOM with no aria-live. A screen-reader user gets silence from the app's entire purpose. WCAG 4.1.3 AA.
3. P1 — Unlabeled form fields. Every editable cell in the AP Registry and Wired Port Map is a bare <input> with no accessible name (RegistryManager.tsx:221–244, WiredPanel.tsx:642–691). A screen reader announces "edit text, e.g. HQ" with no idea which column it is.
4. P1 — Mobile chart distortion. preserveAspectRatio="none" + fixed h-72 means a 640×280 viewBox is stretched into 343×288 on a phone; 9px labels render at ~4.8px wide. The single most valuable visual is unreadable on mobile.
Recommended next steps (in order): fix contrast tokens first (mechanical, biggest score jump), add aria-live to the roam verdict + live status, label the table inputs, switch the chart to preserveAspectRatio="xMidYMid meet" with a min-height. Dark mode + a semantic token layer is the larger, second-phase project.
Detailed Findings by Severity
P0 — Blocking
None. The app renders and completes its core task.
P1 — Major
P1 Secondary text fails WCAG AA contrast across the entire app
- Location: App.tsx:335 (footer), AllApsList.tsx:110–111, RoamPanel.tsx:155, ScanImport.tsx:464/473, WiredPanel.tsx:807/816/824, LiveHistoryChart.tsx:152–161, RegistryManager.tsx:205
- Category: Accessibility
- Impact: Measured ratios: slate-400 on white 2.56:1, on slate-50 2.45:1; slate-300 on white 1.48:1; rose-500 on white 3.67:1 (the "Clear"/"Delete" actions). Normal text requires 4.5:1. Low-vision users and anyone on a dim laptop screen lose timestamps, hints, and state labels.
- WCAG: 1.4.3 Contrast (Minimum), AA
- Recommendation: Promote informational secondary text to slate-500 (4.55–4.76:1 — passes) or slate-600. Reserve slate-400 for decorative glyphs only. Move text-slate-300 "offline" and "±0" to slate-500. Move destructive text to rose-600 (≈4.9:1).
P1 Live alerts and scan updates are never announced
- Location: RoamPanel.tsx:74–113 (verdict blocks), App.tsx:266–277 (Live / File lost pills), DashboardControls.tsx:111–123
- Category: Accessibility
- Impact: The product's whole reason to exist is "tell me the moment I'm on the wrong AP." That verdict renders as a plain <div>. Screen-reader users receive no notification when a sticky-client or wrong-floor warning appears, or when a new scan lands.
- WCAG: 4.1.3 Status Messages, AA
- Recommendation: Add role="status" aria-live="polite" to the verdict container in RoamPanel, and aria-live="polite" to the live-status pill. Keep it polite so 5s polling doesn't spam.
P1 Editable table cells have no accessible names
- Location: RegistryManager.tsx:221–244 (Building/Floor/Location inputs), WiredPanel.tsx:642–691 (Socket/Building/Floor/Location/Switch/Port/VLAN inputs), RegistryManager.tsx:264–269 (manual BSSID, placeholder-only)
- Category: Accessibility
- Impact: Column headers are visual only; <td> gives no programmatic context. Voice-control users cannot target a field ("click Floor"), and SR users hear seven identical "edit text" fields per row.
- WCAG: 3.3.2 Labels or Instructions (A), 4.1.2 Name/Role/Value (A)
- Recommendation: aria-label={${row.bssid} floor} on each input, or <th scope="col"> + aria-labelledby referencing the header id. Add a real <label className="sr-only"> to the manual BSSID field.
P1 Signal chart is geometrically distorted on narrow viewports
- Location: LiveHistoryChart.tsx:148 — <svg viewBox="0 0 640 280" className="mt-4 h-72 w-full md:h-80" preserveAspectRatio="none">
- Category: Responsive
- Impact: At 375px width the horizontal scale is 0.54 while vertical is 1.03. Axis text (9px), the "now"/"−20 min" labels, end-marker circles, and legend dots are all squashed to roughly half width — ellipses instead of circles, unreadable tick labels. This is the primary analytical surface.
- WCAG: 1.4.10 Reflow (AA) is arguable; the practical impact is loss of the chart's information.
- Recommendation: Drop preserveAspectRatio="none" (use the default xMidYMid meet) and give the SVG min-h-[220px], or render at w-full h-auto with the viewBox controlling aspect. If a fixed height is required, recompute W/H from a ResizeObserver.
P2 — Minor
P2 Tab state is not exposed to assistive tech
- Location: App.tsx:244–263
- Category: Accessibility
- Impact: Active tab is conveyed by a 2px border + text hue only. No aria-current, no aria-selected, no role="tablist". SR users hear four plain buttons and cannot tell which view is active.
- WCAG: 4.1.2 (state), best practice for nav
- Recommendation: Add aria-current={tab === t.id ? "page" : undefined} to each tab button and aria-label="Primary" to the <nav>. Minimal, correct, no role overhaul needed.
P2 Focus indicators are suppressed and under-contrast
- Location: DashboardControls.tsx:42/60/81/101, RegistryManager.tsx:226/235/243/268, WiredPanel.tsx:645–690/745/850, ScanImport.tsx:397
- Category: Accessibility
- Impact: Every input/select uses outline-none and relies on focus:border-indigo-400 — a 1px border at 2.98:1 against white (needs 3:1). Textareas add ring-indigo-100 at ≈1.1:1, effectively invisible. Keyboard users get a very faint cue.
- WCAG: 1.4.11 Non-text Contrast (AA), 2.4.11 Focus Appearance
- Recommendation: Use focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 (indigo-600 is 5.9:1) and drop the 1px-border-only strategy.
P2 Heading hierarchy skips a level and misuses elements
- Location: App.tsx:240 (h1 nested inside the logo <button>), Dashboard.tsx → RoamPanel.tsx:65, LiveHistoryChart.tsx:121, DevicesPanel.tsx:26, AllApsList.tsx:34 (all h3 with no intervening h2), RoamPanel.tsx:141 (<label> with no htmlFor and no wrapped control)
- Category: Accessibility
- Impact: SR users navigating by heading get h1 → h3 with no h2 on the main view. A <label> attached to nothing is ignored, so "Connection events" is an orphan string.
- WCAG: 1.3.1 Info and Relationships (A)
- Recommendation: Make the dashboard card titles h2, or insert a visually-hidden <h2>Dashboard</h2>. Move the h1 out of the button. Replace the orphan <label> with <h4> or a role="group" + aria-labelledby.
P2 Accessible name contradicts visible label on the logo button
- Location: App.tsx:217–243
- Category: Accessibility
- Impact: Visible text is "FloorScope"; accessible name is "Go to dashboard". Voice-control users saying "click FloorScope" fail.
- WCAG: 2.5.3 Label in Name (A)
- Recommendation: Delete aria-label — the contained text already provides a good name ("FloorScope Live WiFi floor-roaming analyzer").
P2 Invalid manual BSSID fails silently
- Location: RegistryManager.tsx:114–120
- Category: Accessibility (forms)
- Impact: addManual() regex-fails and returns with no message, no aria-invalid, no visual state. The user clicks Add and nothing happens.
- WCAG: 3.3.1 Error Identification (A)
- Recommendation: Track an error state, render "Use aa:bb:cc:dd:ee:ff" with role="alert" and aria-invalid on the input.
P2 Touch targets below 44px throughout
- Location: RegistryManager.tsx:250 (Clear, ~16–20px tall), WiredPanel.tsx:703 (Delete), LiveHistoryChart.tsx:130/138 (Show all / Clear chart, ~28px), LiveHistoryChart.tsx:293–326 (legend chips, 26px), RegistryManager.tsx:226 (in-table inputs, 26px), App.tsx:250 (tabs, ~38px)
- Category: Responsive
- Impact: Mis-taps on phones and touch laptops; the registry is unusable without precision tapping.
- WCAG: 2.5.8 Target Size (Minimum), AA — several of these are under 24px and only survive on the spacing exception
- Recommendation: min-h-11 min-w-11 (44px) on icon/text actions; py-2 minimum on in-table inputs; keep legend chips at py-1.5 px-3 with 44px hit area via padding.
P2 No theme layer and no dark mode
- Location: src/index.css (8 lines, no tokens), all 12 components
- Category: Theming
- Impact: A tool used in server rooms and at night has no dark mode; every color is an inline utility, so a theme change means editing 12 files. The chart's hex palette (LiveHistoryChart.tsx:7, 151–161, 257, 307) will not adapt to any future theme at all.
- Standard: N/A (design-system gap)
- Recommendation: Introduce a semantic token layer via Tailwind v4 @theme (--color-surface, --color-text-muted, --color-accent) and map dark: variants. At minimum, move the chart colors to currentColor/CSS variables.
P2 Data tables force horizontal scroll on phones
- Location: RegistryManager.tsx:144 (min-w-[760px]), WiredPanel.tsx:617 (min-w-[900px])
- Category: Responsive
- Impact: Editing eight columns on a 375px screen means panning sideways per field. The scroll container prevents page-level overflow (good), but the interaction is rough.
- WCAG: 1.4.10 Reflow (AA) — content is reachable, so not a hard failure
- Recommendation: Below md, collapse rows into stacked definition lists (label above value), keeping the table for ≥768px.
P2 Redundant instructional copy
- Location: ScanImport.tsx:73–151 + 199–215 + 243–271 + 280–298; WiredPanel.tsx:225–230 + 528–531 + 785–788
- Category: Anti-Pattern
- Impact: The same "what this does / privacy" message is repeated 2–3× per tab, pushing the actual controls below the fold. It reads as documentation pasted into the UI.
- Recommendation: One intro card per tab; move the rest into a collapsible "How it works" <details>.
P3 — Polish
P3 Perpetual animate-ping
DashboardControls.tsx:114, ScanImport.tsx:331 — infinite transform/opacity animation, GPU-cheap but never stops. Respect prefers-reduced-motion and consider pausing when the tab is hidden.
P3 No memoization; whole tree re-renders every scan
App.tsx:88–139 → all children. ~200 DOM nodes and a full chart path rebuild every 5s. Imperceptible at this data scale; only worth React.memo on LiveHistoryChart if AP counts grow past ~100.
P3 9–10px text in px units
AllApsList.tsx:110, BandTag.tsx:13, LiveHistoryChart.tsx:152, ScanImport.tsx:464, WiredPanel.tsx:807 — fixed px sizes ignore the user's browser font-size preference. Use rem (text-[0.625rem]) or step up to text-xs.
P3 Chart lines are click-only
LiveHistoryChart.tsx:174 — <g className="cursor-pointer" onClick> with no tabIndex/role/key handler. The legend chips at 293 provide a keyboard equivalent, so this is a redundancy gap, not a blocker.
P3 Disabled buttons look enabled
ScanImport.tsx:441, WiredPanel.tsx:588/773 — bg-slate-300 + white text (1.48:1) reads as a light gray active button. Add opacity-60 and aria-disabled clarity, or a muted border style.
P3 Tooltip-only information
SignalBars.tsx:11, AllApsList.tsx:75, LiveHistoryChart.tsx:211/303 — title attributes are not exposed to keyboard or touch users. All critical values are duplicated in adjacent text, so impact is low; convert the chart <title> usage to aria-label on focusable elements if the chart becomes keyboard-navigable.
Patterns & Systemic Issues
1. No semantic token layer. Colors are inline Tailwind utilities in 12 components, plus 8 raw hex values in the chart. There is no --color-* variable, no dark: variant, and no theme switch. This is the root cause of the Theming score and the reason a dark-mode request would touch every file.
2. Accessibility was applied at the "obvious control" level and stopped. Where a label was easy (dashboard selects, aria-sort, one aria-label), it was done well. Where it required thought — generated table cells, dynamic alerts, chart semantics, focus rings — it was skipped. Total ARIA surface for the whole app: 2 attributes (aria-label, aria-sort).
3. text-slate-400 is the default secondary color — used 20+ times for genuinely informational text. One systematic replacement to slate-500/slate-600 fixes the majority of the contrast findings.
4. Uniform card container everywhere. rounded-2xl border border-slate-200 bg-white p-5 shadow-sm is copy-pasted across every section, with mini-cards nested inside. A single Card component plus a "no nested cards" rule would tighten the visual language considerably.
5. Micro-typography as a default. text-[9px]/text-[10px] uppercase tracked labels are the fallback for every label and badge rather than a deliberate accent.
Positive Findings
- aria-sort is implemented correctly on the registry headers (RegistryManager.tsx:295–306) — including the "none" case. This is rarer than it should be and shows the author knows the pattern.
- Signal quality is never encoded by color alone — every AP shows bars + numeric dBm + qualitative label + tint. The most important information survives grayscale and color blindness.
- Real semantic landmarks: header / nav / main / footer, a single h1, lang="en", correct viewport with viewport-fit=cover, and a theme-color that matches the brand.
- Genuinely good table craft: thead/th, colSpan empty states, sticky headers on the neighbour table (WiredPanel.tsx:474), and tables wrapped in overflow-x-auto so they never break the page.
- Honest, specific empty and error states — "No LLDP announcement received in 40 seconds. The switch may not advertise LLDP on this port" (WiredPanel.tsx:291) tells the user what actually happened and why, instead of "Something went wrong."
- Performance discipline: no scroll or resize listeners, no layout reads in loops, capped history (MAX_HISTORY_POINTS = 300), capped roam log (15), a 20-minute sliding chart window, SVG instead of a charting dependency, system fonts (zero font requests), and a dependency list where every package is actually used.
- Privacy claims are structurally true — the only persistence is localStorage; there are no network calls other than the user-initiated loopback bridge.
- Dark hero card works: slate-400 on slate-900 is 6.96:1 — the one place the muted palette passes comfortably, because it was designed against a dark surface.
Bottom line: 11/20 is the right score. This is a well-engineered data tool wrapped in an under-designed, single-theme shell. Contrast + live-region + input-labeling fixes are a focused day of work and would move Accessibility from 2→3 and the total to 13. The chart's preserveAspectRatio="none" is a one-line fix worth doing first — it is currently the most visible defect on mobile.
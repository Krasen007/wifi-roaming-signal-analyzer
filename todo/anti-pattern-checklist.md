# FloorScope — Anti-Pattern Checklist

Use this checklist before adding any new feature, component, or abstraction to FloorScope. Each item maps to a specific anti-pattern from the Taste guide.

---

## The Feature Factory Check

Before adding a feature, ask:

- [ ] **Is this solving the core problem?** ("Which floor am I on?") If not, it's probably bloat.
- [ ] **Does this feature earn its place through necessity?** Or is it just possible?
- [ ] **What is the negative externality?** More tabs? More state? More cognitive load?
- [ ] **Could the dashboard absorb this instead?** Adding to an existing view is usually tasteful than adding a new tab.
- [ ] **Am I building this because I can, or because I must?** If you can build it with 50 lines of code and it adds a new tab, it's probably not worth it.

**Current violations:**
- [x] **Channels tab** — adjacent feature, not core problem. Violates Feature Factory.
- [x] **Sample data button** — invites fake play, not real work. Violates Feature Factory.

---

## The CRUD App Check

Before adding a data management feature, ask:

- [ ] **Does this serve the analytical thesis?** Or does it turn FloorScope into a "structured workflow wrapped in a UI"?
- [ ] **Is the registry a tool or the product?** The registry exists to support floor detection, not to be a building management system.
- [ ] **Are we adding fields to the registry?** Each new field (note, tags, categories) increases complexity without serving the core theory.

**Current violations:**
- [ ] Registry `note` field exists but is rarely used — consider removing it
- [ ] Registry has `name`, `building`, `floor`, `note` — four fields for one piece of truth. Consider if `note` is necessary.

---

## The Aesthetic-Only Product Check

Before adding polish, ask:

- [ ] **Does this add functional value or just visual polish?** Tailwind styling is fine, but each component should serve data, not decoration.
- [ ] **Is the design invisible when well-executed?** Users should focus on their floor detection, not the UI.
- [ ] **Am I adding animations or transitions that don't convey information?** The ping animation on the LIVE badge is fine — it conveys "live data is flowing." A fade-in on chart lines would not.

**Current violations:**
- [ ] The gradient hero card (slate-900 to slate-800) is decorative — the signal bars and dBm value convey the information
- [ ] The `rounded-2xl` everywhere is consistent but adds no information — it's a style choice, not a taste decision

---

## The Data-Driven Without Vision Check

Before adding data collection, ask:

- [ ] **What theory does this data serve?** Every data point should answer "which floor am I on?"
- [ ] **Am I optimizing for stated preferences or unarticulated needs?** Users say "I want to see channel info" but actually need "am I on the right floor?"
- [ ] **Is this data going to inform a decision or just sit there?** The history chart serves the theory (signal trends → roaming decisions). The channel chart doesn't directly inform floor detection.

**Current violations:**
- [x] **Channel congestion data** — serves network planning, not floor detection. The theory is "which floor," not "which channel."
- [x] **120-point history cap** — is this calibrated? It may be too many points for a casual walk between floors, or too few for a long shift.

---

## The Everything Machine Check

Before expanding scope, ask:

- [ ] **How many features does this have?** Four tabs (Dashboard, Import, Registry, Channels) is already pushing it. Each tab is a promise of a complete experience.
- [ ] **Am I measuring success by feature count?** If so, remove features until success is measured by user outcomes.
- [ ] **Does the roadmap look like a list of features or a coherent argument?** FloorScope's argument should be: "BSSID is truth, and we can tell you which floor you're on." Everything else is noise.

**Current violations:**
- [x] **4 tabs** — the app has 4 distinct experiences. The channels tab is the main contributor to feature count bloat.
- [x] **Multiple input modes** — live file watch, paste, drag-and-drop, sample data. The first three are essential; sample data is not.
- [x] **start.bat + manual paste + live watch** — three launch modes. The `start.bat` is the tasteful one; the others exist for when `start.bat` doesn't work.

---

## The Taste Test for Every New Addition

Apply these 6 questions before any addition:

1. **Necessity:** Is this essential to solving "which floor am I on?" or just nice to have?
2. **Externalities:** How does this increase cognitive load or system complexity?
3. **Coherence:** Does this align with the BSSID-as-truth theory?
4. **Calibration:** Is this the right amount, or too much/too little?
5. **Omission:** What are we choosing NOT to build by building this?
6. **Unarticulated Need:** Does this serve something users can't articulate but will recognize?

**If you cannot answer these clearly and affirmatively, do not build it.**

---

## Default to Omission

When uncertain, apply these defaults:

| Uncertain about... | Default | Rationale |
|-------------------|---------|-----------|
| A new tab | Don't build it | Tabs are expensive — each one is a navigation destination |
| A new input field | Don't build it | Every field in the registry is a choice about how the user's world is structured |
| A new visualization | Don't build it | The chart already works; adding another type adds complexity |
| A new parser format | Don't build it | netsh is the Windows standard; other formats are edge cases |
| A new animation | Don't build it | Animations that don't convey information are decoration |
| A new sample/fixture | Don't build it | Users should work with real data |
| A plugin/dependency | Don't add it | Each dependency is a promise to maintain it |

---

## Reversibility Test

Prefer decisions that are cheap to reverse:

| Decision | Reversible? | Action |
|----------|------------|--------|
| Remove Channels tab | ✅ Easy — delete the component and nav item | **Do it** |
| Remove sample data | ✅ Easy — delete the button and constant | **Do it** |
| Remove hardcoded suggestions | ✅ Easy — clear the arrays | **Do it** |
| Simplify LiveHistoryChart | ✅ Medium — rewrite the SVG | **Do it** |
| Split Dashboard | ✅ Medium — extract components | **Do it** |
| Remove service worker | ✅ Easy — delete sw.js and registration | **Do it** |
| Remove vite-plugin-singlefile | ✅ Medium — change build config | **Do it** |
| Remove registry `note` field | ⚠️ Data loss — existing notes would be lost | Consider migration |
| Remove DevicesPanel registry prop | ✅ Easy — remove the prop and `void registry` | **Do it** |

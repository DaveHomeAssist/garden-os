# Garden OS -- Root-Level Tools Feature Analysis

**Date:** 2026-03-25
**Files analyzed:** `index.html`, `garden-planner-v4.html`, `how-it-thinks.html`, `brand-guide.html`, `scoring-map.html`, `fairness-tester.html`, `gos-system-map-v2.html`, `system-topology.html`, `garden-cage-build-guide.html`, `garden-os-build-state.html`, `prompt-explorer.html`, `garden-league-simulator-v4.html`, `garden-os-sprite-viewer.html`, `garden-os-theme.css`, `scoring-api.json`, `gos-schema.json`
**Stack:** Zero-backend single-file HTML tools, vanilla JS/CSS, localStorage persistence, GitHub Pages
**Scope:** Root-level tools only (NOT story-mode/)

---

## Summary Table

| Feature | Status | Data Source / Persistence | Critical Gap |
|---|---|---|---|
| **Garden Planner v4.3** | Working | localStorage, .gos.json import/export | Massive single file; no image assets for crops |
| **Season Engine / League Simulator v4** | Working | localStorage, gos-schema.json contract | Complex state machine in a single HTML file |
| **How It Thinks (scoring explainer)** | Working | Static educational content | None -- clean reference page |
| **Brand Guide** | Working | Static token reference | Canonical design token source |
| **Scoring Map** | Working | Static data + interactive toolbar | None |
| **Fairness Tester** | Working | Runs all 38 crops x all conditions, localStorage | Compute-heavy; no web worker |
| **System Map v2** | Working | Hardcoded topology data | Dark hacker aesthetic diverges from user-track design |
| **System Topology** | Working | D3 + Dagre force-directed graph | Only tool with external JS dependencies (D3, Dagre) |
| **Garden Cage Build Guide** | Working | Static content with sidebar nav | None |
| **Build State Dashboard** | Working | Static project status tracker | Dark cinematic aesthetic (Playfair Display) |
| **Prompt Explorer** | Working | Interactive node graph of prompt structure | Wood-grain aesthetic unique to this tool |
| **Sprite Viewer** | Working | Inline sprite data | Dev tool for asset inspection |
| **Shared Theme CSS** | Working | `garden-os-theme.css` imported by several pages | Not used by all tools (planner, fairness tester inline their own) |
| **Hub / Index Page** | Working | Links to all tools with launch cards | Two-track nav (user + dev) |
| **Schema Contract** | Working | `gos-schema.json`, `scoring-api.json` | Version-controlled data contracts |
| **Offline-capable** | Working | No network required (except Google Fonts) | Fonts degrade gracefully |

---

## Detailed Feature Analysis

### 1. Garden Planner v4.3 (`garden-planner-v4.html`)
**Problem it solves:** Interactive raised-bed garden planner where users place crops on a grid and receive deterministic scoring feedback.
**Implementation:** Three-panel layout (left sidebar: site config + crop palette, center: bed grid, right sidebar: summary/dashboard). Tabbed sidebars with search/filter for 38 crops across 8 categories. Bed size presets (4x4, 4x8, etc.) plus custom dimensions. Sun exposure slider. Toggle controls for raised bed, irrigation, mulch. Recent crops strip for quick access. Workspace save/load via localStorage.
**Scoring:** Six-factor deterministic algorithm (sun fit at 2x weight, support fit, shade tolerance, access fit, season fit, adjacency). Canonical spec in `specs/SCORING_RULES.md`.
**Persistence:** localStorage for current state. Import/export via `.gos.json` files. No cloud sync.
**Tradeoffs:** Extremely feature-rich but the entire app is a single HTML file (likely 3000+ lines). No code splitting. The three-column layout requires careful responsive handling. CSP header is set restrictively which is good for security.

### 2. Season Engine / League Simulator v4 (`garden-league-simulator-v4.html`)
**Problem it solves:** Turn-based garden simulation with seasonal progression, events, and character dialogue.
**Implementation:** Full state machine with season-specific CSS palettes (spring/summer/fall/winter custom properties). Four characters with fixed speaking order (Garden GURL, Onion Man, Vegeman, Garden Critters). Paper grain SVG texture overlay. Phase-based gameplay with event deck.
**Persistence:** localStorage with legacy save migration. Phase restoration handles old `REVIEW` saves.
**Tradeoffs:** The most complex single-file app in the ecosystem. Season theming is elegant (CSS custom property swaps). Character voice is trigger-driven and deterministic per the Voice Bible spec.

### 3. How It Thinks (`how-it-thinks.html`)
**Problem it solves:** Explains the scoring algorithm to non-technical users in plain language.
**Implementation:** Static educational page with analogy cards (icon + explanation), example grids, factor weight table, and callout boxes. Uses the shared theme CSS plus page-specific styles. Topbar with brand mark.
**Tradeoffs:** Well-structured reference content. Links to related tools (planner, scoring map). Guide-launch card grid provides onward navigation.

### 4. Brand Guide (`brand-guide.html`)
**Problem it solves:** Canonical design token reference for all Garden OS tools.
**Implementation:** Defines the full token taxonomy: Soil scale (9 stops), Leaf scale (9 stops), Sun/Amber scale (9 stops), Cream scale (10 stops), plus semantic aliases, spacing scale, radius scale, shadow scale, and type scale. All in CSS custom properties.
**Tradeoffs:** This is the canonical source, but not all tools consume it -- the planner and fairness tester inline their own (slightly different) token sets. The brand guide documents the ideal; the tools have drifted.

### 5. Fairness Tester (`fairness-tester.html`)
**Problem it solves:** Validates that the scoring algorithm does not unfairly advantage or disadvantage specific crops across all possible site conditions.
**Implementation:** "Run Test" button iterates all 38 crops across all site configurations. Bar charts show score distribution. Diverging bar charts show per-crop deviation from mean. Tabbed results (overview, per-crop, per-factor, outliers). Summary card with stat boxes.
**Tradeoffs:** Runs synchronously on the main thread -- could freeze the UI during computation. A web worker would prevent jank. The tool is critical for maintaining scoring fairness but is a dev-track tool not exposed to end users.

### 6. Scoring Map (`scoring-map.html`)
**Problem it solves:** Visual exploration of how scores change across different site conditions.
**Implementation:** Interactive toolbar with controls for bed size, sun hours, season, and toggles. Data table or card view of all crops with their computed scores. Sticky topbar with brand mark.
**Tradeoffs:** Uses Inter/Georgia fonts (dev-track aesthetic) rather than the user-track Fraunces/DM Sans. This is intentional per the CLAUDE.md design rules.

### 7. System Map v2 (`gos-system-map-v2.html`)
**Problem it solves:** Architectural diagram of all Garden OS components and their relationships.
**Implementation:** Dark terminal aesthetic (black background, green accent colors). Card-based layout showing UI layer, engine layer, knowledge layer, and data layer. Chip badges for component types.
**Tradeoffs:** Effective for developer orientation. The dark-mode hacker aesthetic is distinct from both the user-track and dev-track design systems.

### 8. System Topology (`system-topology.html`)
**Problem it solves:** Interactive force-directed graph of the system architecture.
**Implementation:** Uses D3.js v7 and Dagre for graph layout -- the ONLY tool in the ecosystem with external JS dependencies. SVG-based with pan/zoom, node labels, and edge types (data, control, actuation, event, reference). Color-coded by layer (UI, engine, knowledge, data).
**Tradeoffs:** The dependency on D3/Dagre CDN means this tool requires network access, breaking the offline-capable constraint. However, it's a dev tool so the tradeoff is acceptable.

### 9. Shared Theme (`garden-os-theme.css`)
**Problem it solves:** Centralized design tokens and base styles for consistent visual identity.
**Implementation:** Token taxonomy (soil, cedar, leaf, sun, rust, cream, panel, text, border, shadow, radius). Font imports (Fraunces, Lora, DM Sans, DM Mono). Base styles, card styles, badge styles, navigation patterns.
**Tradeoffs:** Well-organized with clear naming convention. However, adoption is incomplete -- the planner, fairness tester, and several dev tools define their own tokens inline, creating drift risk.

### 10. Two-Track Navigation
**Problem it solves:** Separates the user-facing experience (plan your garden) from the developer experience (inspect the system).
**Implementation:** User track: Home > Play Game > Planner > Build Guide > Ops Guide > How It Thinks. Dev track: Visualizer > Scoring Map > Fairness Tester > System Map > Topology. Bridge links connect the tracks. Dark soil nav bar with DM Mono font and sun accent.
**Tradeoffs:** Clean separation of concerns. Users never see dev tools unless they navigate to them. The bridge links prevent dead ends.

---

## Top 3 Priorities

1. **Consolidate design tokens.** The brand guide defines canonical tokens, `garden-os-theme.css` implements a shared subset, but the planner and fairness tester inline their own slightly-different token sets. This drift creates visual inconsistency. Migrate all user-track tools to consume `garden-os-theme.css`.

2. **Move fairness tester computation to a web worker.** Running all 38 crops x all conditions synchronously on the main thread risks UI freeze. A dedicated worker would keep the UI responsive during test runs.

3. **Add real crop images or illustrations.** The planner uses text labels and colored dots for crops. Even simple SVG icons per crop category would significantly improve the visual experience and make the planner more intuitive for non-gardeners.

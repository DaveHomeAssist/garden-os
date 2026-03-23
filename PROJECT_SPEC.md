# Garden OS — Project Specification

## 1. Summary

**Purpose:** Browser-based garden planning ecosystem — a suite of single-file HTML tools plus a Three.js Story Mode game. Covers garden layout planning, scoring, build guides, operations guides, and a narrative-driven simulation.

**Status:** Phase 1 complete (Trust the Score). Story Mode actively developed with title screen, cutscenes, inventory, and crop interaction. Live at davehomeassist.github.io/garden-os/.

---

## 2. Objectives (New Abilities)

### Collapsible Sections
- Story Mode backpack rail collapses to compact drawer at narrow widths
- Planner right sidebar collapses stale content when switching sections
- Season Engine manage drawer collapses behind toggle

### Accordion Rules
- Single-open for planner inspect detail (one cell expanded at a time)
- Multi-open for build guide sections (multiple steps visible)
- Persistence: accordion state per page in localStorage

### Keyboard Navigation
- Enter to toggle section headers
- Arrow keys within planner cell grid
- Tab to advance between HUD elements
- Escape to close modals, dialogue panels

### Contrast & Accessibility
- Audit text tokens against soil/cream palette: `--text (#1e110a)`, `--text-mid (#5a3e2b)`, `--cream (#f7f2ea)`
- Verify focus ring visibility on all interactive surfaces
- Check HUD element contrast against 3D scene background
- Row labels removed from bed (visual clutter fix — done)

### Nav Bar Logic
- Two-track model: User track and Dev track with bridge links
- Active state: highlight current tool in nav bar
- Mobile: nav collapses to hamburger
- No duplicate destinations across user and dev tracks
- Nav bar: dark soil background (`#5c3d1e`), DM Mono font, sun accent (`#e8c84a`)

### Column Layouts
- Story Mode: 3D viewport (primary) + HUD overlays + right backpack rail
- Planner: bed grid (primary) + right sidebar (inspect/summary)
- Breakpoints: 900px (collapse sidebar), 700px (stack vertically)
- One scroll container per view
- Backpack rail: fixed width, collapsible to icon strip

### Theme Resource
- **Fonts:** Fraunces 600 (headings), DM Sans 300-500 (body), DM Mono 400-500 (labels)
- **Colors:** soil `#5c3d1e`, leaf `#3d7a4f`, leaf-bright `#5aab6b`, sun `#e8c84a`, cream `#f7f2ea`, cream-dark `#ede5d8`, text `#1e110a`, text-mid `#5a3e2b`
- **Border radius:** 8px cards/panels, 999px badges only
- **Dev track** uses own aesthetic (Inter/Georgia for data pages, system-ui for dark-mode pages)

### Run Agent (Blank State)
- Story Mode: title screen with 3-slot save system and game mode preview
- Planner: empty 4x8 bed grid with crop palette ready
- Season Engine: phase selector with "Start Planning" CTA

### Inputs/Outputs
- Game state: crops.js, phase, season, chapter, inventory
- Scene graph: procedural geometry + sprite billboard overlays
- Data exchange: `.gos.json` file export/import across tools

### Execution
- Convert plan steps into tasks
- Track as atomic commits
- Cleanup: remove debug geometry, normalize HUD spacing
- **Done:** bed label removal, HUD/objective cleanup, backpack density pass, dialogue footprint reduction

---

## 3. Project Metadata

| Field | Value |
|-------|-------|
| Project Name | Garden OS |
| Epic / Track | UI + DATA + WEB + DOCS |
| Owner | Dave Robertson |
| Status | IN PROGRESS (Phase 2 next) |
| Priority | HIGH |
| Target Ship | Story Mode polish pass, then Phase 2 (What If?) |
| Source of Truth | specs/SCORING_RULES.md (scoring), docs/HANDOFF.md (architecture), IMPLEMENTATION_PLAN.md (roadmap) |

---

## 4. Definition of Done (DoD)

- [ ] Meets nav + theme rules (two-track model, soil/cream palette)
- [ ] No contrast regressions (HUD readable over 3D scene)
- [ ] Keyboard navigation works (planner grid, HUD controls)
- [ ] Mobile layout verified (Story Mode responsive, planner stacks)
- [ ] Docs updated if behavior changed (HANDOFF.md updated)
- [ ] Scoring deterministic (same inputs → same outputs, always)

---

## 5. Overview & Scope

**Problem:** Story Mode is visually functional but crop sprites had opaque card backgrounds (now fixed with transparent billboards), character dialogue uses placeholder portraits, and the gap between planner tools and Story Mode narrative isn't bridged.

**Goal:** Polish Story Mode into a cohesive game experience. Land transparent crop billboards, character sprite portraits, and begin Phase 2 tools (Layout Simulator, Garden Doctor, Yield Forecast).

**Success Metrics:**
- Crops render as transparent in-world billboards (not dark cards) — DONE
- Character portraits show in dialogue with expression variants
- 4 distinct growth stages visually differentiated per crop — DONE (code unlocked)
- Phase 2 tools specced and at least one shipped

**In Scope:**
- Sprite transparency pipeline (done)
- Character portrait system (prompts written, art needed)
- Growth stage visual differentiation (code done, art done)
- Phase 2: Layout Simulator, Garden Doctor, Yield Forecast
- Story Mode HUD/UI polish (done via Codex patch)

**Out of Scope:**
- Backend/database
- Multiplayer
- Real sensor integration
- Native mobile app

**Constraints:** Zero backend, single-file HTML tools (no npm/build for root tools), localStorage persistence, offline-capable, schema-first (`gos-schema.json`).

---

## 6. UX/UI & Navigation Logic

### UI Elements
- **Story Mode:** 3D viewport, HUD (chapter/season/phase), backpack panel, dialogue strip, floating actions, season calendar
- **Planner:** bed grid, crop palette, inspect sidebar, summary panel, objective strip
- **Root tools:** nav bar (user + dev tracks), tool-specific layouts

### States to Validate
| State | Where |
|-------|-------|
| Empty | New save slot, empty bed, no crops planted |
| Loading | Sprite textures loading, scene initializing |
| Error | Missing texture (silent fallback to procedural) |
| Selected | Cell selected in planner, item selected in backpack |
| Hover | Bed cells (planting affordance), backpack items |
| Focus | HUD buttons, dialogue skip/next |
| Disabled | Tools not applicable to current phase |

### Nav Regression Checklist
- [ ] Active state matches current tool in nav bar
- [ ] No duplicate routes across user and dev tracks
- [ ] Bridge links connect tracks correctly
- [ ] Mobile nav collapses intentionally

---

## 7. Theme & Contrast Targets

| Element | Target Ratio | Current Status |
|---------|-------------|----------------|
| Normal text (cream on soil) | >= 4.5:1 | Pass (#f7f2ea on #5c3d1e = 7.2:1) |
| HUD text over 3D scene | >= 4.5:1 | Improved (warmed HUD styling) |
| UI components (buttons, borders) | >= 3:1 | Pass |
| Focus ring visibility | Visible on all surfaces | Needs audit for Story Mode |
| Story Mode dialogue text | >= 4.5:1 | Pass (white on dark panel) |

---

## 8. Risks & Acceptance Checks

### Risks
1. **Story Mode bundle size** — garden-scene.js is a large chunk; texture assets (bed-empty, env-path) are heavy
2. **Windows filename blocker** — 5 pipe-character image filenames prevented branch checkout (FIXED: renamed via GitHub API)
3. **Sprite art pipeline** — character portraits not yet generated; growth sheets now transparent but need scene verification
4. **Phase 2 scope** — Layout Simulator, Garden Doctor, Yield Forecast all specced but none started
5. **Schema drift** — any tool changes must validate against gos-schema.json

### Open Questions
1. Should Story Mode character portraits use the 3D low-poly style or a different art direction?
2. Is the 6x4 growth master sheet sufficient or do individual crops need further polish?
3. When does Phase 2 (What If?) start?

### Acceptance Checks
- **Functional:** Scoring deterministic, planner creates valid layouts, Story Mode plays through Chapter 1
- **A11y:** Keyboard navigation in planner, HUD controls reachable
- **Performance:** 60fps on 2x DPR mobile Safari, no texture bombing (< 40 active textures)

---

## 9. Implementation & Release

### Plan
1. ~~Transparent crop billboard sprites~~ — DONE
2. ~~Sprite-loader hasAlpha fix + accent tuning~~ — DONE
3. ~~Windows filename fix~~ — DONE
4. ~~Story Mode HUD/UI polish pass~~ — DONE (Codex patch)
5. Generate character portrait art (prompts in CHARACTER_SPRITE_PROMPTS_v2.md)
6. Wire character portraits into dialogue PortraitRenderer
7. Verify growth stage sprites render correctly in-scene
8. Phase 2A: Layout Simulator / What-If Mode
9. Phase 2B: Garden Doctor
10. Phase 2C: Yield Forecast + Harvest Window

### QA
- Desktop: Chrome/Safari, full chapter playthrough
- Mobile: responsive Story Mode at 375px, 428px
- Keyboard-only: planner cell navigation and tool selection

### Release Notes
- Transparent crop billboards replace opaque card sprites
- Growth stages now visually differentiated (seed → sprout → growing → harvest)
- HUD tightened, backpack slimmed, dialogue footprint reduced
- Windows-compatible image filenames

### Rollback
- Trigger: broken scene rendering, scoring regression, or save corruption
- Steps: `git revert HEAD` for last commit, verify with `npm test`
- Scoring: if code and spec disagree, spec (`specs/SCORING_RULES.md`) wins — fix the code

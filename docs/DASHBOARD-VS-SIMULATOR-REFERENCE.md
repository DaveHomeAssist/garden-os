# Garden OS — Dashboard vs Simulator Reference

**Purpose:** Side-by-side comparison of the Dashboard concept (v3) and the live Season Engine (garden-league-simulator-v3.html) to identify what should merge, what stays separate, and where the UI/UX gaps are.

Generated: 2026-03-16

---

## 1. IDENTITY & DESIGN SYSTEM

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Font stack** | Fraunces / DM Sans / DM Mono | Fraunces / DM Sans / DM Mono |
| **Token naming** | `--cream`, `--soil`, `--sun`, `--leaf`, `--leaf-bright`, `--danger`, `--rain` | `--sf-bg`, `--sf-panel`, `--sf-ink`, `--sf-muted`, `--sf-line`, `--sem-good`, `--sem-warn`, `--sem-hard` |
| **Background** | `#f7f2ea` (cream, warm) | `#e8dcc8` (parchment, warmer/darker) |
| **Card surface** | `#fffdf8` (warm white) | `#f5ecdc` (tan parchment) |
| **Primary text** | `#1e110a` (espresso) | `#22150b` (near-black brown) |
| **Grid cell bg** | `var(--cream)` flat | Radial gradient with soil dot texture |
| **Grid container** | Flat with border | Gradient from `--s-ground-mid` to `--s-ground-deep` with soil texture |
| **Season theming** | None (static Spring 2026 pill) | Full `.season-spring/summer/fall/winter` CSS classes that swap 9 vars |
| **Paper grain** | SVG noise overlay at 2.8% opacity | None |
| **Dark mode** | None | `@media(prefers-color-scheme:dark)` exists but inverted (sets LIGHTER colors — known bug) |
| **Reduced motion** | Not implemented | Full `@media(prefers-reduced-motion:reduce)` — disables all animations |
| **Print styles** | Not implemented | Full `@media print` — hides controls, linearizes layout, clean output |

**Assessment:** The token systems are entirely different. Dashboard uses the BRAND_IDENTITY.md palette exactly. The simulator uses its own `--sf-*` / `--sem-*` / `--char-*` system that predates the brand doc. Both use the same fonts. The simulator's season-aware color shifting is a feature the dashboard lacks entirely.

---

## 2. LAYOUT & RESPONSIVE DESIGN

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Grid layout** | `270px | 1fr | 232px` | `240px | 1fr | 320px` |
| **Max width** | 1160px | 1280px |
| **Breakpoints** | 1060px (2-col), 680px (1-col) | 1199px (drop right col), 819px (1-col), 600px (scroll grid), 480px (compact) |
| **Panel overflow** | None (page scrolls) | `max-height: calc(100vh - 100px)` with scroll on left/right panels |
| **Grid cell sizing** | `aspect-ratio: 1` in 8-col grid | `aspect-ratio: 1` in 8-col grid with `minmax(0, 1fr)` |
| **Mobile grid** | Cells shrink naturally | Grid gets `min-width: 430px` with horizontal scroll |
| **Landscape** | Not handled | `@media(max-height:500px) and (orientation:landscape)` — compact mode |

**Assessment:** The simulator has significantly more responsive coverage. Dashboard is missing landscape, small-screen scroll, and compact phone handling. The simulator's approach of scrolling the grid horizontally at 600px is better than letting cells get unusably small.

---

## 3. GRID & CELL SYSTEM

| Feature | Dashboard v3 | Simulator v3 |
|---------|-------------|--------------|
| **Grid size** | 8×4 = 32 cells | 8×4 = 32 cells |
| **Cell states** | empty, synergy, conflict, selected | empty, has-crop, selected-cell, trellis, access-zone, locked, event-hit, protected-cell, mulched-cell, score-good/warn/hard, companion-buff, just-planted, harvesting, swap-highlight |
| **Cell content** | Emoji + base score | Emoji + short code + score pip (positioned absolute bottom-right) |
| **Trellis rows** | Visual label only ("CATTLE PANEL TRELLIS — NORTH") | Functional: rows 0-1 have `.trellis` class, enforce climber placement |
| **Access zones** | Not modeled | Rows 2-3 have `.access-zone` class, scoring factor for accessibility |
| **Cell animations** | Hover scale(1.12) | Hover translateY(-1px) + shadow, pop-in on plant, harvest-pulse on harvest, event-pulse on hit |
| **Score display** | Static `basePts` from CROP_DB | Live per-cell score from `scoreCell()`, color-coded pip |
| **View overlays** | Score / Sun / Water toggle (changes cell bg color) | None — score state shown via border/bg classes always |
| **Click behavior** | Dashboard: select for detail panel. Planner: plant/remove | Phase-dependent: Planning = plant/erase, Beat = intervention target, Harvest = read-only |

**Assessment:** The simulator's cell system is dramatically richer. It models trellis mechanics, access zones, event damage, protection, mulching, and animated state transitions. The dashboard's view toggle (sun/water overlays) is a feature the simulator doesn't have — it would be useful for planning phase visualization.

---

## 4. SCORING ENGINE

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Factors** | 6 computed: adjacency, sun, spacing, companions, pests, water | 6 canonical: sun fit (2× weight), support fit, shade tolerance, access fit, season fit, adjacency |
| **Sun scoring** | Simple lookup: high=1.0, mid=0.7, low=0.4 | Models effective light from row position, shadow from tall crops, crop sunMin/sunIdeal ranges |
| **Support** | Not modeled | Hard violation if climber placed outside trellis rows |
| **Shade** | Not modeled | Shadow propagation from north-facing rows; shade tolerance × 0.6 if light below minimum |
| **Access** | Not modeled | Row-based: tall crops score better in back, short crops in front |
| **Season fit** | Not modeled (hardcoded "Spring 2026") | Per-crop seasonal multipliers (spring/summer/fall) |
| **Adjacency** | Companion +0.5, conflict -0.6, same sun zone +0.1 | Companion +0.5, conflict -1.2, same-crop -0.2, water mismatch -0.5 |
| **Spacing** | Fill ratio penalty (global) | Twin tall/climber penalties per cell |
| **Events** | Not modeled | Event modifiers per cell (+/-), persist through beat/season |
| **Soil fatigue** | Not modeled | Per-cell fatigue from same-family replanting across seasons |
| **Diversity** | Not modeled | 4+ factions = +0.7, recipe completion = +0.2 per recipe |
| **Score scale** | 0–10 (display) | 0–10 per cell, 0–100 bed average, letter grade A+–F |
| **Determinism** | Yes (no randomness) | Yes per CLAUDE.md (one known violation: random target selection in events) |
| **Canonical spec** | None — engine is inline | `specs/SCORING_RULES.md` is single source of truth |

**Assessment:** The simulator's scoring engine is categorically more sophisticated. It models physical garden mechanics (light propagation, shadow, trellis structure, access paths) that the dashboard treats as simple lookup values. The dashboard's "6 sub-scores" are a simplified approximation. Any merge must use the simulator's engine — the dashboard's engine is a display-only summary.

---

## 5. CROP DATA

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Crop count** | 13 crops | 20 crops |
| **Data structure** | `{ e, basePts, sun, water, dth, pos, neg }` | `{ id, name, emoji, short, faction, sunMin, sunIdeal, support, shadeScore, coolSeason, tall, water, companions, conflicts, chapterUnlock, recipes, ev, sm }` |
| **Factions** | Not modeled | 8 factions: climbers, fast_cycles, brassicas, roots, greens, herbs, fruiting, companions |
| **Recipes** | Not modeled | 4 recipes: herb_bowl, tomato_sandwich, weeknight_pasta, moms_sauce |
| **Event tags** | Not modeled | `ev[]`: pest-target, frost-sensitive, heat-tolerant, wind-sensitive, etc. |
| **Season multipliers** | Not modeled | `sm: { spring, summer, fall }` per crop |
| **Chapter unlock** | Not modeled | `chapterUnlock: N` gates crop availability per chapter |
| **Canonical source** | Inline `CROP_DB` object | `specs/CROP_SCORING_DATA.json` (20 crops, 8 factions) |

**Assessment:** The simulator's crop data is the canonical version per CLAUDE.md. The dashboard uses a simplified subset with different property names and fewer fields. Any integration must use the simulator's `C` object or its JSON spec.

---

## 6. STATE & PERSISTENCE

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Storage** | Dexie (IndexedDB), self-hosted inline | localStorage (3 keys: SKEY, HKEY, CKEY) |
| **Bed state** | Single `BED[]` array of crop names (or null) | `S.grid[]` array of objects: `{ cropId, row, col, locked, eventModifier, interventionFlag, soilFatigue }` |
| **Campaign** | Not modeled | Full `CAM` object: chapters, keepsakes, recipes, journal, dialogue history |
| **Carry-forward** | Not modeled | Soil fatigue maps, infrastructure, event memory, recipe pantry |
| **Auto-save** | 1400ms debounce after any change | Immediate `save()` after state mutations |
| **Save feedback** | Header "SAVED / SAVING..." indicator | None (silent save) |
| **Multi-bed** | Schema supports it (Dexie store), not wired | Not supported |
| **Export/import** | Not implemented | Not implemented (but `.gos.json` spec exists) |

**Assessment:** Different persistence models serving different purposes. The simulator's localStorage approach is simpler and aligned with CLAUDE.md's constraint. The dashboard's Dexie choice was made before the project had a CLAUDE.md — it works but adds 80KB of inline library for a single-record use case. The simulator's rich cell objects carry much more state per cell.

---

## 7. CHARACTER VOICES & NARRATIVE

| Dimension | Dashboard v3 | Simulator v3 |
|-----------|-------------|--------------|
| **Characters shown** | All 4 always visible as static cards | 1–3 at a time, context-driven, animated |
| **GURL** | Dynamic (score-responsive text) | ~80 trigger-specific lines across 20+ pools |
| **Onion Man** | Static placeholder text | ~80 lines, emotional/nostalgic, Mom references |
| **Vegeman** | Static placeholder text | ~50 lines, Ch2 + Ch10 only, chaotic energy |
| **Critters** | Static placeholder text | Ch6+ event narration, predatory tone |
| **Dialogue engine** | None — hardcoded strings | Full `DIALOGUE_DB` with trigger keys, per-character pools, dedup via history tracking |
| **Trigger system** | Score threshold only (GURL) | ~20 trigger types: placement, scoring, events, interventions, seasons, recipes, phillies, mom memories |
| **Firing rules** | Every render cycle | Every 3rd placement, special triggers always, chapter-gated character availability |
| **Animation** | None | Fade-in (opacity 0→1 + translateY), border-left color per character |

**Assessment:** The simulator's dialogue system is the real implementation. The dashboard has placeholder voice cards that should either be removed (for a monitoring view) or replaced with the simulator's trigger-driven system (for an integrated experience). Showing all 4 characters simultaneously is anti-pattern per the brand doc's intent — they should appear contextually.

---

## 8. GAME MECHANICS (Simulator Only)

These features exist only in the simulator and have no dashboard equivalent:

| Feature | Description |
|---------|-------------|
| **Campaign mode** | 12 chapters across 3 years with progressive unlock |
| **Season beats** | 3 beats per season (Early/Mid/Late) with event draws |
| **Event deck** | 40 events (10 per season) with weighted drawing, target resolution |
| **Interventions** | 5 types: protect, mulch, companion patch, prune, swap |
| **Carry-forward** | Soil fatigue, infrastructure, event memory persist between seasons |
| **Recipes** | 4 recipes with ingredient tracking across seasons |
| **Keepsakes** | 7 collectible items earned through gameplay |
| **Chapter objectives** | Per-chapter constraints (row requirements, full bed, harvest targets) |
| **Sauce sequence** | Ch11 special: staggered reveal of Mom's recipe ingredients |
| **Epilogue** | Ch12: full 12-season history, mastery rank, legacy view |
| **Mastery ranks** | 7 levels from Novice to Legacy Keeper |
| **Free play** | Unlocked sandbox mode after campaign |
| **Keyboard shortcuts** | E (eraser), R (advance), Esc (cancel), H (help) |

---

## 9. DASHBOARD-ONLY FEATURES

These features exist only in the dashboard and have no simulator equivalent:

| Feature | Description |
|---------|-------------|
| **View toggle** | Score / Sun / Water overlays on grid cells |
| **Harvest timeline** | Days-to-harvest with progress bars per crop type |
| **Zone info panel** | Static zone 6B data: frost dates, growing days, soil temp |
| **Score breakdown bars** | Visual bars for each of 6 sub-scores |
| **Three-mode tabs** | Dashboard / Planner / Season Engine navigation |
| **Dexie persistence** | IndexedDB with auto-save indicator |
| **Trellis arch SVG** | Decorative arch above grid representing cattle panel |
| **Paper grain texture** | SVG noise overlay for brand warmth |
| **Save status indicator** | Visual feedback on save state |
| **"MOM'S SANCTUARY" label** | Personalized header text |

---

## 10. ARCHITECTURAL CONFLICTS

| Conflict | Dashboard v3 | Simulator v3 | Resolution Path |
|----------|-------------|--------------|-----------------|
| **Token system** | Brand-doc tokens (`--cream`, `--soil`) | Pre-brand tokens (`--sf-*`, `--sem-*`) | Simulator should migrate to brand tokens |
| **Scoring engine** | Simplified 6-factor approximation | Canonical 6-factor engine per SCORING_RULES.md | Use simulator's engine everywhere |
| **Crop data** | 13 crops, flat structure | 20 crops, rich structure per CROP_SCORING_DATA.json | Use simulator's data everywhere |
| **Cell state** | Crop name string or null | Object with cropId, modifiers, flags | Use simulator's cell objects |
| **Persistence** | Dexie (IndexedDB) | localStorage | Align with CLAUDE.md: localStorage |
| **Determinism** | Fully deterministic | One known random shuffle in event targeting | Fix the random shuffle (Phase 1A in patch plan) |
| **Voice system** | Static cards, score-only GURL | Full dialogue engine with 20+ triggers | Use simulator's dialogue system |
| **Build constraint** | Zero-dep (but Dexie is 80KB inline) | Zero-dep per CLAUDE.md | Remove Dexie dependency |
| **Background color** | `#f7f2ea` (brand spec) | `#e8dcc8` (pre-brand) | Use brand spec color |

---

## 11. WHAT EACH TOOL DOES BEST

### Dashboard v3 Strengths
1. **Visual identity fidelity** — Exact match to BRAND_IDENTITY.md palette and typography
2. **Information density** — Score + grid + harvest + zone in one glanceable view
3. **View toggle pattern** — Sun/Water overlays are genuinely useful for planning
4. **Trellis arch SVG** — Reinforces the physical structure visually
5. **Three-mode navigation** — Clean separation of read/edit/game concerns
6. **Save feedback UX** — Visible auto-save status

### Simulator v3 Strengths
1. **Scoring engine depth** — Models real garden physics (light, shadow, access)
2. **Game loop** — Complete season lifecycle with meaningful decisions
3. **Narrative system** — Trigger-driven dialogue with dedup and character gating
4. **Event system** — 40 events with targeting, interventions, carry-forward
5. **Progressive complexity** — 12-chapter campaign that teaches mechanics incrementally
6. **Accessibility** — Full keyboard nav, ARIA labels, reduced motion, print styles
7. **Responsive coverage** — 5 breakpoints including landscape and small phone

---

## 12. CONSOLIDATION OPTIONS

### Option A: Dashboard as Monitor, Simulator as Engine
- Dashboard becomes a read-only view of the simulator's current bed state
- Simulator is the only place where gameplay happens
- Dashboard imports scoring engine and crop data from simulator
- Dashboard shows live scores using simulator's `scoreCell()` function
- **Pro:** Clean separation of concerns, each tool is focused
- **Con:** Two files to maintain, data sync between them

### Option B: Dashboard Absorbs Simulator
- Dashboard's "Season Engine" tab becomes the full game
- Scoring engine, event deck, dialogue system all move into the dashboard file
- Dashboard/Planner tabs use the same engine for real-time scoring
- **Pro:** Single tool, single source of truth
- **Con:** 2650 + 1100 = ~4000 line file, maintenance burden

### Option C: Simulator Adopts Dashboard's Brand Layer
- Simulator gets the brand-doc color tokens, paper grain, trellis arch
- Dashboard features (view toggle, harvest timeline, zone info) become panels in the simulator
- The dashboard concept file is retired
- **Pro:** Keeps the proven game engine, upgrades the visual identity
- **Con:** Significant CSS refactor of the simulator

### Option D: Shared Module Architecture
- Extract scoring engine, crop data, and dialogue DB into importable files
- Both tools import shared modules
- **Con:** Violates CLAUDE.md's "single-file HTML tools" constraint

---

## 13. OPEN QUESTIONS FOR DECISION

1. **Is the dashboard a separate tool or a mode within the simulator?**
   If separate: it needs the simulator's scoring engine. If a mode: the simulator needs the dashboard's brand polish.

2. **Should the simulator adopt brand-doc tokens?**
   The `--sf-*` / `--sem-*` system works but diverges from BRAND_IDENTITY.md. Migration would be ~200 lines of CSS changes.

3. **View toggle (sun/water) — where does it live?**
   This is a genuinely useful planning feature. It could enhance the simulator's PLANNING phase.

4. **Harvest timeline (days-to-harvest) — is it gameplay or display?**
   The simulator doesn't track planting dates. The dashboard shows static `dth` values. Making this dynamic requires planting timestamps.

5. **Dexie vs localStorage — final call?**
   CLAUDE.md says localStorage. The dashboard uses Dexie. If multi-bed is on the roadmap, Dexie earns its weight. If not, localStorage is simpler and aligned.

6. **Four voice cards vs rotating narrator — which pattern?**
   The dashboard shows all 4 always. The simulator shows 1-3 contextually. The simulator's approach matches the VOICE_BIBLE.md intent.

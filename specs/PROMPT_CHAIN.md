# Garden OS — Executable Prompt Chain

> 10 prompts across 5 rounds. Each prompt is self-contained and copy-paste ready.
> Run Round 1 in parallel, then cascade through dependencies.
> Final output: `garden-league-simulator-v3.html` — the complete playable game.

---

## Execution Map

```
ROUND 1 (parallel):   P1  P2  P3  P4  P7
ROUND 2 (parallel):   P5  P6
ROUND 3 (sequential): P8
ROUND 4 (sequential): P9
ROUND 5 (sequential): P10
```

---

## Shared Context Block

> Paste this at the top of every prompt in the chain.

```
PROJECT: Garden OS
THESIS: Make a tiny space feel emotionally meaningful and strategically dense.
TONE: No fantasy. No whimsy. Philadelphia backyard. Dry humor. Earned sentiment.
TECH: Single HTML file. Vanilla JS. localStorage. Offline-capable. No frameworks. No build tools.
SCOPE: 12-chapter campaign (6-8 hour playthrough). 8x4 raised bed. 20 crops. 40 events.
SETTING: South Philadelphia rowhome backyard. Mom built the bed. She does not garden anymore. The player inherited it.
CHARACTERS: Garden GURL (scoring judge, dry), Onion Man (emotional reactor, Phillies fan), Vegeman (chaos tutorial agent), Garden Critters (collective nuisance voice).
ART DIRECTION: Editorial Realism + Graphic Overlays. Grounded backyard environment with bold comic character inserts and utility UI. Not cozy. Not children's game. Not fantasy.
DESIGN PILLAR: Partial irreversibility. Once a season starts, most placements lock. Interventions are scarce. Consequences carry forward.
```

---

## ROUND 1 — Foundation Specs (all parallel)

---

### PROMPT 1: The Unified Narrative Spec

**Output file:** `specs/NARRATIVE_SPEC.md`

```
You are a narrative systems designer synthesizing multiple design documents into a single playable story specification.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS (provided below or as attachments):
- CAMPAIGN_DESIGN.md (12 chapters with mechanics, scores, narrative beats)
- VOICE_BIBLE.md (4 character voices, trigger rules, frequency caps, writer rules)
- GAME_DESIGN_CRITIQUE.md (emotional register warnings, anti-sentimentality filter)

TASK:
Produce a single linear narrative specification that tells the complete story of Garden OS from Chapter 1 ("First Light") through Chapter 12 ("Endures").

For each chapter, write:
1. OPENING — what the player sees and hears when the chapter starts (2-3 sentences of stage direction)
2. MECHANIC INTRODUCTION — how the new mechanic is taught through character dialogue, not tutorial text
3. MID-CHAPTER BEAT — one narrative moment that fires during gameplay (tied to a specific game state trigger)
4. SUCCESS RESOLUTION — what happens when the player meets the score target (GURL line + Onion Man line + unlock)
5. FAILURE RESOLUTION — what happens when they don't (GURL line + Onion Man line + what changes)
6. TRANSITION — how this chapter hands off to the next (1-2 sentences)

Additionally, write:
- The CHAPTER 11 SAUCE SEQUENCE in full — this is the emotional apex. Write it beat by beat: what appears on screen, what GURL says, what Onion Man says, how the harvest list is presented, and the exact moment the recipe connection is made. Do not rush this. Do not make it sentimental. Make it land through specificity.
- The CHAPTER 12 EPILOGUE — GURL's final assessment (her longest speech: exactly 3 sentences) and Onion Man's final line (his shortest: exactly 1 sentence).
- A CHARACTER ARC TABLE showing how each character's voice shifts across the 12 chapters (1 row per chapter, 1 column per character, 1 phrase describing their stance).

CONSTRAINTS:
- Every GURL line must sound like a zoning complaint with a clipboard.
- Every Onion Man line must sound like a guy getting emotional about tomatoes and summer.
- Every Vegeman line must sound like a bad idea pitched with dangerous confidence.
- Every Critter line must sound like a nuisance report from the yard itself.
- No character uses em dashes, ellipses for drama, or the word "journey."
- Mom is never shown. She is referenced. The bed is her presence.
- No line should beg the player to feel something. The feeling arrives through precision.

FORMAT: Markdown. Chapter sections clearly delineated. Dialogue in quotes with character name prefix.
```

---

### PROMPT 2: The Season Engine Spec

**Output file:** `specs/SEASON_ENGINE_SPEC.md`

```
You are a systems designer producing an implementable state machine specification for a turn-based strategy game.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS:
- GAME_DESIGN_ANALYSIS.md (core loop: Plan > Commit > Weather 3 beats > Intervene > Harvest > Carry Forward; intervention types; tension sources)
- SEASONAL_EVENT_SYSTEM.md (40 events, 5 mechanical channels, draw rules, event categories)
- GAME_DESIGN_CRITIQUE.md (partial irreversibility requirement, 3-beat structure mandate)

TASK:
Produce the complete mechanical specification for how a single season plays in Garden OS. A developer should be able to implement this directly from your document.

Write the following sections:

1. STATE MACHINE — Define every game state and every valid transition:
   - PLANNING: player places/removes crops freely. No timer. Layout is mutable.
   - COMMIT: player locks the layout. Confirmation required. After commit, individual cells cannot be freely edited. This is the irreversibility gate.
   - EARLY_SEASON: first beat resolves. One event draws from the seasonal pool. Player sees the event, its effect, and gets one intervention token.
   - MID_SEASON: second beat resolves. One event draws. One intervention token.
   - LATE_SEASON: third beat resolves. One event draws. One intervention token. This is the last chance to act.
   - HARVEST: scoring runs on final bed state. Yield is calculated. Recipe ingredients are checked. Results display.
   - REVIEW: score, violations, narrator commentary, journal update, carry-forward state computed.
   - TRANSITION: hand off to next chapter or end campaign.

2. INTERVENTION SYSTEM — Define exactly what the player can do with one intervention token per beat:
   - SWAP: exchange one cell's crop with an adjacent cell
   - PRUNE: remove one crop to prevent spread of a negative event
   - PROTECT: shield one cell from the current beat's event effect
   - MULCH: boost one cell's score by +0.5 for the remainder of the season
   - COMPANION_PATCH: add a temporary companion bonus to one cell for the current beat
   - ACCEPT_LOSS: do nothing; save the token for a future beat (tokens do not accumulate across seasons)

3. EVENT DRAW RULES — How events are selected:
   - Each season has a pool of 10 events (from SEASONAL_EVENT_SYSTEM.md)
   - 3 events are drawn per season (one per beat), weighted by: season, planted crop types, and chapter number
   - No event repeats within the same season
   - At least one event per season must be negative or mixed; at least one must offer a positive or neutral outcome
   - Events modify specific cells, rows, or factions — never the entire bed at once

4. SCORING INTEGRATION — How the 6 scoring factors interact with events and interventions:
   - Base score is calculated per cell using: Sun, Support, Shade, Access, Season, Adjacency
   - Events apply modifiers to specific cells (penalty or buff)
   - Interventions modify cell states before the next scoring pass
   - Final harvest score is the average across all planted cells after all 3 beats resolve
   - Yield output counts crop types present at harvest (for recipe tracking)

5. CARRY-FORWARD RULES — What persists to the next season:
   - Soil fatigue: heavy-feeding crops in consecutive seasons reduce base score by 0.3 per cell
   - Infrastructure: trellises, mulch applied via intervention persist
   - Recipe pantry: harvested crop types accumulate toward recipe goals
   - Event memory: some events have carry-forward effects (e.g., "compacted soil" from foot traffic event)

6. EDGE CASES — Define behavior for:
   - Empty bed at commit (block: require minimum 8 planted cells)
   - Full bed (all 32 cells): no special bonus, but enables "Full House" chapter objective
   - Player uses no interventions all season: valid, no penalty
   - All 3 events are negative: guaranteed by draw rules to not happen (at least one neutral/positive)

FORMAT: Markdown with clear section headers. State transitions as labeled arrows. Data types specified for all values. Include a summary state diagram at the top.
```

---

### PROMPT 3: The Progression Weave

**Output file:** `specs/PROGRESSION_SPEC.md`

```
You are a progression systems designer producing a complete unlock and carryover specification.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS:
- PROGRESSION_SYSTEMS.md (between-season carryover, recipe tiers, mastery ranks, keepsakes, character dialogue evolution)
- REPLAYABILITY.md (fixed vs variable table, challenge modifiers, play style support)
- CAMPAIGN_DESIGN.md (12 chapters with unlock rewards per chapter)

TASK:
Produce a single progression specification table that maps every unlock, carryover, and state mutation across all 12 chapters.

Write:

1. CHAPTER UNLOCK TABLE — For each of the 12 chapters:
   | Chapter | Mechanic Unlocked | UI Feature Unlocked | Crop Roster Change | Recipe Available | Keepsake Earned | Narrator Shift |

2. BETWEEN-SEASON STATE — For each season transition (11 transitions):
   | From → To | Soil State Change | Pantry Update | Journal Entry | Bed Condition | Character Memory |

3. RECIPE PROGRESSION — The complete recipe ladder:
   - 7 recipes from herb bowl to Mom's sauce
   - Each recipe: required ingredients, which chapters they become achievable, narrative artifact on completion
   - Mom's 5 hidden recipes: trigger conditions, discovery moment, journal presentation

4. MASTERY RANK CALCULATION — How the 6 ranks are computed:
   - Inputs: score consistency, objective completion, salvage quality, recipe milestones, challenge medals
   - Thresholds for each rank (Bedhand through Legacy Keeper)
   - The hidden rank ("Her Daughter's Garden"): exact trigger conditions

5. KEEPSAKE MANIFEST — All memory objects:
   - Trigger condition, chapter earned, visual presentation, persistence rules
   - Include: Mom's Trowel, First Seed Packet, Onion Man's Scorecard, The Photo, First Frost Marker, Block Party Plate, Handwritten Sauce Card

6. CHALLENGE MODIFIER UNLOCKS — When and how the 7 modifiers become available:
   - All unlocked after first campaign completion
   - Each modifier: mechanical effect, fiction framing, interaction with other modifiers

CONSTRAINTS:
- No system should exist that doesn't produce a decision for the player or a feeling in the player.
- If a system only adds bookkeeping, cut it.
- Progression should feel like accumulated competence, not collected points.

FORMAT: Markdown tables throughout. One master table per section. No prose padding.
```

---

### PROMPT 4: The Crop & Scoring Bible

**Output file:** `specs/CROP_SCORING_DATA.json` + `specs/SCORING_RULES.md`

```
You are a game data architect producing the definitive crop roster and scoring specification.

[PASTE SHARED CONTEXT BLOCK]

INPUT DATA (existing prototype crop roster — 20 crops):
cherry_tom, pole_beans, peas, radish, lettuce, arugula, broccoli, kale, carrot, onion, beet, spinach, chard, basil, dill, pepper, zucchini, marigold, nasturtium
(Each has: name, emoji, short, faction, sunMin, sunIdeal, support, shadeScore, coolSeason, tall, water, companions[], conflicts[])

INPUT DOCUMENTS:
- GAME_DESIGN_ANALYSIS.md (6 scoring factors, tension sources)
- SEASONAL_EVENT_SYSTEM.md (event modifiers on crops)
- CAMPAIGN_DESIGN.md (which crops/factions unlock per chapter)

TASK:
Produce two files:

FILE 1: CROP_SCORING_DATA.json
A complete JSON data file containing:
- All 20 crops with every attribute needed by the scoring engine
- Per-crop seasonal multipliers (spring, summer, fall — 0.0 to 1.0)
- Companion and conflict relationships as crop ID arrays
- Faction membership
- Chapter unlock (which chapter makes this crop available; all available by Chapter 9)
- Recipe participation (which recipes this crop contributes to)
- Event vulnerability tags (e.g., "heat-sensitive", "pest-target", "frost-hardy")

FILE 2: SCORING_RULES.md
The complete scoring formula documentation:
- Per-cell score calculation: how each of the 6 factors (Sun, Support, Shade, Access, Season, Adjacency) is computed
- Factor weights and combination formula
- Event modifier application (how event penalties/buffs adjust cell scores)
- Intervention modifier application (how interventions adjust cell scores)
- Harvest yield calculation (how crop types are counted for recipe tracking)
- Soil fatigue calculation (how consecutive heavy-feeding reduces scores)
- Score aggregation (per-cell → season average → grade)
- Grade thresholds (A through F with exact numeric boundaries)

CONSTRAINTS:
- Determinism is sacred. Same inputs must always produce same outputs.
- No hidden modifiers. Every score component must be traceable.
- JSON must be valid and parseable. Use comments only in the .md file.
- Crop balance: no single crop should be strictly dominant. Every faction should have at least one strong use case.

FORMAT: Valid JSON for the data file. Markdown with formulas for the rules file.
```

---

### PROMPT 7: The UI & Feel Spec

**Output file:** `specs/UI_SPEC.md`

```
You are a UI systems designer and motion director producing a developer-ready interface specification.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS:
- GAME_FEEL.md (feedback priority matrix, placement/harvest/score animations, easing curves, sound design, reduced-motion rules)
- ART_DIRECTION.md (Editorial Realism + Graphic Overlays direction, color logic, texture language, character rendering, UI integration rules)
- Existing v2.html UI component list: crop panel, 8x4 board, score card (ring + grade + factor bars), violation list, narrator box, event log, history list, challenge strip, status bar, tooltip, toast, sim overlay

TASK:
Produce the complete UI specification for Garden OS v3. A frontend developer should be able to build the interface from this document alone.

Write:

1. COMPONENT INVENTORY — Every UI component with:
   - Purpose, location, size, z-index layer
   - States (default, hover, active, disabled, loading, error)
   - Content model (what data it displays)
   - Responsive behavior at 320px, 768px, 1440px

2. LAYOUT SYSTEM — The page structure:
   - 3-column layout at desktop (crop panel | board | results)
   - 2-column at tablet (controls + board | results below)
   - Single column at mobile (controls → board → results)
   - The board is always the visual anchor and gets the most space

3. COLOR TOKEN SYSTEM — CSS custom properties for:
   - Seasonal palettes (spring, summer, fall, winter) — each with ground, growth, sky layers
   - Semantic colors (good, warn, hard, companion, neutral)
   - Surface hierarchy (bg, panel, card, field, overlay)
   - Character accent colors (GURL: muted authority, Onion Man: warm gold, Vegeman: electric green, Critters: terracotta)

4. TYPOGRAPHY SYSTEM — Font stack, size scale, weight usage:
   - Headings: editorial serif or strong sans (suggest Fraunces or Libre Baskerville)
   - Body: clean readable sans (suggest DM Sans or Inter)
   - Mono/data: monospaced for scores, grid coordinates, system text (suggest DM Mono or JetBrains Mono)
   - Size scale: 10px labels → 13px body → 16px subheads → 22px section heads → 32px score display

5. ANIMATION SPEC — Every animated element with:
   - Trigger condition
   - CSS properties animated
   - Duration and easing curve (use the 4 standard curves from GAME_FEEL.md)
   - Reduced-motion fallback

6. BOARD RENDERING — The 8x4 grid specifically:
   - Cell states: empty, planted, committed, event-affected, harvested, intervention-target
   - Zone indicators: trellis rows vs access rows (visual differentiation)
   - Post-simulation overlays: good/warn/hard borders, companion threads, score labels
   - Soil texture treatment for empty cells
   - Plant bounce animation on placement

7. SCORE REVEAL SEQUENCE — The complete post-harvest UI flow:
   - Factor-by-factor count-up (6 factors, 800ms apart)
   - Ring gauge fill animation
   - Grade badge entrance
   - Narrator commentary timing (GURL 500ms after grade, Onion Man 1200ms after GURL)

8. EVENT CARD COMPONENT — How disruptions present:
   - Card entrance animation (slide-up from bottom, 500ms)
   - Positive/negative/mixed visual differentiation
   - Intervention option buttons within the card
   - Dismissal animation

9. SEASONAL TRANSITION — How the UI shifts between seasons:
   - Color token swap (which properties change)
   - Background treatment shift
   - Cross-fade timing (3-4 seconds)

10. PRINT / EXPORT — How the season recap renders for sharing:
    - Screenshot-ready recap card layout
    - Shareable garden portrait format

CONSTRAINTS:
- Must work as embedded CSS in a single HTML file (no external stylesheets)
- No CSS frameworks. Custom properties + vanilla CSS only.
- Must include prefers-reduced-motion support for every animation
- Must include prefers-color-scheme: dark support
- All touch targets minimum 44px
- All text must meet WCAG AA contrast (4.5:1 for body, 3:1 for large text)

FORMAT: Markdown with CSS code blocks for specific implementations. Component specs as tables.
```

---

## ROUND 2 — Dependent Specs (parallel)

---

### PROMPT 5: The Dialogue Engine

**Output file:** `specs/DIALOGUE_ENGINE.json` + `specs/DIALOGUE_SYSTEM.md`

**Dependency:** Requires NARRATIVE_SPEC.md from Prompt 1.

```
You are a dialogue systems designer producing the complete line database for a narrative strategy game.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS:
- VOICE_BIBLE.md (character constraints, trigger rules, 1-in-3 frequency cap, writer rules)
- NARRATIVE_SPEC.md (from Prompt 1 — chapter-specific character lines and arc progression)
- GAME_FEEL.md (character reaction timing: 600-800ms for placements, 1.5s for harvest, 500ms for score)

TASK:
Produce two files:

FILE 1: DIALOGUE_ENGINE.json
A complete JSON database of every dialogue line in the game, structured as:

{
  "triggers": {
    "placement_trellis_correct": {
      "gurl": ["line1", "line2", ...],
      "onion": ["line1", "line2", ...],
      "vegeman": ["line1", "line2", ...],
      "critters": ["line1", "line2", ...]
    },
    "placement_trellis_wrong": { ... },
    ...
  }
}

TRIGGER CATEGORIES (minimum 8 lines per character per category):
- placement_trellis_correct
- placement_trellis_wrong
- placement_companion_found
- placement_conflict_found
- placement_generic
- placement_first_crop (Chapter 1 only)
- placement_full_bed (all 32 cells filled)
- simulation_score_high (avg >= 8.0)
- simulation_score_mid (avg 5.5-7.9)
- simulation_score_low (avg < 5.5)
- simulation_hard_violation
- event_positive
- event_negative
- event_mixed
- intervention_used
- intervention_skipped
- harvest_good_yield
- harvest_poor_yield
- harvest_sauce_ingredients_complete
- challenge_accepted
- challenge_passed
- challenge_failed
- season_spring_start
- season_summer_start
- season_fall_start
- season_winter_review
- chapter_11_sauce_moment
- chapter_12_epilogue
- phillies_spring (opening day hope)
- phillies_summer (midseason grind)
- phillies_fall (playoff tension)
- phillies_winter (hot stove speculation)
- mom_memory (triggered by specific crop combinations)

FILE 2: DIALOGUE_SYSTEM.md
The selection logic:
- How triggers fire (game state → trigger key lookup)
- How lines are selected within a pool (random within pool, but deterministic per trigger)
- The 1-in-3 frequency rule implementation (placement triggers only)
- Speaking order: GURL first, then Onion Man (Vegeman only in tutorials/chaos, Critters only on events)
- Timing delays per trigger type (from GAME_FEEL.md)
- How chapter-specific lines override generic pools
- How character arc progression modifies available pools (Year 1 vs Year 2 vs Year 3 variants)

CONSTRAINTS:
- Every line must pass the Voice Bible recognition test (identifiable without character label)
- No em dashes. No ellipses for drama. No "journey."
- Phillies references are seasonal (spring: hope, summer: grind, fall: tension, winter: speculation)
- Mom lines must be specific (a crop, a habit, a place in the bed) not generic ("she loved this garden")
- Vegeman lines must be structurally wrong but entertainingly confident
- Critter lines must be terse, observational, and indifferent to player feelings

FORMAT: Valid JSON for the data file. Markdown for the system doc.
```

---

### PROMPT 6: The Event Deck

**Output file:** `specs/EVENT_DECK.json`

**Dependency:** Requires SEASON_ENGINE_SPEC.md from Prompt 2.

```
You are an event systems designer producing the complete event card database.

[PASTE SHARED CONTEXT BLOCK]

INPUT DOCUMENTS:
- SEASONAL_EVENT_SYSTEM.md (40 events across 4 seasons, 5 mechanical channels, draw rules)
- SEASON_ENGINE_SPEC.md (from Prompt 2 — how events resolve within 3-beat structure)
- VOICE_BIBLE.md (character commentary rules per event type)

TASK:
Produce a single JSON file containing all 40 event cards.

Each event card must include:
{
  "id": "S01",
  "title": "Late Frost Warning",
  "season": "spring",
  "category": "weather",
  "valence": "negative",
  "description": "Overnight temperatures drop below 32. Warm-season crops in exposed cells take damage.",
  "mechanicalEffect": {
    "channel": "cell_penalty",
    "target": "crops where coolSeason === false",
    "modifier": -1.5,
    "duration": "current_beat"
  },
  "interventionOptions": ["protect", "prune", "accept_loss"],
  "carryForward": null,
  "commentary": {
    "gurl": "Frost advisory confirmed. Warm-season crops in unprotected cells will take the hit. This was forecastable.",
    "onion": "I can feel it in the air. The peppers are not going to like this. Neither am I.",
    "vegeman": "Frost? Just water everything right before it hits. The ice insulates. Trust me. Do not trust me.",
    "critters": "Cold snap. Soft tissue exposed. Checking."
  },
  "chapterAvailability": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  "drawWeight": 1.0
}

Produce all 40 events:
- 10 spring events (S01-S10)
- 10 summer events (U01-U10)
- 10 fall events (F01-F10)
- 10 winter events (W01-W10)

Distribution requirements:
- Each season: at least 3 negative, 2 positive, 2 mixed, 3 neutral/variable
- At least 4 Phillies-flavored events (1 per season)
- At least 6 neighbor events
- At least 6 critter events
- At least 6 weather events
- At least 4 family/memory events

CONSTRAINTS:
- No magic. No apocalypse. Everything believable for a South Philly backyard.
- Events target specific zones, factions, or crop types — never the whole bed.
- Every event must create a real decision (intervene or accept).
- Commentary must match Voice Bible character constraints exactly.
- Winter events are narrative/carry-forward only (no active bed to affect).

FORMAT: Valid JSON array. One object per event. 40 total.
```

---

## ROUND 3 — Core Engine Build

---

### PROMPT 8: Build — Core Engine

**Output file:** `garden-league-simulator-v3.html` (engine only)

**Dependencies:** Requires Prompts 2 (Season Engine), 4 (Crop Data), 6 (Event Deck).

```
You are a senior JavaScript engineer building a single-file HTML game engine.

[PASTE SHARED CONTEXT BLOCK]

INPUT SPECIFICATIONS:
- SEASON_ENGINE_SPEC.md (complete state machine: PLANNING > COMMIT > EARLY/MID/LATE_SEASON > HARVEST > REVIEW)
- CROP_SCORING_DATA.json (20 crops with all attributes)
- EVENT_DECK.json (40 events with mechanical effects)
- SCORING_RULES.md (6-factor scoring formula)
- Existing garden-league-simulator-v2.html (as scaffold reference for crop roster, grid rendering, basic UI)

TASK:
Generate a complete, working single-file HTML game with the core engine implemented:

ENGINE REQUIREMENTS:
1. STATE MACHINE — Implement all states from SEASON_ENGINE_SPEC.md with clean transitions
2. GRID MODEL — 8x4 grid (32 cells), each cell stores crop ID or null, with zone metadata (trellis/access)
3. PLANNING PHASE — Free placement/removal of crops. Season and chapter selection.
4. COMMIT PHASE — Lock the layout. Confirmation dialog. After commit, cells are immutable except via interventions.
5. 3-BEAT SEASON — Early, mid, late beats. Each beat: draw event from pool, display event, offer intervention choice, resolve effects, update grid state.
6. INTERVENTION SYSTEM — 6 intervention types (swap, prune, protect, mulch, companion_patch, accept_loss). One token per beat. Tokens do not accumulate.
7. EVENT SYSTEM — Draw 3 events per season from the 40-event deck. Apply mechanical effects to targeted cells. Respect draw rules (no repeats, valence balance).
8. SCORING ENGINE — 6-factor per-cell scoring (Sun, Support, Shade, Access, Season, Adjacency) with event and intervention modifiers applied. Season average calculated.
9. HARVEST — Count crop types present. Check against recipe ingredient lists. Calculate yield.
10. REVIEW — Display score, grade, violations, factor breakdown. Prepare carry-forward state.
11. PERSISTENCE — Save game state to localStorage. Score history (last 10). Current chapter progress.

UI REQUIREMENTS (minimal — polish comes in Prompt 10):
- Crop selector panel (left)
- 8x4 grid board (center) with zone indicators and cell states
- Results panel (right) with score, grade, violations, narrator placeholder
- Season/chapter display
- Commit button, intervention buttons, advance-beat button
- Event card display area
- Status text

CODE REQUIREMENTS:
- Single HTML file with embedded CSS and JS
- Strict mode IIFE
- No external dependencies
- Clean state management (single state object)
- All DOM manipulation via createElement/replaceChildren (no innerHTML for user data)
- Deterministic scoring (same inputs = same outputs always)
- localStorage persistence with try/catch error handling

DO NOT IMPLEMENT YET:
- Campaign chapter progression (Prompt 9)
- Dialogue system (Prompt 9)
- Narrator commentary (Prompt 9)
- Visual polish, animations, or seasonal color shifts (Prompt 10)
- Sound design (Prompt 10)

The goal is a mechanically complete, playable engine that can be tested: place crops, commit, advance through 3 beats with events, spend interventions, harvest, see score. Ugly is fine. Working is mandatory.
```

---

## ROUND 4 — Narrative Layer

---

### PROMPT 9: Build — Narrative & Campaign Layer

**Output file:** Updated `garden-league-simulator-v3.html`

**Dependencies:** Requires Prompts 1 (Narrative Spec), 3 (Progression Spec), 5 (Dialogue Engine), and the v3 engine from Prompt 8.

```
You are a senior JavaScript engineer adding the narrative and campaign layer to an existing game engine.

[PASTE SHARED CONTEXT BLOCK]

INPUT:
- The working v3 engine HTML file (from Prompt 8)
- NARRATIVE_SPEC.md (12 chapters with openings, beats, resolutions, character arcs)
- PROGRESSION_SPEC.md (unlock table, carryover rules, recipe tracking, mastery ranks)
- DIALOGUE_ENGINE.json (complete line database keyed to trigger states)
- DIALOGUE_SYSTEM.md (selection logic, frequency rules, timing, speaking order)

TASK:
Layer the complete campaign and narrative system onto the existing engine. The result must be playable from Chapter 1 through Chapter 12.

ADD:

1. CAMPAIGN SYSTEM
   - Chapter progression: linear unlock (1 → 2 → ... → 12)
   - Chapter state: current chapter, completed chapters, best scores per chapter
   - Chapter start screen: title, year/season, narrator opening lines, mechanic hint
   - Chapter end: success/failure resolution, narrator lines, unlock notification, transition

2. CHAPTER-SPECIFIC MECHANICS
   - Chapters 1-3: progressive mechanic introduction (placement → trellis → adjacency)
   - Chapters 4, 8, 12: winter review chapters (no planting, show history/journal/reflection)
   - Chapter 5: faction diversity bonus active
   - Chapter 6: first seasonal event (heatwave)
   - Chapter 7: row objective (front row = roots)
   - Chapter 9: challenge system active
   - Chapter 10: full bed required (32 cells)
   - Chapter 11: harvest inventory checked against sauce recipe

3. DIALOGUE INTEGRATION
   - Load DIALOGUE_ENGINE.json data inline
   - Implement trigger → pool → random selection logic
   - 1-in-3 frequency cap for placement triggers
   - GURL speaks first (500ms after trigger), Onion Man second (1200ms after GURL)
   - Vegeman appears only in Chapters 2, 10, and chaos mode
   - Critters speak only during event resolution
   - Chapter-specific lines override generic pools where defined

4. PROGRESSION SYSTEM
   - Between-season: soil fatigue, pantry update, journal entry, bed condition
   - Recipe tracking: ingredients accumulate across seasons; recipe completion triggers narrative artifact
   - Mastery rank: computed at campaign end from cumulative performance
   - Keepsakes: Mom's Trowel (Ch1), First Seed Packet (first save), The Photo (Ch8), Sauce Card (Ch11)

5. CHAPTER 11 SAUCE SEQUENCE
   - After harvest scoring, check if planted crops include: tomato, basil, pepper, onion, carrot
   - If yes: display harvest list one ingredient at a time (400ms stagger), then GURL's yield calculation, then Onion Man's line: "She would have made sauce with this. I am not crying. The onion is crying."
   - If no: display what's missing, Onion Man's "almost" line, motivation to retry

6. JOURNAL SYSTEM
   - Persistent record across chapters: planting log, harvest record, technique notes
   - Mom's Pages: unlock one per chapter (handwritten-style content)
   - Viewable from winter review chapters and main menu

7. CHAPTER 12 EPILOGUE
   - No planting. Display full 12-chapter history.
   - GURL's final assessment (3 sentences based on cumulative performance)
   - Onion Man's final line (1 sentence)
   - Mastery rank reveal
   - "The bed is ready for next year" — free play unlocks

CONSTRAINTS:
- Do not break any existing engine functionality from Prompt 8
- All new content is additive — the engine layer remains unchanged
- Campaign state persists in localStorage
- Player can always return to free play mode (sandbox) from the main menu
- No chapter is skippable on first playthrough
- Winter chapters are interactive (browsable journal) not just text screens
```

---

## ROUND 5 — Visual Polish

---

### PROMPT 10: Build — UI, Feel & Polish

**Output file:** Final `garden-league-simulator-v3.html`

**Dependencies:** Requires Prompt 7 (UI Spec) and the v3 with narrative from Prompt 9.

```
You are a senior frontend engineer and motion designer applying the complete visual and interaction layer to an existing game.

[PASTE SHARED CONTEXT BLOCK]

INPUT:
- The working v3 HTML file with engine + narrative (from Prompt 9)
- UI_SPEC.md (component inventory, layout system, color tokens, typography, animation spec, board rendering, score reveal sequence, event card component)
- GAME_FEEL.md (feedback priority, placement/harvest/score animations, sound design notes, reduced-motion rules)
- ART_DIRECTION.md (Editorial Realism + Graphic Overlays, seasonal color logic, texture language)

TASK:
Apply the complete visual identity and interaction layer. The result must be the final, shippable game.

IMPLEMENT:

1. COLOR TOKEN SYSTEM
   - CSS custom properties for all seasonal palettes
   - Semantic color tokens (good, warn, hard, companion)
   - Season-switching logic: when chapter changes season, swap the active palette
   - Dark mode support via prefers-color-scheme

2. TYPOGRAPHY
   - Load DM Sans (body), Fraunces (headings), DM Mono (data/system) from Google Fonts
   - Apply the type scale from UI_SPEC.md

3. LAYOUT POLISH
   - 3-column → 2-column → 1-column responsive breakpoints
   - Board always gets priority space
   - All touch targets 44px minimum
   - Skip-nav link for accessibility

4. BOARD VISUAL UPGRADE
   - Soil texture on empty cells (CSS layered radial gradients)
   - Trellis/access row visual differentiation
   - Planted cell state (subtle green inner glow)
   - Post-simulation overlays (good/warn/hard with background tints, not just borders)
   - Plant bounce animation on placement (scale 0.85→1.0, 180ms, overshoot ease)
   - Companion thread indicators between adjacent companions

5. SCORE REVEAL ANIMATION
   - Factor-by-factor count-up (6 factors, 800ms stagger)
   - SVG ring gauge that fills proportionally
   - Score number count-up (0 to final over 500ms)
   - Grade badge entrance (scale 0→1, bounce ease)
   - Factor bars animate width (transition: width 0.4s ease-out)

6. EVENT CARD ANIMATION
   - Slide-up entrance from bottom (60px travel, 500ms expo-out)
   - Garden dims to 70% during event display
   - Positive/negative/mixed border color differentiation
   - Dismissal slide-down + fade

7. SEASONAL TRANSITION
   - Cross-fade between seasonal color palettes (3s ease-in-out)
   - Background treatment shifts with season

8. HARVEST SEQUENCE
   - Staggered crop collection (120ms delay per cell, diagonal sweep)
   - Per-crop pluck sound placeholder (visual bounce for now)
   - Harvest counter bounce on increment
   - Soil rest color shift on emptied cells

9. CHARACTER REACTION PRESENTATION
   - Narrator panel with character portrait, name, role
   - Text fade-in (200ms, paired with 12px upward slide)
   - 1-in-3 frequency means most placements show no reaction (panel stays on last message)

10. REDUCED-MOTION MODE
    - Respect prefers-reduced-motion: reduce
    - Replace all scale/position animations with 150ms opacity crossfades
    - Staggered sequences become simultaneous with 200ms crossfade
    - Score count-up shows final value immediately
    - All content and feedback remains identical

11. ACCESSIBILITY
    - Roving tabindex on grid (arrow key navigation)
    - Focus-visible outlines (2px solid accent, 2px offset)
    - ARIA labels on all interactive elements
    - Modal focus trap on event cards and confirmation dialogs
    - WCAG AA contrast on all text

12. PRINT/SHARE
    - Print stylesheet that renders a clean season recap
    - Screenshot-optimized layout mode (optional toggle)

CONSTRAINTS:
- Single HTML file. All CSS and JS inline.
- No external dependencies except Google Fonts (loaded via <link>)
- Must work fully offline after first font load (fonts degrade gracefully to system stack)
- No !important in CSS except print media query
- All animations must have reduced-motion fallbacks
- The game must remain mechanically identical — this prompt only changes presentation

The final file should be openable in any modern browser and immediately playable as a complete 12-chapter narrative strategy game about one raised bed in South Philadelphia.
```

---

## Post-Chain Verification Checklist

After all 10 prompts complete:

- [ ] Open `garden-league-simulator-v3.html` in Chrome, Firefox, Safari
- [ ] Start Chapter 1 — verify opening narration fires
- [ ] Place crops — verify placement animation and 1-in-3 narrator reaction
- [ ] Commit layout — verify cells lock and commit confirmation works
- [ ] Advance through 3 beats — verify events draw, display, and resolve
- [ ] Use one intervention — verify cell modification and token consumption
- [ ] Complete harvest — verify score count-up, grade, factor bars animate
- [ ] Advance to Chapter 2 — verify trellis mechanic introduces
- [ ] Skip to Chapter 11 (dev shortcut) — verify sauce ingredient check
- [ ] Plant tomato + basil + pepper + onion + carrot — verify Onion Man's sauce line fires
- [ ] Complete Chapter 12 — verify epilogue, mastery rank, free play unlock
- [ ] Test at 320px viewport — verify single-column layout, playable grid
- [ ] Test at 1440px viewport — verify 3-column layout, generous spacing
- [ ] Enable reduced-motion in OS settings — verify all animations replaced with fades
- [ ] Refresh browser — verify localStorage persistence (chapter progress, scores, journal)
- [ ] Clear localStorage — verify clean start works

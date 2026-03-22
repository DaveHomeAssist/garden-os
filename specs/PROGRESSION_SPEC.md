# Garden OS — Progression & Unlock Specification

Version: 1.1 · Date: 2026-03-22

---

## 1. Chapter Unlock Table

Each chapter = one season of play (spring, summer, or fall). Chapters 1-4 cover Year 1. Chapters 5-8 cover Year 2. Chapters 9-12 cover Year 3. Unlocks are permanent and persist across all future seasons.

| Ch | Season | Mechanic Unlocked | UI Feature Unlocked | Crop Roster Change | Recipe Available | Keepsake Earned | Narrator Shift |
|----|--------|-------------------|--------------------|--------------------|-----------------|----------------|----------------|
| 1 | Y1 Spring | Cell inspection + score explanation | **Crop Notes panel** — per-cell text annotations visible on hover | Starter 8: tomato, basil, pepper, onion, lettuce, radish, bean, marigold | Herb Bowl | **Mom's Trowel** — awarded on first cell placement | GURL introduces herself as code enforcement; Onion Man is background noise; Vegeman absent |
| 2 | Y1 Summer | Trellis assignment — player chooses which row gets trellis support | **Trellis Zone overlay** — highlights eligible climb rows, drag-toggle | +cucumber, +zucchini (trellis crops) | Grilled Veg Side | — | GURL cites a specific violation; Onion Man offers unsolicited tomato advice; Vegeman first appearance (farmers market flyer) |
| 3 | Y1 Fall | Adjacency scoring active — companion/conflict pairs affect yield | **Adjacency Preview** — green/red borders on hover showing companion/conflict | +carrot, +kale (cool-season) | Tomato Sandwich | — | GURL notices the bed looks intentional; Onion Man references "your mother's rows"; Vegeman suggests buying instead of growing |
| 4 | Y1 Winter | Season review + between-season carryover system activates | **Season Journal** — best/worst row recap, yield log, tactical notes | No new crops (winter planning only) | Weeknight Pasta | — | All characters reflect on Year 1; journal captures first memory entry |
| 5 | Y2 Spring | Faction reputation tracking — GURL/Onion Man/Vegeman approval meters (hidden, behavior-driven) | **Faction Filter** — toggle to see which characters react to current layout | +eggplant, +chard | Pepper-Onion Skillet | — | GURL softens ("I see you fixed the setback"); Onion Man reveals he knew Mom; Vegeman escalates (restaurant coupon) |
| 6 | Y2 Summer | Event probability revealed — critter/weather/neighbor events show likelihood before season starts | **Event Forecast panel** — 3 upcoming event slots with % chance and severity icon | +hot pepper, +okra | Late-Summer Sauce Prep | — | GURL warns about a specific upcoming event; Onion Man gives a weather read; Vegeman name-drops a competing garden |
| 7 | Y2 Fall | Row objectives — each row gets an optional goal (yield target, companion chain, recipe contribution) | **Row Objective system** — objective badge per row, progress bar, row-complete animation | +turnip, +parsnip (storage crops) | — | — | GURL acknowledges a completed row objective; Onion Man critiques row strategy; Vegeman offers to "help" with a row |
| 8 | Y2 Winter | Crop lineage — tracks which crops have been grown in which cells across seasons; soil memory | **Crop Lineage tags** — cell history popup showing past 4 seasons of that cell | No new crops (winter planning) | — | **The Photo** — Mom in the garden, surfaces during journal review | Characters reference specific past decisions; Onion Man: "She rotated the tomatoes too" |
| 9 | Y3 Spring | Challenge modifiers available — 7 optional difficulty mutators for any season | **Challenge Ladder** — modifier selection screen before season start, stacking rules | +watermelon, +cantaloupe (space-hungry) | — | — | GURL respects the garden ("I stopped writing you up"); Onion Man shares a real memory; Vegeman makes final pitch |
| 10 | Y3 Summer | Bed density scoring — reward for high-output layouts that maintain soil health | **Bed Density badge** — live density score in header, threshold indicators | +herb variants (Thai basil, oregano, cilantro) | — | — | Dialogue unlocks based on mastery rank; Onion Man gets quiet (a good sign) |
| 11 | Y3 Fall | Mom's recipe reconstruction — hidden recipes become findable through journal clues | **Mom's Recipe card** — handwritten-style card UI, ingredient checklist from pantry | No new crops | **Mom's Sauce** (apex recipe) | **Handwritten Sauce Card** — Mom's handwriting, stain marks | GURL: "Your mother would've passed inspection too"; Onion Man: "She never wrote it down for anyone else"; Vegeman concedes |
| 12 | Y3 Winter | Free play — all systems active, all crops available, legacy scoring begins | **Legacy View** — full garden history timeline, season-by-season replay, final score | Full roster unlocked (20 crops) | — | — | Characters deliver final lines; game enters free-play loop with challenge modifiers |

**Crop Roster Summary (20 campaign-track crops, cumulative):**

> **Note:** The full roster in `CROP_SCORING_DATA.json` (v3) contains 50 crops. The additional 30 are expansion-zone and biome-specific crops unlocked through the Let It Grow free-roam mode, not the 12-chapter campaign. This table tracks the campaign unlock sequence only.

| Chapter | Crops Added | Running Total |
|---------|-------------|---------------|
| 1 | tomato, basil, pepper, onion, lettuce, radish, bean, marigold | 8 |
| 2 | cucumber, zucchini | 10 |
| 3 | carrot, kale | 12 |
| 5 | eggplant, chard | 14 |
| 6 | hot pepper, okra | 16 |
| 7 | turnip, parsnip | 18 |
| 9 | watermelon, cantaloupe | 20 |
| 10 | Thai basil, oregano, cilantro (herb variants, not new slots — replace basil/marigold palette options) | 20 |

---

## 2. Between-Season State (11 Transitions)

Carryover fires at season end. Player reviews results, makes one forward-facing choice, then enters next chapter. Nothing is auto-optimized. Player sees consequences, decides what to accept.

| Transition | Soil State Change | Pantry Update | Journal Entry Type | Bed Condition | Character Memory |
|------------|-------------------|---------------|--------------------|---------------|------------------|
| Ch1 > Ch2 | Baseline established; no fatigue yet | Empty — first harvest hasn't happened | "First season" — records what was planted, not what was learned | Trellis wear: 0. Soil: neutral | GURL remembers first violation (or lack thereof). Onion Man remembers if tomatoes were planted. |
| Ch2 > Ch3 | Trellis-row soil gets +1 nitrogen from bean residue (if beans were grown) | Summer harvest: tomatoes, peppers, beans, herbs (quantity = yield score) | "What grew" — yield per row, surprise performer, disappointment | Trellis wear: 1 season. Soil: slight depletion in heavy-crop cells. | GURL tracks compliance streak. Onion Man notes trellis usage. Vegeman remembers if player visited market. |
| Ch3 > Ch4 | Companion-planted cells get +1 soil health; conflict cells get -1 | Fall harvest: carrots, kale, late peppers | "What worked together" — adjacency successes/failures noted | Trellis wear: 2 seasons (cosmetic rust note). Soil fatigue in cells with 2+ consecutive same-family crops. | All characters reference specific adjacency choices. |
| Ch4 > Ch5 | Winter rest resets fatigue by 1 step per cell. Player chooses 1 row to amend (full reset). | Pantry persists — nothing new from winter, but nothing lost | "Winter plan" — tactical intent for Year 2 + first personal memory | Trellis: repaired if player chose maintenance. Soil: partially recovered. | Year 1 summary colors all Year 2 dialogue. Onion Man references "last year's mistakes." |
| Ch5 > Ch6 | Faction-aligned planting adjusts soil (GURL-approved = code-compliant spacing; Onion Man = traditional rotation) | Spring harvest: lettuce, radish, chard, early herbs | "Who I listened to" — notes which character advice was followed | Soil responds to Year 2 rotation. Cells with 3+ same-family get "tired" tag. | Faction meters shift. Ignored character gets colder. Followed character gives better tips. |
| Ch6 > Ch7 | Event damage persists — storm-hit cells lose 1 soil health; drought cells get "dry" tag | Summer harvest: full yield + event-modified amounts | "What happened" — event log with player response recorded | Event damage visible: broken trellis section, pest marks on specific cells. | Characters reference events. Onion Man: "That storm got my beds too." GURL: "You handled it." |
| Ch7 > Ch8 | Row-objective completion grants +1 soil health to that row. Failed objectives: no penalty but no bonus. | Fall harvest: storage crops (turnip, parsnip) added to pantry. Pantry now has depth for recipes. | "What I aimed for" — row objectives attempted vs completed | Trellis wear: 4 seasons cumulative. Player chooses: repair, replace, or remove. | Onion Man reacts to row objective ambition. GURL notices pattern in layout. |
| Ch8 > Ch9 | Lineage data now visible — cells with 4+ season history show rotation health. Winter rest applies. | Pantry persists. Winter adds nothing. Recipe ingredients from pantry can now be "used" (consumed). | "What this ground remembers" — lineage reflection, The Photo memory | Full bed history visible. Soil fatigue map shows problem zones clearly. | The Photo triggers unique character lines. Onion Man: longest speech. GURL: brief, real. |
| Ch9 > Ch10 | Challenge modifier effects persist in soil (Drought Year = permanent dry tag on 2 cells; No-Till = +2 soil health bed-wide) | Spring harvest + challenge bonus/penalty applied to quantities | "What I chose to make harder" — challenge modifier reflection | Challenge damage/benefit layered onto existing condition. | Characters acknowledge difficulty. Onion Man respects challenge runs. Vegeman: "You could just buy tomatoes." |
| Ch10 > Ch11 | Density scoring creates a soil pressure map — high-density cells need amendment or rotation next season | Full summer harvest. Herb variants contribute unique pantry items for Mom's recipes. | "What this bed can hold" — density reflection, capacity acceptance | Peak bed complexity. Every cell has history, condition, lineage. | Mastery rank affects dialogue tone. High rank = peers. Low rank = continued mentorship. |
| Ch11 > Ch12 | Final fall harvest. Soil state becomes the "legacy baseline" — frozen as starting condition for free play. | **Mom's Sauce** ingredients consumed if recipe completed. Pantry state = legacy pantry. | "What she taught me" — final journal entry, written differently (first person, no game framing) | Bed condition = legacy condition. No more auto-repair. Player maintains from here. | Final character lines delivered. Free play uses shortened, familiar dialogue. |

**Between-Season Player Choice (1 of 2-3 modifiers per transition):**

| Transition | Option A | Option B | Option C |
|------------|----------|----------|----------|
| Ch1 > Ch2 | Add trellis to back row | Add trellis to side row | — |
| Ch2 > Ch3 | Amend 1 row (reset soil) | Add critter protection to 2 rows | — |
| Ch3 > Ch4 | Full bed cover crop (all cells +1 health, skip fall planting) | Selective cover (2 rows +2, others unchanged) | Push through fall (no cover, keep planting) |
| Ch4 > Ch5 | Repair trellis | Replace trellis (new, but costs a planting week) | Remove trellis (free up wall row) |
| Ch5 > Ch6 | Install rain barrel (+drought resistance) | Expand critter protection | Add shade cloth (reduces sun by 1 but protects from heat) |
| Ch6 > Ch7 | Salvage event-damaged rows (partial repair) | Rip and replant (full reset, lose lineage) | Leave damage (authentic but harder) |
| Ch7 > Ch8 | Deep amend (2 rows full reset) | Broad amend (all rows +1) | No amend (save effort for spring) |
| Ch8 > Ch9 | Accept a challenge modifier for Year 3 | Decline (standard difficulty) | — |
| Ch9 > Ch10 | Stack a second challenge modifier | Drop current modifier | Swap modifier |
| Ch10 > Ch11 | Dedicate 1 row to Mom's recipe ingredients | Maintain current layout | — |
| Ch11 > Ch12 | Lock legacy layout (bed becomes template) | Enter free play with clean slate | Enter free play with current state |

---

## 3. Recipe Progression

### Main Recipe Ladder (7 campaign recipes)

> **Note:** `CROP_SCORING_DATA.json` (v3) defines 8 scoring-level recipes (simplified ingredient lists for bed-score recipe bonuses). This section defines the full campaign recipe ladder with quantity requirements, quality gates, and narrative artifacts. The expansion mode adds additional recipes (Stir Fry, Garden Salad, Forager's Stew, Garden Deluxe Salsa) through zone exploration.

Recipes require specific pantry ingredients. Ingredients come from harvests. Harvests depend on what was planted and how well it grew. A bad season = missing ingredients = delayed recipe.

| # | Recipe | Required Ingredients | Earliest Chapter | Narrative Artifact | Completion Effect |
|---|--------|---------------------|------------------|--------------------|-------------------|
| 1 | Herb Bowl | basil (3), lettuce (2), radish (2) | Ch1 (fall harvest) | Handwritten index card: "Start simple." | Unlocks recipe system tutorial. Pantry UI appears. |
| 2 | Grilled Veg Side | zucchini (2), pepper (2), onion (1) | Ch2 (end of summer) | Neighbor asks "what's that smell?" | First recipe that requires a Ch2 crop. Validates trellis investment. |
| 3 | Tomato Sandwich | tomato (4), basil (2) | Ch2 (mid-summer, but easier by Ch3) | "Three ingredients. That's the rule." | High tomato requirement forces yield focus. First recipe with a quality gate (tomatoes must be 6+ yield score). |
| 4 | Weeknight Pasta | tomato (3), basil (1), onion (1), pepper (1), zucchini (1) | Ch4 (from accumulated pantry) | Recipe card taped to fridge. | First recipe requiring pantry carryover from multiple seasons. Tests pantry management. |
| 5 | Pepper-Onion Skillet | pepper (3), hot pepper (2), onion (3) | Ch6 (hot pepper available) | Cast iron skillet illustration. | Requires Ch6 crop. Tests commitment to pepper/allium rows. |
| 6 | Late-Summer Sauce Prep | tomato (6), pepper (2), onion (2), basil (2), hot pepper (1) | Ch6 (late summer) | Mason jars on the counter. | Volume recipe — requires high-yield tomato rows. Pantry cost is real: using these ingredients means not having them for other recipes. |
| 7 | Mom's Sauce | tomato (8), onion (3), pepper (2), basil (3), hot pepper (1), carrot (2), oregano (1) | Ch11 (oregano available Ch10, recipe card Ch11) | **Handwritten Sauce Card keepsake.** Mom's handwriting. Stain on the corner. | Apex recipe. Requires 7 different crops at volume. Pantry must be deep. Completing this is the emotional climax. |

**Quality Gate Rules:**
- Ingredients must come from player's own harvest (pantry), not granted.
- Yield score thresholds: Herb Bowl (any), Grilled Veg Side (4+), Tomato Sandwich (6+), Weeknight Pasta (5+), Pepper-Onion Skillet (5+), Late-Summer Sauce Prep (6+), Mom's Sauce (7+).
- Partial completion allowed — recipe shows which ingredients are present/missing. No fake completion.

### Hidden Mom Recipes (5 recipes)

Not in the recipe ladder. Not hinted in UI. Discovered only through journal clues — specific phrases in seasonal journal entries that reference meals Mom made. Player must recognize the clue, then attempt the recipe from pantry ingredients.

| # | Hidden Recipe | Trigger Condition | Journal Clue (exact phrase) | Required Ingredients | Presentation |
|---|---------------|-------------------|----------------------------|---------------------|--------------|
| 1 | Mom's Egg Scramble | Complete Ch3 with onion + pepper adjacency in same row | "She'd throw whatever was left in the pan before church." | onion (2), pepper (2), basil (1) | Appears as unlabeled "?" recipe card. Title reveals after first completion. |
| 2 | August Salad | Grow lettuce successfully in summer (hard — requires shade cloth or shade strategy) | "She kept lettuce going all summer. I never asked how." | lettuce (3), tomato (2), cucumber (1), basil (1) | Recipe card in Mom's handwriting. Note: "Ice water. That's the trick." |
| 3 | Pepper Jelly | Accumulate 5+ hot peppers in pantry across any number of seasons | "The jars she gave to neighbors at Christmas. They never said thank you right." | hot pepper (5), pepper (2) | Recipe card with a gift tag illustration. |
| 4 | Freezer Sauce | Complete Late-Summer Sauce Prep twice (two separate seasons) | "She always made extra. 'For January,' she'd say." | tomato (10), onion (2), basil (2), carrot (1) | Recipe card with freezer bag illustration and a date written in pen. |
| 5 | Garden Tea | Grow basil, oregano, and cilantro in the same season in adjacent cells | "She'd sit on the step with a cup of something that smelled like outside." | basil (1), oregano (1), cilantro (1) | Recipe card, simplest design. "Just hot water and whatever's growing." |

**Hidden Recipe Discovery Rules:**
- Journal clue appears in the journal entry for the season where the trigger condition was met.
- Player must manually attempt the recipe (no auto-prompt). The "?" card appears in the recipe panel only after the clue is written.
- If player doesn't notice the clue, the "?" card remains indefinitely. No expiration.
- Completing all 5 hidden recipes is required for the hidden mastery rank.

---

## 4. Mastery Rank Calculation

Ranks are not levels. They are retrospective assessments of accumulated competence. The game evaluates rank at every season-end review. Rank can only increase, never decrease.

| Rank | Title | Required Criteria | Earliest Chapter |
|------|-------|-------------------|------------------|
| 1 | Bedhand | Place crops in all 32 cells at least once across any number of seasons. Complete 1 recipe. | Ch2 |
| 2 | Rowkeeper | Achieve 5+ average yield score on any single row for a full season. Complete row objective (Ch7+). Use crop rotation in at least 1 row (different family across 2 seasons). | Ch7 |
| 3 | Trellis Tech | Use trellis row effectively for 3+ consecutive seasons (trellis crops scoring 6+ each season). Repair or replace trellis at least once. | Ch8 |
| 4 | Season Planner | Complete 3 recipes. Maintain positive soil health across all rows entering a season. Use the Event Forecast to avoid or mitigate at least 1 event. | Ch9 |
| 5 | Yield Steward | Achieve 7+ average yield score across entire bed for a full season. Complete 5 recipes (including Mom's Sauce or Late-Summer Sauce Prep). Pantry holds 15+ total ingredients at season end. | Ch11 |
| 6 | Legacy Keeper | Complete all 7 main recipes. Reach Ch12. Bed density badge at "Serious Grower" tier or above. Every cell has 4+ season lineage. | Ch12 |
| Hidden | Her Daughter's Garden | All 5 hidden Mom recipes completed. Layout reconstruction (current bed matches Mom's original layout — hinted in The Photo keepsake). Bed density at "Serious Grower+" tier. Legacy Keeper rank achieved. | Ch12 (post-completion) |

**Rank Input Metrics (stored in localStorage):**

| Metric | Source | Updated |
|--------|--------|---------|
| `cellsUsedAllTime` | Count of unique cells that have held a crop | Every season end |
| `recipesCompleted` | Array of recipe IDs | On recipe completion |
| `rowYieldHistory` | Per-row yield score per season | Every season end |
| `rotationLog` | Per-cell crop family history | Every season end |
| `trellisSeasons` | Consecutive seasons trellis row scored 6+ | Every season end |
| `soilHealthMap` | Per-cell soil health value | Every season end |
| `eventsForecasted` | Count of events where player took preemptive action after viewing forecast | Every season end |
| `pantryDepth` | Total ingredient count | Every season end |
| `bedDensityTier` | Current density badge tier | Every season end |
| `cellLineageDepth` | Minimum lineage depth across all cells | Every season end |
| `momRecipesCompleted` | Array of hidden recipe IDs | On recipe completion |
| `layoutMatchScore` | % match to Mom's original layout (revealed in The Photo) | Every season end |

**Bed Density Tiers:**

| Tier | Threshold | Badge Display |
|------|-----------|---------------|
| Starter | 0-49% cells filled | No badge |
| Working Garden | 50-74% cells filled + avg yield 4+ | Bronze trowel |
| Serious Grower | 75-89% cells filled + avg yield 6+ + soil health positive | Silver trowel |
| Serious Grower+ | 90-100% cells filled + avg yield 7+ + soil health positive + no conflict adjacencies | Gold trowel |

---

## 5. Keepsake Manifest

Keepsakes are permanent, non-mechanical. They don't buff anything. They exist to mark moments. Stored in `localStorage.keepsakes[]`. Displayed in a drawer accessible from the journal.

| # | Keepsake | Trigger | Chapter | Visual Presentation | Persistence Rule |
|---|----------|---------|---------|--------------------|--------------------|
| 1 | Mom's Trowel | Player places first crop in first cell | Ch1 | Weathered hand trowel illustration. Dirt on the blade. No sparkle, no glow. | Permanent. First item in keepsake drawer. Cannot be earned again on replay. |
| 2 | First Seed Packet | Player saves game for the first time (any chapter) | Ch1 | Torn seed packet (tomato). Price sticker from a hardware store. | Permanent. Timestamp of first save displayed on back. |
| 3 | Onion Man's Scorecard | A Phillies loss event fires on the same season as a garden failure event (crop death, pest damage, or yield < 3 on any row) | Ch2+ (event-dependent) | Crumpled paper scorecard. Phillies lost 2-7. Beer ring stain. "What a waste" written in pen. | Permanent. Rarest non-hidden keepsake — requires event coincidence. Onion Man acknowledges it if earned. |
| 4 | The Photo | Ch8 winter journal review — appears automatically in journal during Year 2 winter reflection | Ch8 | Faded photograph. Mom kneeling at the bed, summer light. Bed layout partially visible (used for hidden rank layout matching). Player character is not in the photo. | Permanent. The Photo is also a gameplay artifact — studying it reveals Mom's original layout for the hidden rank. |
| 5 | First Frost Marker | First time a frost event kills a crop in the player's bed | Ch3+ (event-dependent) | Small wooden stake, hand-painted. "10/14" or whatever the in-game frost date was. | Permanent. Date on marker matches the in-game season date of the frost. |
| 6 | Block Party Plate | Complete any recipe during a block party event | Ch5+ (event-dependent, block party events start Ch5) | Paper plate with foil over it. Handwritten label: "From the garden — [recipe name]." | Permanent. Recipe name on the plate matches whichever recipe was completed. |
| 7 | Handwritten Sauce Card | Complete Mom's Sauce recipe (Ch11 apex) | Ch11 | Index card, lined. Mom's handwriting (irregular, confident). Tomato stain in upper right corner. No measurements — "enough tomatoes," "some basil," "you'll know." Flip side has a grocery list in different ink. | Permanent. Most significant keepsake. Displayed larger than others in the drawer. Only keepsake with a flip-side interaction. |

**Keepsake Drawer Rules:**
- Drawer holds max 7 keepsakes + any hidden-recipe completion tokens.
- Empty slots show as faint outlines (player knows something goes there but not what).
- No tooltip hints for unearned keepsakes. Discovery only.
- Keepsakes survive `localStorage` clear if the player has ever exported a `.gos.json` file (export includes keepsakes).

---

## 6. Challenge Modifier Unlocks

Available after first full playthrough (Ch12 reached). Selected before a season begins. Max 2 active simultaneously. Modifiers interact with existing systems — they don't add new systems.

| # | Modifier | Mechanical Effect | Fiction Framing | Interaction Rules |
|---|----------|-------------------|-----------------|-------------------|
| 1 | Drought Year | Water events disabled. 3 random cells get "dry" tag each season (yield capped at 4 until amended). Amending a dry cell costs the between-season choice. | "PGW says to conserve. Onion Man says it's going to be a bad one." | Stacks with Neighbor's Shade Tree (brutal — dry + shade). Does NOT stack with Community Plot (community plot has shared water). |
| 2 | Neighbor's Shade Tree | 2 columns on one side of the bed lose 2 sun hours permanently for the season. Side chosen randomly at season start. | "The Johnsons finally let that maple go. Half your bed's in shadow by 2pm." | Shade cloth between-season choice is disabled (already shaded). Stacks with Drought Year. Does NOT stack with Late Start. |
| 3 | Community Plot | Bed size changes to 6x3 (smaller). But player gets access to a "shared row" (1x4) with random crops already planted by neighbors. Shared row crops can be harvested but not controlled. | "The community garden on Mifflin has a plot. Smaller, but you're not alone." | Overrides bed size. Does NOT stack with Heirloom Only (shared row has hybrids). Does NOT stack with Drought Year. |
| 4 | Heirloom Only | Hybrid crop variants disabled. Only heirloom-tagged crops available (tomato, pepper, bean, carrot, lettuce, basil, onion — 7 of 20). Yield scores for heirlooms get +1 bonus but are more susceptible to disease events (+20% disease event chance). | "Onion Man's got seeds from his grandmother. 'Real vegetables,' he says." | Restricts crop palette severely. Does NOT stack with Community Plot. Stacks with No-Till. |
| 5 | No-Till | Soil fatigue resets are disabled between seasons. Soil health can only improve through cover crops and companion planting. Amending is not available as a between-season choice. | "Read something about not disturbing the soil. Onion Man says it's nonsense. GURL has no opinion." | Forces long-term rotation strategy. Soil health becomes the primary constraint. Stacks with Heirloom Only and Drought Year. Does NOT stack with Late Start. |
| 6 | Late Start | Season begins 3 weeks late (sow windows shifted). Cool-season crops lose their fall window entirely. Spring planting is compressed to 3 weeks instead of 6. | "Life happened. You got to the bed late. It's already May." | Cuts available planting time. Forces prioritization. Does NOT stack with Neighbor's Shade Tree or No-Till. Stacks with Drought Year. |
| 7 | The Apprentice | A neighbor kid asks to help. Player must dedicate 1 row to the kid's choices (random crop from unlocked roster, placed by AI). Kid's row earns yield but player can't rearrange it. Kid learns over 3 seasons (choices improve). | "Kid from down the block keeps watching you plant. Finally asks if he can try." | The kid's row occupies row 4 (front). Player controls rows 1-3 only. Kid's row crops contribute to pantry. Does NOT stack with Community Plot (too many shared rows). Stacks with everything else. |

**Modifier Stacking Matrix:**

|  | Drought | Shade Tree | Community | Heirloom | No-Till | Late Start | Apprentice |
|--|---------|------------|-----------|----------|---------|------------|------------|
| **Drought** | — | YES | NO | YES | YES | YES | YES |
| **Shade Tree** | YES | — | YES | YES | YES | NO | YES |
| **Community** | NO | YES | — | NO | YES | YES | NO |
| **Heirloom** | YES | YES | NO | — | YES | YES | YES |
| **No-Till** | YES | YES | YES | YES | — | NO | YES |
| **Late Start** | YES | NO | YES | YES | NO | — | YES |
| **Apprentice** | YES | YES | NO | YES | YES | YES | — |

**Challenge Completion Tracking:**
- Each modifier completed (reach season end with modifier active) earns a journal tag: "Survived [Modifier Name]."
- Completing all 7 individually (not simultaneously) unlocks a journal entry: "This bed has seen everything."
- No mechanical reward for challenge completion — the journal record is the reward.

---

## Data Model Summary (localStorage keys)

| Key | Type | Written By | Read By |
|-----|------|-----------|---------|
| `gardenOS.chapter` | int (1-12) | Chapter advance | All systems |
| `gardenOS.cropsUnlocked` | string[] | Chapter advance | Planner palette |
| `gardenOS.pantry` | `{ [ingredientId]: { qty, minYieldScore } }` | Season-end harvest | Recipe system |
| `gardenOS.soilMap` | `{ [cellId]: { health, fatigue, tags[] } }` | Season-end review | Planner scoring, journal |
| `gardenOS.lineage` | `{ [cellId]: { seasons: [{ ch, cropId, yieldScore }] } }` | Season-end review | Lineage tags UI, mastery calc |
| `gardenOS.journal` | `{ [chapterId]: { bestRow, worstRow, memory, tacticalNote, clues[] } }` | Season-end review | Journal UI, hidden recipe triggers |
| `gardenOS.keepsakes` | `{ [keepsakeId]: { earnedCh, timestamp } }` | Trigger events | Keepsake drawer |
| `gardenOS.mastery` | `{ rank, metrics: {...} }` | Season-end review | Rank display, dialogue system |
| `gardenOS.factions` | `{ gurl, onionMan, vegeman }` (0-100 each) | Behavior events | Dialogue selector, faction filter |
| `gardenOS.recipes` | `{ completed[], hidden[] }` | Recipe completion | Recipe panel, mastery calc |
| `gardenOS.challenges` | `{ available, active[], completed[] }` | Ch12+, season start | Challenge ladder UI |
| `gardenOS.bedCondition` | `{ trellisWear, trellisState, protectionState }` | Season-end review | Bed overlay, between-season choices |

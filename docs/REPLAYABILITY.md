# Garden OS — Replayability & Retention Design Document

**Internal Game Documentation**

---

## 1. Why a Player Replays After Finishing Once

The first playthrough teaches the player how the garden works. The second playthrough is where they actually garden.

**Primary replay drivers:**

- **The scoring system is transparent but deep.** After finishing once, the player now understands how chapter scoring works — yield weight, soil health, biodiversity, timing bonuses. They can see the gap between what they did and what was possible. This is not a hidden system revealed at the end; it is visible throughout. But comprehension lags behind visibility, by design.

- **Character routes diverge meaningfully.** Siding with Garden GURL's permaculture philosophy versus Onion Man's heirloom monoculture approach versus Vegeman's community-feeding priorities produces different chapter events, different available crops, and different scoring emphases. A first playthrough covers roughly 40% of character content.

- **The 8x4 bed is a tight constraint.** 32 squares is not enough to do everything in one run. The player who grew tomatoes and peppers knows they skipped the root vegetable path entirely. The bed's smallness is the replayability engine.

- **Mom's journal entries unlock based on what you grew.** Different crop families reveal different memories. No playthrough sees all of them. This is the emotional reason to replay — the mechanical reasons above just give it structure.

**What we are NOT doing:** No stat-inflation New Game Plus, no fake "true ending," and no vertical grind ladder. Replay value comes from lateral variety and stricter mastery contexts. A post-campaign **Legacy Mode** is allowed only if it preserves the same ending and core 8x4 identity.

---

## 2. Why a Player Restarts a Season Mid-Play

This should feel like a gardener pulling out a failed row and replanting, not like save-scumming.

**Legitimate restart triggers:**

- **A frost event wiped out an unprotected planting and recovery is mathematically possible but aesthetically miserable.** The player knows they can limp to season's end, but they would rather start clean. Let them.

- **They learned something in Chapter 6 that changes how they would have approached Chapter 4.** The game's deterministic scoring means there is no randomness to blame — only their own understanding gap. Restarting is an act of mastery, not frustration.

- **They committed to a character alliance and want to see the other path.** Mid-season is when alliance consequences become clear. A restart here is curiosity, not failure.

**Design support for restarts:**

- Season restart available from the pause menu at all times, no confirmation nag beyond one "Are you sure?"
- The game tracks your best completed run per season, not your most recent. Restarting does not erase progress.
- Fast-forward option for chapters already completed with an A-rank or higher in any previous run. This respects the player's time on replayed content without turning the game into a skip-fest.

---

## 3. Why a Player Shares a Result With Friends

Sharing must be organic to the game's identity. A South Philly raised bed is inherently a neighborhood thing — people walk by, they see what you are growing, they comment.

**Shareable outputs:**

- **End-of-season garden portrait.** A stylized overhead export of the 8x4 bed at harvest, using the game's print-texture visual language, with yield stats rendered as a seed-packet label. This is the primary share artifact. It should look like something you would pin to a refrigerator.

- **Mom's recipe card.** Based on what you actually grew, the game generates a recipe card from Mom's collection that uses those ingredients. A tomato-heavy garden gets her marinara. A root-heavy garden gets her roasted root soup. These are real recipes, formatted as handwritten index cards. Players share these because they are genuinely useful and personal.

- **Chapter report cards.** Simple letter grades per chapter with one-line summaries: "Chapter 4: The Aphid Siege — B+. Lost the basil, saved the tomatoes." These are compact enough for a text message.

- **The bed layout itself.** A copyable grid code that another player can import as a starting template. Not a competitive leaderboard — a gift.

**What we are NOT doing:** No automated social media posting. No "share to unlock." No leaderboards that rank players against strangers. If someone shares, it is because the artifact is worth sharing on its own terms.

---

## 4. Play Styles Supported

The game should not explicitly label these. But the systems must quietly support all of them.

### The Optimizer
Wants the highest possible score per square foot. Cares about companion planting bonuses, timing windows, soil nutrient math. The deterministic scoring system is their playground. They will spreadsheet this game and enjoy it.

**What the game provides:** Full scoring transparency. No hidden multipliers. A clear best-possible score per chapter that can be theoretically calculated. Post-chapter breakdowns that show exactly where points were gained or lost.

### The Storyteller
Wants to see every Mom journal entry, every character interaction, every critter event. Score is secondary to narrative completeness. They replay to find the conversation they missed when they chose Onion Man over Garden GURL in Chapter 7.

**What the game provides:** A journal collection screen that shows silhouettes of undiscovered entries. Character relationship summaries that hint at unvisited dialogue. No numerical completion percentage — just visible gaps.

### The Completionist
Wants every crop grown, every critter encountered, every recipe card collected. They will play five full campaigns to fill every slot.

**What the game provides:** A seed catalog that marks which varieties have been grown. A critter field guide with observation notes that fill in over time. A recipe box. None of these offer gameplay bonuses — they are collections for their own sake.

### The Speedrunner
Wants to finish a season in minimum real-time with minimum score threshold met. The 8x4 constraint and deterministic scoring make this a legitimate puzzle.

**What the game provides:** An in-game timer (off by default, toggle in settings). Chapter-split tracking. The fast-forward system for mastered chapters supports this without being designed for it.

### The Roleplayer
Wants to grow what Mom would have grown, or what their own family grows, or a historically accurate South Philly Italian-American garden. Score is irrelevant.

**What the game provides:** No score penalty harsh enough to prevent any crop combination from reaching the ending. The game always completes. You can grow a terrible garden and the story still resolves — you just get a different tone in the final chapter.

---

## 5. Challenge Modifiers

Unlocked after completing the campaign once. Presented as "conditions" for the season, framed as weather years or neighborhood situations — not as abstract difficulty toggles.

| Modifier | In-Fiction Framing | Mechanical Effect |
|---|---|---|
| **Drought Year** | "Summer of '03 all over again" | Water is limited per chapter. Must prioritize which rows get watered. |
| **The Neighbor's Shade Tree** | "Mr. Petrosino's maple finally hit the fence line" | Two columns of the bed are now partial shade. Full-sun crops penalized there. |
| **Community Plot** | "The block captain asked if you could grow for the food bank too" | Yield targets increased by 40%. Score based on total output, not optimization. |
| **Heirloom Only** | "Only seeds from Mom's tin" | No hybrid varieties available. Reduced pest resistance across the board. |
| **No-Till** | "Garden GURL's challenge" | Cannot reset soil between seasons. Must manage nutrient depletion across chapters. |
| **Late Start** | "You didn't get the keys until May" | First two planting windows are gone. Must work with a compressed season. |
| **The Apprentice** | "Vegeman's kid wants to help" | Random squares get planted with wrong crops between chapters. Must adapt or replant. |

Modifiers can be combined. The game does not balance for all combinations — that is the point. Some combinations are brutal. The game should acknowledge this with a short line of dialogue from the relevant character ("You sure about this?") and then let the player proceed.

---

## 6. Weekly and Daily Design Possibilities

**Proceed with extreme caution here.** Daily and weekly content creates obligation. Obligation is the enemy of this game's tone. Anything in this section must pass the test: "Would a real gardener check this daily because they want to, or because they feel they have to?"

### What Fits Naturally

**Weekly Seed of the Week (passive, non-FOMO):**
Each real-world week, the main menu features a different crop variety with a short write-up — botanical history, growing tips, a Mom memory. This is purely informational. It does not unlock anything. It does not expire. It is a garden almanac page. All past entries remain accessible in the seed catalog. Nothing is missable.

**Seasonal real-world alignment (gentle):**
If the player opens the game during real-world spring, the menu background shows spring. If winter, winter. The characters' idle dialogue on the menu screen shifts. This is ambiance, not content.

### What Does NOT Fit

- Daily challenges with unique rewards. Creates FOMO.
- Streak bonuses. Creates obligation.
- Limited-time crops or events. Creates artificial scarcity.
- Any system that makes the player feel punished for not opening the game today.

**Rule of thumb:** If it would stress out a player who only plays on weekends, cut it.

---

## 7. Seasonal Scenario Packs (Post-Launch Content)

Each is a self-contained 4-chapter mini-campaign with its own scoring and narrative emphasis, while preserving the same core board and campaign identity.

### Pack Concepts

**"The Front Stoop Influence"**
Ms. Dolores asks for extra herbs and quick greens from your existing bed. Constraint set simulates container urgency without leaving the 8x4 board: tighter water windows, faster heat stress, and front-lane access pressure.

**"The Block Share"**
The block captain asks for produce support. Same 8x4 board, higher yield targets, stricter consistency, and community-priority briefs. Vegeman gets a focused story arc around overpromising output.

**"February Prep"**
A pre-season planning mini-campaign that still resolves on the 8x4 bed. Focus: forecast interpretation, crop sequencing, and early-season commit strategy. Heavy on journal and household context, no alternate board.

**"The Wedding"**
Garden GURL's sister is getting married in September. The 8x4 bed must deliver specific herbs and visual-quality harvest under deadline pressure. Failure state is objective failure, not just a low score.

### Pricing and Delivery Model

- Each pack is a one-time purchase. No subscription.
- Each pack is fully playable offline.
- Two packs per year maximum. Quality over volume.
- All packs are additive — the base game is never diminished by not owning them.

---

## 8. Community Challenge Ideas

Structured suggestions the community can adopt. The game provides tools; the community provides the context.

**Format: Monthly community prompt, posted on the game's website and social channels.**

- **"Salsa Garden"** — Grow everything needed to make salsa in a single season. Share your recipe card output.
- **"Mom's Favorite"** — Replay the campaign growing only crops that appear in Mom's journal entries. Share which memories you unlocked.
- **"The $0 Garden"** — Complete a season using only saved seeds, trades, and found seeds from critter events.
- **"Smallest Footprint"** — Complete a season using the fewest squares possible while still meeting chapter yield minimums.
- **"Onion Man's Revenge"** — Alliums only. How high can you score?

**What the game provides to support this:**
- Shareable garden portrait and recipe card
- Bed layout export code
- Screenshot mode that removes UI
- Community gallery page on the website (curated, not algorithmic)

**What the game does NOT provide:** In-game community feeds, voting systems, user-generated content tools, or anything requiring server infrastructure beyond a static website.

---

## 9. How to Keep the Game Small but Deep

The 8x4 bed is not a limitation we are working around. It is the design.

**Principles:**

- **Constrain space, expand knowledge.** The bed never gets bigger. The player's understanding of what is possible within it does.

- **Every system should interact with at least two other systems.** Companion planting affects pest management. Pest management affects yield. Yield affects character relationships. Character relationships affect available seeds. Available seeds affect companion planting options. The loop is tight.

- **No filler chapters.** 12 chapters means 12 meaningful decision points. If a chapter does not change the state of the bed or the story in a way the player will remember, cut it.

- **UI shows less, means more.** The soil health display should be a color gradient on the dirt, not a numerical readout with six sub-stats.

- **Content breadth over content volume.** 40 crop varieties where each behaves distinctly is better than 200 varieties grouped into 15 functional categories.

- **Deterministic systems reward study.** When the player knows that a basil plant next to a tomato plant produces a specific, predictable companion bonus, they can plan. Determinism is what makes a small system feel deep — every outcome is learnable.

**Target scope:** A single campaign playthrough should be 6-8 hours. A completionist run across all play styles, modifiers, and character paths should be 40-60 hours. That is the ceiling.

---

## 10. What Should Remain Fixed vs. Variable Across Runs

### Always Fixed

| Element | Reason |
|---|---|
| The 8x4 bed dimensions | This is the identity of the game. It never changes. |
| The 12-chapter structure | Players should be able to plan around a known timeline. |
| Core crop behavior | Tomatoes always grow the same way. Determinism is sacred. |
| Mom's backstory and the reason you inherited the garden | The emotional foundation cannot shift. |
| The South Philly setting and seasonal weather patterns | The sense of place is non-negotiable. |
| Scoring formulas | Optimizers need stable ground to optimize on. |
| Chapter-to-chapter time progression | Spring is always spring. The calendar does not shuffle. |

### Always Variable

| Element | Reason |
|---|---|
| Player crop choices and bed layout | This is the primary expression space. |
| Character emphasis path | Garden GURL / Onion Man / Vegeman dialogue weighting and challenge framing should vary by player behavior. |
| Which Mom journal entries appear | Tied to crop choices. Different gardens, different memories. |
| Critter encounters | Which critters appear depends on what is planted. Deterministic but varied. |
| Available seeds in later chapters | Gated by character relationships and prior choices. |
| End-of-season narrative tone | The story resolves differently based on yield, relationships, and garden health. |

### Variable Only With Modifiers Active

| Element | Reason |
|---|---|
| Water availability | Fixed in base game. Variable under Drought Year modifier. |
| Sunlight map of the bed | Full sun in base game. Partial shade under Neighbor's Tree modifier. |
| Yield targets | Standard in base game. Increased under Community Plot modifier. |
| Seed catalog availability | Full in base game. Restricted under Heirloom Only modifier. |
| Season start date | March in base game. May under Late Start modifier. |

### Never Variable

| Element | Reason |
|---|---|
| The tone | No joke mode. No horror reskin. No ironic distance. The game is always sincere. |
| Companion planting relationships | If basil helps tomatoes, it always helps tomatoes. Every run, every modifier, every scenario pack. |
| The absence of microtransactions | This is a design constraint, not a business decision. It is part of the game's identity. |

---

## Final Note

The goal of these systems is not to maximize time-in-game. It is to make every hour in the game worth the player's time. A player who finishes one campaign and walks away satisfied has had a complete experience. A player who replays five times and explores every modifier has had a deeper one. Both are valid. Neither should feel like they missed the "real" game.

The raised bed is small. The game should feel that way too — small, considered, worth tending.

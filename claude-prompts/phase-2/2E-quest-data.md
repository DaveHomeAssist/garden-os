# Claude Prompt — Phase 2E: Quest Data (Initial 13 Quests)

## Task

Author the initial quest deck: 9 quests from core NPCs (3 each for Gus, Maya, Lila) + 4 rotating neighbor quests. Output as `specs/QUEST_DECK.json`.

## Context

Quests are the primary engagement loop for Let It Grow. Each quest has a type (fetch, assist, discover, timed, craft), requirements, rewards, NPC association, and gating conditions.

## NPC Quest Design Guidelines

### Old Gus (Heritage & Wisdom)
- Focus: rare seeds, heritage techniques, old-school gardening wisdom
- Tone: gruff but rewarding, stories about "the old days"
- Progression: starts simple (find a specific crop), escalates to heritage quests

### Maya (Invention & Experimentation)
- Focus: tool crafting, experimental techniques, gadgets
- Tone: enthusiastic, scattered, delightfully chaotic
- Progression: starts with simple builds, escalates to complex crafting

### Lila (Cooking & Recipes)
- Focus: ingredient farming, recipe completion, kitchen garden management
- Tone: warm but demanding, high standards for ingredients
- Progression: starts with basic ingredients, escalates to rare recipe components

## Quest Structure

Each quest must include:

```json
{
  "id": "unique_snake_case_id",
  "npc": "npc_id",
  "type": "fetch|assist|discover|timed|craft",
  "title": "Short descriptive title",
  "description": "2-3 sentence description the player sees",
  "acceptDialogue": "What the NPC says when player accepts",
  "progressDialogue": "What the NPC says when player checks in mid-quest",
  "completeDialogue": "What the NPC says when quest is turned in",
  "requirements": [
    { "type": "crop_harvested|crop_planted|item_crafted|zone_visited", "id": "item_id", "count": 1 }
  ],
  "rewards": [
    { "type": "seed|item|reputation|xp", "id": "item_id", "amount": 10 }
  ],
  "prerequisites": {
    "chapter_min": 1,
    "season": null,
    "reputation": {},
    "quests_completed": []
  },
  "timed": false,
  "deadline": null
}
```

## Quests to Author

### Old Gus Quests (3)

1. **"Grandpa's Tomatoes"** (discover, chapter 3+, summer)
   - Find and grow an heirloom tomato variety
   - Reward: heritage pepper seeds + 15 reputation

2. **"The Old Compost Method"** (assist, chapter 5+, fall)
   - Help Gus restore his compost bin using specific materials
   - Reward: compost supplies + 20 reputation + soil science XP

3. **"Before the First Frost"** (timed, chapter 7+, fall month 3)
   - Harvest 5 specific crops before winter arrives
   - Reward: rare seed bundle + 25 reputation + gardening XP

### Maya Quests (3)

4. **"The Prototype Sprinkler"** (craft, chapter 2+, any season)
   - Gather materials and craft a basic sprinkler tool
   - Reward: smart watering can + 15 reputation + crafting XP

5. **"Soil Scanner Calibration"** (assist, chapter 4+, spring)
   - Test Maya's soil scanner on 3 different soil types
   - Reward: soil scanner tool + 20 reputation + soil science XP

6. **"The Experimental Hybrid"** (discover, chapter 6+, summer)
   - Cross two specific crops to create a hybrid variety
   - Reward: hybrid seeds + 25 reputation + gardening XP

### Lila Quests (3)

7. **"Fresh Basil, Please"** (fetch, chapter 1+, any season)
   - Grow and deliver 3 basil plants
   - Reward: herb seeds + 10 reputation + social XP

8. **"The Perfect Salsa"** (fetch, chapter 4+, summer)
   - Deliver tomatoes, peppers, cilantro, and onions
   - Reward: recipe card + 20 reputation + gardening XP

9. **"Mom's Secret Recipe"** (fetch, chapter 8+, fall)
   - Gather 6 specific ingredients for a heritage recipe
   - Reward: exclusive seed + 30 reputation + social XP + crafting XP

### Neighbor Quests (4 rotating)

10. **"Weekend Watering"** (assist, chapter 2+, summer)
    - Water Pat's garden while they're away (visit zone, interact with 5 cells)
    - Reward: plant matter + 10 reputation

11. **"Bee-Friendly Garden"** (fetch, chapter 3+, spring)
    - Plant 3 companion flowers for Sam's bees
    - Reward: honey jar (material) + 10 reputation

12. **"Compost Contribution"** (fetch, chapter 2+, fall)
    - Deliver 5 plant matter to Jo's compost bin
    - Reward: fertilizer + 10 reputation

13. **"Bird Census"** (discover, chapter 4+, spring)
    - Visit 3 different zones to spot bird varieties for Robin
    - Reward: rare wildflower seeds + 15 reputation

## Dialogue Voice Guidelines

- **Gus**: Short sentences. Gruff. References the past. "Used to be..." / "Back when..."
- **Maya**: Run-on sentences. Interrupts herself. "Oh! And also—wait, first—"
- **Lila**: Precise. Food metaphors. "This needs to be fresh. Not store-shelf fresh. Dawn-picked fresh."
- **Neighbors**: Brief, friendly, casual. "Hey, could you help me out?"

## Deliverable

- `specs/QUEST_DECK.json` — 13 quests in the exact JSON format above
- All quests valid against the quest engine schema (Phase 2D)
- Dialogue feels natural and matches character voices

## After completing changes

- Commit with message: `content: author initial quest deck with 13 quests across 4 NPCs`
- Do NOT push

# NPC and Quest Framework

## NPC Roster

### Core NPCs (Let It Grow)

| NPC | Role | Personality | Quest Focus |
|-----|------|-------------|-------------|
| Old Gus | Veteran gardener | Gruff, wise, nostalgic | Rare seed hunts, heritage techniques |
| Maya | Inventor/tinkerer | Enthusiastic, scattered | Tool crafting, experiments |
| Lila | Chef | Warm, demanding | Ingredient farming, recipe completion |
| Neighbor Pool | Dynamic residents | Varied | Garden maintenance, seasonal help |

### Existing Characters (Story Mode)

| Speaker | ID | Personality | Current Role |
|---------|-----|-------------|-------------|
| Garden GURL | `garden_gurl` | Warm, encouraging | Event/harvest commentary |
| Onion Man | `onion_man` | Melancholy, poetic | Event/harvest commentary |
| Vegeman | `vegeman` | Confident, sly | Event/harvest commentary |
| Critters | `critters` | Surprised, chaotic | Event commentary |
| Calvin | `calvin` | Loyal sheepdog | Thought bubbles, opening narration |
| Narrator | `narrator` | Omniscient | Chapter intros, system voice |

### Migration Path
Story Mode characters become **ambient commentators** in Let It Grow. Core NPCs (Gus, Maya, Lila) are **new quest-giving characters** with full dialogue trees, schedules, and reputation tracks.

## Quest System

### Quest Types

| Type | Description | Example |
|------|-------------|---------|
| Fetch | Grow or find a specific item | "Grow 3 tomatoes for Lila's sauce" |
| Assist | Help maintain someone's garden | "Water Gus's plot while he's away" |
| Discover | Find a rare plant or location | "Find the wild herb patch in the meadow" |
| Timed | Complete before event/season ends | "Harvest before first frost" |
| Craft | Build a specific tool or item | "Maya needs a trellis extension" |

### Quest State Machine

```
AVAILABLE → ACCEPTED → IN_PROGRESS → READY_TO_TURN_IN → COMPLETED
                ↓                          ↓
             ABANDONED                  FAILED (timed)
```

### Quest Data Structure

```js
{
  id: "gus_heirloom_01",
  npc: "old_gus",
  type: "discover",
  title: "Grandpa's Tomatoes",
  description: "Gus remembers a tomato variety...",
  requirements: [{ type: "crop", id: "heirloom_tomato", count: 1 }],
  rewards: [{ type: "seed", id: "heritage_pepper", count: 3 }, { type: "reputation", npc: "old_gus", amount: 15 }],
  season: "summer",
  chapter_min: 3,
  timed: false
}
```

### Existing Foundation
- `cutscene-machine.js` handles queued narrative playback with priority — can drive quest dialogue
- `dialogue-panel.js` renders speaker portraits and text — needs branching choice buttons
- `speakers.js` + `portraits.js` provide character rendering — needs new NPC entries
- Event system already has season/chapter gating — quest availability can reuse this pattern

## Reputation System

| Level | Threshold | Unlocks |
|-------|-----------|---------|
| Stranger | 0 | Basic quests only |
| Acquaintance | 25 | More quest variety |
| Friend | 50 | Special seeds, tool recipes |
| Trusted | 75 | Zone access, rare items |
| Family | 100 | Unique storylines, cosmetics |

Each NPC has an independent reputation track. Reputation decays slowly if neglected (1 point/season), encouraging ongoing engagement.

## NPC Schedules

NPCs appear at different locations depending on season and time:
- **Old Gus**: Player plot (spring), tool shed (summer), orchard (fall), indoors (winter)
- **Maya**: Workshop (always), player plot (when quest active)
- **Lila**: Kitchen garden (spring/summer), market (fall), indoors (winter)
- **Neighbors**: Rotate weekly from a pool of 8-12 templates

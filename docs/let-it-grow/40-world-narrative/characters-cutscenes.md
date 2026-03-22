# Characters and Cutscenes

## Character System

### Speaker Registry (6 characters)

| Speaker | ID | Position | Default Emotion | Role |
|---------|-----|----------|-----------------|------|
| Garden GURL | `garden_gurl` | Left | Warm | Event/harvest commentary, code enforcement |
| Onion Man | `onion_man` | Right | Melancholy | Event/harvest commentary, memory keeper |
| Vegeman | `vegeman` | Left | Confident | Event/harvest commentary, market antagonist |
| Critters | `critters` | Right | Surprised | Event commentary, chaos agent |
| Calvin | `calvin` | Center | Loyal | Thought bubbles, opening narration (sheepdog) |
| Narrator | `narrator` | — | Omniscient | Chapter intros, system voice |

### Calvin (Special Character)
- Animated sheepdog procedurally rendered in Three.js
- Synchronized walk cycles
- Thought bubble presentations (not spoken dialogue)
- Appears in garden scene as interactive element

## Portrait Rendering

- 5 characters use CSS-based portrait systems
- 6 emotional layers per character: neutral, warm, sad, surprised, smirk, emphasis
- `resolvePortraitLayers()` merges base portraits with emotion-specific overrides
- Source: `src/data/portraits.js`

## Cutscene Architecture

### Three-Stage Pipeline
1. **Data** (`cutscenes.js`): 50+ static scenes + 3 dynamic builders
2. **State Machine** (`cutscene-machine.js`): Queue-based playback with priority
3. **Dialogue Panel** (`dialogue-panel.js`): Visual novel rendering with typing animation

### Trigger Types (5 categories)
- Chapter openings and transitions
- Harvest scoring results
- Player interventions (protect/mulch/prune)
- Seasonal events
- Keepsake unlocks

### Dynamic Generation
Three builder functions create contextual narratives:
- **Event-based**: Routes by season and outcome
- **Intervention reactions**: Tied to action types
- **Harvest commentary**: Scaled to performance grade

### Tracking
- "Once-only" flag prevents repeated scenes
- Priority system ensures critical scenes play first
- Queue drains sequentially with typing animation

## Let It Grow — New Character Needs

### New NPCs Required
| NPC | Dialogue Style | System Needs |
|-----|---------------|--------------|
| Old Gus | Long-form storytelling, gruff wisdom | Full portrait set, reputation track |
| Maya | Rapid-fire enthusiasm, scattered ideas | Portrait set, quest gating |
| Lila | Warm but precise, recipe-focused | Portrait set, ingredient tracking |
| Neighbors (pool of 8-12) | Brief, varied | Template portraits, rotation logic |

### Dialogue Branching
Current system is linear beat-to-beat. Let It Grow needs:
- Player choice buttons affecting subsequent dialogue
- Quest acceptance/rejection flows
- Reputation-gated dialogue variants
- NPC mood responses based on relationship level

### Migration Path
- `speakers.js` → add new NPC entries with positions and defaults
- `portraits.js` → add new character art layers
- `cutscene-machine.js` → add branching beat support (choice → branch ID)
- `dialogue-panel.js` → add choice button rendering below text

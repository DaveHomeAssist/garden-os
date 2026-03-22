# Codex Prompt — Phase 2A: NPC Data Registry

## Task

Create `src/data/npcs.js` — the canonical NPC data registry for Let It Grow, following the same pattern as the existing `speakers.js` and `crops.js`.

## Context

Story Mode has 6 speaker profiles in `speakers.js`. Let It Grow adds 3 core quest-giving NPCs (Old Gus, Maya, Lila) plus a pool of rotating neighbor templates. These need full data definitions covering personality, schedules, quest associations, and dialogue defaults.

## Existing Pattern (speakers.js)

```js
// Current speaker format:
{ id, name, position, defaultEmotion, animation, emoji }
```

## Deliverable

Create `src/data/npcs.js`:

```js
export const NPC_REGISTRY = {
  old_gus: {
    id: 'old_gus',
    name: 'Old Gus',
    role: 'Veteran Gardener',
    personality: 'Gruff, wise, nostalgic',
    questFocus: 'Rare seed hunts, heritage techniques',
    defaultEmotion: 'neutral',
    portrait: 'old_gus', // key into portraits.js (Phase 2B)
    schedule: {
      spring: { zone: 'player_plot', position: { x: -1.5, z: 1.0 } },
      summer: { zone: 'neighborhood', position: { x: 2.0, z: -0.5 } },
      fall:   { zone: 'neighborhood', position: { x: 3.0, z: 1.0 } },
      winter: { zone: 'neighborhood', position: { x: 1.0, z: 0.0 } },
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: { stranger: "Hmm? New around here?", friend: "Good to see you, kid." },
      farewell: { stranger: "Don't trample the beds.", friend: "Take care of that soil." },
    },
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    role: 'Inventor/Tinkerer',
    personality: 'Enthusiastic, scattered',
    questFocus: 'Tool crafting, experiments',
    defaultEmotion: 'excited',
    portrait: 'maya',
    schedule: {
      spring: { zone: 'neighborhood', position: { x: -2.0, z: -1.0 } },
      summer: { zone: 'neighborhood', position: { x: -2.0, z: -1.0 } },
      fall:   { zone: 'neighborhood', position: { x: -2.0, z: -1.0 } },
      winter: { zone: 'neighborhood', position: { x: -2.0, z: -1.0 } },
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: { stranger: "Oh! Hi! I was just—never mind.", friend: "Perfect timing! I need someone to test this!" },
      farewell: { stranger: "Wait, actually—no, go ahead.", friend: "Come back when you find more parts!" },
    },
  },
  lila: {
    id: 'lila',
    name: 'Lila',
    role: 'Chef',
    personality: 'Warm, demanding, precise',
    questFocus: 'Ingredient farming, recipe completion',
    defaultEmotion: 'warm',
    portrait: 'lila',
    schedule: {
      spring: { zone: 'neighborhood', position: { x: 0.0, z: -2.0 } },
      summer: { zone: 'neighborhood', position: { x: 0.0, z: -2.0 } },
      fall:   { zone: 'neighborhood', position: { x: 1.5, z: -2.5 } },
      winter: { zone: 'neighborhood', position: { x: 1.0, z: 0.0 } },
    },
    reputation: { initial: 0, decayPerSeason: 1 },
    dialogueDefaults: {
      greeting: { stranger: "The kitchen's not open yet.", friend: "Tell me you brought basil." },
      farewell: { stranger: "Come back with something fresh.", friend: "I'll save you a plate." },
    },
  },
};

// Neighbor pool — template-based, randomly selected per save
export const NEIGHBOR_TEMPLATES = [
  { id: 'neighbor_gardener', name: 'Pat', role: 'Weekend Gardener', questType: 'assist' },
  { id: 'neighbor_beekeeper', name: 'Sam', role: 'Beekeeper', questType: 'fetch' },
  { id: 'neighbor_composter', name: 'Jo', role: 'Composter', questType: 'assist' },
  { id: 'neighbor_birdwatcher', name: 'Robin', role: 'Birdwatcher', questType: 'discover' },
];

// Accessor functions
export function getNPC(id) { ... }
export function getNPCsInZone(zone, season) { ... }
export function getActiveNeighbors(campaignState) { ... }
export function getNPCGreeting(npcId, reputationTier) { ... }
```

## Constraints

- No external dependencies
- Pure data + accessor functions — no side effects, no DOM, no state mutation
- Follow existing pattern from `crops.js` and `speakers.js`
- All text is deterministic (no random greetings)
- Export as ES module

## Testing

- Unit test: `getNPC('old_gus')` returns expected data
- Unit test: `getNPCsInZone('neighborhood', 'spring')` returns correct NPCs
- Unit test: `getNPCGreeting('old_gus', 'stranger')` vs `getNPCGreeting('old_gus', 'friend')`
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add NPC data registry with schedules and dialogue defaults`
- Do NOT push

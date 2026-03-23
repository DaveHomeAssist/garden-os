# Codex Prompt — Phase 2F: Dialogue Branching

## Task

Extend `src/game/cutscene-machine.js` and `src/ui/dialogue-panel.js` to support player choice buttons during dialogue sequences.

## Current State

### cutscene-machine.js
- Queued playback with priority system
- Each "beat" is: `{ speaker, text, emotion, camera, mood }`
- Beats play sequentially with typing animation
- No branching — linear progression only

### dialogue-panel.js
- Visual novel interface with portrait layers
- Speaker badge, typing animation
- Accessibility support (aria attributes)
- No interactive elements during dialogue (read-only)

## Deliverable

### 1. Extend Beat Format

Add optional `choices` field to beats:

```js
{
  speaker: 'old_gus',
  text: "I need help finding those old tomato seeds. Interested?",
  emotion: 'neutral',
  choices: [
    { label: "I'll find them!", branchId: 'accept_quest', effect: { action: 'ACCEPT_QUEST', payload: { questId: 'gus_heirloom_01' } } },
    { label: "Not right now.", branchId: 'decline', effect: null },
  ]
}
```

When a beat has `choices`:
1. Text types out as normal
2. After typing completes, choice buttons appear below the text
3. Player clicks/taps a choice
4. If `effect` is set, dispatch the action to the store
5. If `branchId` is set, jump to the branch in the scene's `branches` map
6. If neither, continue to next beat

### 2. Scene Branches

Extend scene format to include branches:

```js
{
  id: 'gus_quest_01_offer',
  beats: [ ... ], // main sequence
  branches: {
    'accept_quest': [
      { speaker: 'old_gus', text: "Good. Start by checking the south beds.", emotion: 'warm' }
    ],
    'decline': [
      { speaker: 'old_gus', text: "Hmm. Well, you know where to find me.", emotion: 'neutral' }
    ]
  }
}
```

After a branch plays out, the cutscene ends (don't return to main beats).

### 3. Modify cutscene-machine.js

```js
// In the playback loop:
// - After typing a beat with choices, pause and wait for selection
// - On selection: run effect (if any), jump to branch (if any), or continue
// - New method:
selectChoice(choiceIndex) { ... }
```

### 4. Modify dialogue-panel.js

Add choice button rendering:

```js
// New method:
renderChoices(choices, onSelect) {
  // Create a button row below the dialogue text
  // Each button: label text, styled with --soil bg, --cream text, DM Sans font
  // On click/tap: call onSelect(index)
  // Buttons animate in: fade + slide up, staggered 100ms each
  // After selection: buttons fade out, chosen button briefly highlights with --sun
}
```

### Choice Button Styling

- Container: `display: flex; gap: 8px; padding: 12px 16px; flex-wrap: wrap`
- Button: `background: var(--soil); color: var(--cream); border: 1px solid var(--sun); border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans'; font-size: 14px; cursor: pointer`
- Hover: `background: var(--sun); color: var(--text)`
- Focus: `outline: 2px solid var(--sun); outline-offset: 2px`
- Selected: brief `--leaf-bright` background flash before fade-out

## Constraints

- Must not break existing linear cutscene playback (scenes without `choices` work identically)
- Choice buttons must be keyboard-navigable (arrow keys + Enter)
- Must be touch-friendly (min 44px touch target)
- No external dependencies
- Speaking order rules (Garden GURL → Onion Man → Vegeman → Critters) still apply for NPC ambient commentary; NPC quest dialogue is separate and doesn't follow the speaking order

## Testing

- Manual: play a scene with choices — buttons appear after typing
- Manual: select a choice — correct branch plays
- Manual: play a scene without choices — no regression
- Manual: keyboard navigation through choices works
- Manual: touch/tap on choice buttons works
- Manual: effect dispatches to store correctly
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add dialogue branching with player choice buttons`
- Do NOT push

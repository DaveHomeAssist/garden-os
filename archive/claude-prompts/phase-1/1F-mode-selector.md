# Claude Prompt — Phase 1F: Mode Selector (Story Mode vs Let It Grow)

## Task

Design and implement a mode selection screen that lets players choose between Story Mode and Let It Grow mode. Modify the existing title screen and boot flow to support dual-mode operation.

## Context

The game currently boots directly into Story Mode. With Let It Grow, players need to choose which mode to play. Both modes share the same codebase but configure systems differently.

## What to Build

### 1. Mode Selection UI

After the title screen (which has 3 save slots), add mode awareness:

- Each save slot shows its mode: "Story Mode — Chapter 5, Spring" or "Let It Grow — Gardening L3"
- New Game prompts: "Choose your mode" with two cards:

```
┌─────────────────────┐  ┌─────────────────────┐
│   🌱 Story Mode     │  │   🌍 Let It Grow     │
│                     │  │                     │
│  A guided 12-chapter│  │  Open-world sandbox  │
│  narrative journey  │  │  with NPCs & quests  │
│  through 3 years of │  │  Explore, craft, and │
│  garden seasons.    │  │  grow your           │
│                     │  │  neighborhood.       │
│  [Start Story]      │  │  [Start Growing]     │
└─────────────────────┘  └─────────────────────┘
```

### 2. Boot Flow Changes

```
Title Screen → [Continue / New Game]
                    ↓ New Game
            Mode Selection
                    ↓
            [Story Mode]  or  [Let It Grow]
                    ↓              ↓
            Initialize         Initialize
            Story systems      LIG systems
```

### 3. Mode-Specific System Configuration

In `main.js` boot sequence:

```js
if (mode === 'story') {
  // Disable: movement, tool HUD, quests, reputation, inventory, crafting
  // Enable: phase machine, cutscenes, chapter progression, intervention tokens
  movementController.setEnabled(false);
  toolHUD.setVisible(false);
  camera.clearFollowTarget();
}

if (mode === 'let_it_grow') {
  // Enable: movement, tool HUD, quests, reputation, inventory
  // Configure: real-time tools, proximity interaction, zone transitions
  movementController.setEnabled(true);
  toolHUD.setVisible(true);
  camera.setFollowTarget(() => player.mesh.position);
}
```

### 4. Mode Persistence

- Save slot stores mode: `{ mode: 'story' | 'let_it_grow', ...campaignData }`
- Loading a save automatically configures the correct mode
- No mode switching mid-save (start a new save to play different mode)

### 5. Shared Systems

Both modes use:
- Scoring algorithm
- Crop data
- Event deck
- Save system
- Rendering (garden scene, weather FX)
- Seasonal progression

### 6. Visual Design

Mode selection cards should use the existing design system:
- Card backgrounds: `--cream` with `--soil` border
- Active/hover: `--sun` border, slight elevation
- Typography: Fraunces headings, DM Sans body
- Icons: emoji or simple SVG silhouettes
- Responsive: stack vertically on mobile

## Approach

1. Read the existing title screen implementation in `main.js` or the game's HTML
2. Understand the current boot/save flow
3. Add mode selection after save slot selection
4. Wire mode flag through to system configuration
5. Test both modes boot correctly

## Constraints

- Story Mode must work identically to current behavior (no regressions)
- Let It Grow mode enables all Phase 1 features (movement, tools, proximity)
- No external dependencies
- Responsive design (mobile-first)
- Save data backward compatibility (old saves default to 'story' mode)

## Deliverable

- Modified title screen with mode selection
- Mode-aware boot flow in main.js
- Save format extended with mode field
- Both modes bootable and playable

## After completing changes

- Commit with message: `feat: add Story Mode / Let It Grow mode selector with dual-mode boot`
- Do NOT push

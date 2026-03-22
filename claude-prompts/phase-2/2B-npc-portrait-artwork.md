# Claude Prompt — Phase 2B: NPC Portrait Artwork

## Task

Design CSS-based portrait systems for the 3 core NPCs (Old Gus, Maya, Lila) following the existing portrait pattern in `src/data/portraits.js`.

## Context

The existing portrait system uses layered CSS to render character faces with 6 emotional states. Each character has a base portrait with emotion-specific overrides. The `resolvePortraitLayers()` function merges these layers.

## Existing Pattern

Study `src/data/portraits.js` to understand:
- How portraits are defined as CSS layer objects
- How emotions modify the base portrait
- How `resolvePortraitLayers(characterId, emotion)` works
- The CSS classes and properties used

Then study `src/ui/dialogue-panel.js` to understand how portraits are rendered in the dialogue box.

## Characters to Design

### Old Gus
- **Appearance**: Weathered face, deep wrinkles, white/grey stubble, old straw hat, sun-worn skin
- **Colors**: Warm brown skin (#8B6F47), hat straw (#D4A843), shirt earth green (#4A6741)
- **Emotions**: neutral (thoughtful squint), warm (rare gentle smile), sad (downcast eyes), surprised (eyebrows up, hat tilts), smirk (knowing half-smile), emphasis (pointing finger, leaning in)

### Maya
- **Appearance**: Young, round face, safety goggles pushed up on forehead, messy bun, paint/grease smudges
- **Colors**: Light skin (#F5DEB3), goggles brass (#B8860B), apron purple (#7B68AE)
- **Emotions**: neutral (curious tilt), warm (beaming grin, goggles sparkle), sad (goggles down over eyes), surprised (mouth open, hands up), smirk (side-eye with one raised eyebrow), emphasis (waving wrench)

### Lila
- **Appearance**: Kind eyes, chef's toque, apron, warm complexion, flour dusting
- **Colors**: Medium brown skin (#A0785C), toque white (#F5F5F0), apron crimson (#B22234)
- **Emotions**: neutral (measuring gaze), warm (inviting smile, gesturing to food), sad (disappointed head shake), surprised (hands on cheeks), smirk (taste-testing expression), emphasis (knife pointing, decisive)

## Approach

1. Read `src/data/portraits.js` thoroughly — understand the exact data format
2. Read `src/ui/dialogue-panel.js` — understand how portraits render
3. Design each NPC portrait as CSS layers matching the existing format
4. Add entries to `portraits.js`
5. Add speaker entries to `src/data/speakers.js` for the 3 new NPCs
6. Test by triggering a dialogue scene with each NPC

## Design Guidelines

- Use the same CSS technique as existing portraits (no images, pure CSS)
- Faces should be recognizable at the small dialogue panel size (~120px)
- Color palette should complement but not clash with existing characters
- Each emotion should be distinct and readable at small size
- Accessible: sufficient contrast for all elements

## Deliverable

- Modified `src/data/portraits.js` — 3 new character entries with 6 emotions each
- Modified `src/data/speakers.js` — 3 new speaker entries
- Manual verification: each NPC renders correctly in dialogue panel with all 6 emotions

## After completing changes

- Commit with message: `art: add CSS portrait artwork for Old Gus, Maya, and Lila NPCs`
- Do NOT push

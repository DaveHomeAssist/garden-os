# Garden OS Creator Guide

Last verified: 2026-10-13

## Scope

Content packs are declarative JSON files that add crops, quests, and neighbors to Story Mode. Packs never execute script. Invalid packs are refused with actionable errors and the game keeps running without them.

Canonical schema: `specs/CONTENT_PACK_SCHEMA.json` (manifest format 1, schema revision 1.1.0)

Example packs: `examples/packs/`

| Pack | Shows |
|---|---|
| `spring-herbs.json` | A crop only pack |
| `porch-quest.json` | A quest only pack, posted on the notice board |
| `riverside-neighbor.json` | A full neighbor pack: a neighbor who stands at the riverside, their quest, and a place |
| `malformed-pack.json` | A pack the validator must refuse |

## Installing a Pack

1. Open Story Mode and start or load a game.
2. Open the pause menu and choose **Content Packs**.
3. Choose **Install** and pick one or more `.json` pack files from your device.
4. Choose **Save and reload**. Packs load when the game starts, so a season in progress never loses a crop or quest halfway through.

Installed packs are kept in this browser (`localStorage` key `gos-content-packs`), up to 12 packs of 64 KB each. Remove a pack from the same sheet and reload.

Developers can also inject packs before boot through `globalThis.GARDEN_OS_CONTENT_PACKS`.

## Pack Shape

```json
{
  "id": "spring_herbs",
  "formatVersion": 1,
  "version": "1.0.0",
  "title": "Spring Herbs",
  "author": "Garden OS",
  "content": {
    "crops": [],
    "quests": [],
    "npcs": [],
    "zones": []
  }
}
```

Rules:
1. `id` uses lowercase letters, numbers, and underscores.
2. `version` uses semantic versioning, for example `1.0.0`. `formatVersion` is optional and must be `1`.
3. `content` may include `crops`, `quests`, `npcs`, and `zones`. Unknown keys are refused.
4. Ids may not reuse an official crop, quest, neighbor, or zone id. Packs add content; they never replace it.
5. At most 40 entries per content type.

### Crops

Every crop needs the scoring inputs from `specs/SCORING_RULES.md`: `sunMin`, `sunIdeal`, `support`, `shadeScore`, `coolSeason`, `tall`, `water`, `companions`, `conflicts`, and `seasonalMultipliers` for all four seasons, plus `name`, `faction`, and `chapterUnlock` (1 to 12). A pack crop joins the crop palette from its unlock chapter and scores exactly like an official crop.

### Quests

Requirements use the types the quest engine checks: `crop_harvested`, `crop_planted`, `festival_completed`, `item_crafted`, `item_delivered`, `item_found`, `item_traded`, `reputation`, `season`, `spot_foraged`, `zone_visited` (zone ids come from `specs/WORLD_MAP.json`). Rewards are `reputation` (up to 20), `xp` (up to 50), `seed`, or `item`. Every quest needs at least two outcomes with their own ids, labels, and rewards.

A quest whose `npc` is a pack neighbor with a `zone` is offered by that neighbor in person. Any other pack quest is posted on the neighborhood notice board.

### Neighbors

A neighbor needs `id`, `name`, and `role`. Add `zone` (a WORLD_MAP zone id), `position` (`x` and `z` from -12 to 12), `seasons`, `greeting`, and `farewell` to place them in the world. Outside their seasons they are not around.

### Places

Zones in a pack are recorded with the pack and listed in Content Packs, but they cannot be visited yet: there is no scene format for pack places.

## Runtime Behavior

Each loaded entry is tagged:

```json
{
  "modded": true,
  "provenance": {
    "packId": "spring_herbs",
    "packVersion": "1.0.0",
    "contentType": "crops"
  }
}
```

Modded content is labeled wherever it appears: crops in the palette, quests in the tracker and quest log, and neighbors by name in the world.

The campaign save stores this boot's pack status in `campaign.contentPacks.loaded` and `campaign.contentPacks.rejected`, and one provenance row per pack entry in `campaign.contentProvenance`.

Pack quest completions stay on this device. The save authority signs official quest rewards only; it cannot vouch for rewards a pack defines.

## Validation Flow

```bash
cd story-mode
npx vitest run src/content/content-packs.test.js src/game/open-world-phases.test.js
```

The suite installs the example packs, plays a pack quest to completion, scores a pack crop, places a pack neighbor, and confirms the malformed pack and an official id override are refused.

## Authoring Checklist

1. Copy the example closest to what you want from `examples/packs/`.
2. Change `id`, `version`, and `title`.
3. Add content under the supported arrays.
4. Install it from the pause menu and fix every error the sheet lists.
5. Reload and find your content: palette for crops, notice board or your neighbor for quests.

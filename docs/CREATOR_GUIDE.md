# Garden OS Creator Guide

Last verified: 2026-06-24

## Scope

Content packs are declarative JSON files for adding crops, zones, quests, and NPCs to Story Mode. Packs do not execute script. Invalid packs are rejected with actionable errors and the core game continues to run.

Canonical schema: `specs/CONTENT_PACK_SCHEMA.json`

Example packs: `examples/packs/`

## Pack Shape

```json
{
  "id": "spring_herbs",
  "version": "1.0.0",
  "title": "Spring Herbs",
  "author": "Garden OS",
  "content": {
    "crops": [],
    "zones": [],
    "quests": [],
    "npcs": []
  }
}
```

Rules:
1. `id` uses lowercase letters, numbers, and underscores.
2. `version` uses semantic versioning, for example `1.0.0`.
3. `content` may include `crops`, `zones`, `quests`, and `npcs`.
4. Unknown content keys are rejected.
5. Packs are data only.

## Runtime Behavior

At boot, Story Mode reads `globalThis.GARDEN_OS_CONTENT_PACKS` when present and passes the array to `loadContentPacks`.

Each valid content entry is tagged at runtime:

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

The campaign save stores pack provenance in `campaign.contentProvenance` and pack status in `campaign.contentPacks.loaded` or `campaign.contentPacks.rejected`.

## Validation Flow

Run the smoke script:

```bash
node docs/open-world-phases-smoke.mjs
```

The smoke loads three valid example packs and one malformed pack. The malformed pack must be rejected without crashing.

## Authoring Checklist

1. Copy one example from `examples/packs/`.
2. Change `id`, `version`, and `title`.
3. Add content under one of the supported arrays.
4. Run the smoke script.
5. Fix every error path reported by the validator.

## Current Limits

The Phase 8 loader validates, tags, and preserves provenance for pack content. Gameplay systems can consume the tagged runtime content from the loader result as additional surfaces are opened.

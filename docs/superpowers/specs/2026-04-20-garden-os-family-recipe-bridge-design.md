# Garden OS Family Recipe Bridge Design

- Date: 2026-04-20
- Project: Garden OS
- Related repo: `recipe-tracker`
- Status: Draft for review

## Goal

Let Garden OS show which real family recipes are supported by the current planted crop plan, using the family recipe library as the content source and Garden OS as the crop-intelligence layer.

This is intentionally narrower than a full meal-planning or pantry system. Version 1 answers one question well:

- Which family recipes can this planted garden contribute to right now?

## Problem

Garden OS already knows:

- what crops are planted
- what crops can grow together
- which crops contribute to the built-in game recipe system

But it does not know anything about the real family recipe library that lives in `recipe-tracker`.

`recipe-tracker` already knows:

- real family recipe names
- ingredients
- tags
- notes
- links

But it does not know how those recipes map to Garden OS crop IDs.

The bridge must connect these two systems without breaking Garden OS's hard constraints:

- zero backend
- offline-capable
- local-first behavior
- deterministic logic

## Recommendation

Use a recipe snapshot bridge.

`recipe-tracker` remains the family recipe source of truth. It exports a small normalized JSON snapshot that Garden OS can import or refresh. Garden OS stores the latest snapshot locally, maps recipe ingredient tokens to crop IDs through a deterministic alias table, and shows recipe matches in the planner sidebar.

This is the best first version because it:

- preserves Garden OS's local-first architecture
- avoids runtime dependency on `recipe-tracker`
- avoids adding a new backend
- keeps the matching rules inspectable and deterministic
- allows offline use after a snapshot is loaded

## Alternatives Considered

### 1. Manual export and import

Use a generic export from `recipe-tracker`, then manually import it into Garden OS each time.

Pros:

- lowest implementation effort
- no network dependency after import

Cons:

- high drift risk
- no stable bridge contract
- brittle if the `recipe-tracker` export shape changes

### 2. Live runtime fetch

Garden OS fetches live recipe data from GitHub or a deployed recipe API on load.

Pros:

- always freshest recipe data

Cons:

- conflicts with Garden OS offline-first behavior
- introduces runtime coupling
- makes the planner dependent on network and external schema stability

### 3. Full shared backend

Unify both apps on a shared backend or Notion layer.

Pros:

- strongest cross-app integration

Cons:

- far beyond the goal of version 1
- violates the simplicity that Garden OS currently depends on
- significantly larger operational surface

## Scope

### In scope

- export a Garden-OS-specific recipe snapshot from `recipe-tracker`
- define a normalized garden ingredient token model
- define a deterministic alias map from tokens to Garden OS crop IDs
- compute recipe matches from planted crops
- add a planner-facing Family Recipes panel in Garden OS
- support local import and local cache of the latest snapshot

### Out of scope

- pantry tracking
- harvest quantity tracking
- partial ingredient quantities
- meal planning or scheduling
- two-way sync back into `recipe-tracker`
- automated write-back from Garden OS to recipes
- a new backend
- fuzzy NLP ingredient matching in the browser

## System Shape

The bridge has three clear responsibilities:

### 1. `recipe-tracker` snapshot exporter

Produces a slim, Garden-OS-friendly JSON file.

### 2. Garden OS bridge layer

Owns:

- snapshot import and cache
- garden ingredient token aliasing
- crop-to-recipe matching

### 3. Garden OS planner UI

Shows:

- match summary
- matching recipes
- contributing crops
- recipe link out

Garden OS stays the planner. `recipe-tracker` stays the family recipe system. The bridge is the translation layer between them.

## Data Model

Garden OS should not import the full `recipe-tracker` runtime state. It only needs recipe data relevant to garden contribution.

### Snapshot shape

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-20T18:30:00.000Z",
  "recipes": [
    {
      "id": "family-moms-sauce",
      "name": "Mom's Sunday Sauce",
      "url": "https://davehomeassist.github.io/recipe-tracker/#recipe/family-moms-sauce",
      "ingredients_raw": [
        "tomatoes",
        "basil",
        "onion",
        "carrot",
        "olive oil",
        "salt"
      ],
      "garden_ingredient_tokens": [
        "tomato",
        "basil",
        "onion",
        "carrot"
      ],
      "tags": ["family", "sauce", "dinner"]
    }
  ]
}
```

### Field rules

- `schemaVersion`: bridge contract version
- `exportedAt`: ISO timestamp for freshness display
- `id`: stable recipe ID from `recipe-tracker`
- `name`: display name
- `url`: deep link or source link
- `ingredients_raw`: original ingredient strings for inspection or later UX
- `garden_ingredient_tokens`: normalized tokens used for deterministic matching
- `tags`: optional lightweight labels for display only

### Why tokens are required

The browser should not guess that:

- `tomatoes`
- `roma tomatoes`
- `cherry tomatoes`

all mean the same garden concept.

That normalization should happen before Garden OS matches recipes. The bridge should carry a stable token list so Garden OS can stay deterministic and simple.

## Matching Model

Garden OS already has canonical crop data in:

- `specs/CROP_SCORING_DATA.json`

The bridge adds a deterministic alias table from normalized garden tokens to Garden OS crop IDs.

### Alias table example

```json
{
  "tomato": ["cherry_tom", "compact_tomato"],
  "basil": ["basil"],
  "onion": ["onion", "scallion", "prairie_onion"],
  "carrot": ["carrot"],
  "lettuce": ["lettuce", "head_lettuce"],
  "radish": ["radish"],
  "chive": ["chives"],
  "cilantro": ["cilantro"],
  "pepper": ["pepper", "ghost_pepper"]
}
```

### Version 1 matching rule

A recipe is a full garden match if every `garden_ingredient_token` in that recipe is satisfied by at least one planted crop through the alias map.

Rules:

- matching is deterministic
- no fuzzy similarity scoring
- pantry staples are excluded from garden matching
- one crop can satisfy one or more matching tokens if the alias map allows it
- results must be explainable

### Example

Planted crops:

```json
[
  "cherry_tom",
  "basil",
  "onion",
  "carrot",
  "lettuce",
  "radish"
]
```

Recipes:

- `Mom's Sunday Sauce`
  - tokens: `tomato`, `basil`, `onion`, `carrot`
  - result: full match
- `Grandmom's Garden Salad`
  - tokens: `lettuce`, `radish`, `carrot`, `chive`
  - result: not a full match because `chive` is missing
- `Fresh Garden Salsa`
  - tokens: `tomato`, `cilantro`, `onion`, `pepper`
  - result: not a full match because `cilantro` and `pepper` are missing

## UI Design

### Placement

This should be a planner-level feature, not a per-cell inspector feature.

Recommended location:

- a new `Family Recipes` panel or tab in the planner sidebar

Why:

- the question is about the whole garden plan, not one cell
- it avoids crowding the inspect flow
- it keeps recipe reasoning in the same place users already review plan outcomes

### Panel contents

Top summary:

- `You can make 1 family recipe from this plan`
- `Last synced: Apr 20, 2026`

Recipe list card:

- recipe name
- contributing crops
- optional tags
- `Open Recipe` link

Empty states:

- if no snapshot:
  - `No family recipe library loaded yet`
  - `Import or refresh a recipe snapshot to see recipe matches`
- if snapshot exists but no matches:
  - `No full family recipe matches yet`
  - optional hint list of missing tokens for future enhancement

## Sync Flow

### Version 1 flow

1. User opens `recipe-tracker`
2. User exports or generates the Garden OS snapshot
3. User opens Garden OS
4. User clicks `Load Family Recipes`
5. Garden OS imports the snapshot
6. Garden OS validates and stores it in localStorage
7. The planner recomputes recipe matches whenever planted crops change

### Storage behavior

Garden OS stores:

- last valid imported snapshot
- snapshot metadata such as `exportedAt`

Garden OS should continue working offline using the last imported snapshot.

## Validation and Error Handling

### Snapshot validation

Reject snapshot imports that:

- have no `recipes` array
- are missing required fields like `id`, `name`, or `garden_ingredient_tokens`
- contain unknown or unsupported schema versions

Accept snapshot imports with per-recipe problems only if the top-level snapshot is otherwise valid. In that case, Garden OS should skip malformed recipe entries, warn the user, and keep processing the remaining valid recipes.

### Alias validation

Flag bridge issues when:

- a garden token has no alias mapping
- a mapped crop ID does not exist in canonical crop data

Version 1 behavior should fail safely:

- skip invalid recipe entries when the snapshot contract itself is valid
- show an import warning
- preserve the last known good snapshot

## Testing Strategy

### Unit tests

- snapshot validator
- token-to-crop alias resolver
- recipe match engine

### Fixture tests

- known recipe snapshot + planted crop set -> expected full matches
- malformed snapshot -> safe rejection

### UI checks

- empty state with no snapshot
- empty state with snapshot but no matches
- full match rendering
- recipe link rendering

## File Layout Recommendation

### In `recipe-tracker`

Add a small export helper or build step that can generate:

- `garden-recipes.json`

Suggested responsibility:

- convert free-form ingredients into bridge tokens
- strip recipe fields Garden OS does not need

### In Garden OS

Suggested additions:

- `sync/family-recipes-schema.json` or similar contract file
- bridge import helper in an existing local-first utility area
- deterministic alias map in a dedicated JSON or JS data file
- Family Recipes planner panel wiring in the planner surface

Do not add a backend or build dependency to the repo-root Garden OS tool suite for this feature.

## Development Steps

1. Garden recipe snapshot export
   - problem solved: stable bridge contract from family recipe library
   - complexity: medium

2. Garden ingredient normalizer
   - problem solved: free-text ingredients become deterministic bridge tokens
   - complexity: medium

3. Crop alias map in Garden OS
   - problem solved: tokens resolve to canonical crop IDs
   - complexity: low

4. Recipe match engine
   - problem solved: determine which family recipes are supported by the current plan
   - complexity: medium

5. Family Recipes planner panel
   - problem solved: expose recipe contribution in the planner where users make decisions
   - complexity: medium

## Recommendation Summary

Build the smallest bridge that works:

- snapshot export from `recipe-tracker`
- deterministic token normalization
- deterministic alias map in Garden OS
- planner panel that shows full family recipe matches

This solves the real user need without dragging Garden OS into a backend or live cross-app dependency.

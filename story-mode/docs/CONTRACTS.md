# Phase B: Module Build Contracts

Frozen API contracts for Codex-like agents. Each module is a self-contained build assignment.

## Execution Order

1. **ToolManager** — unlocks 5 skipped tests (tool system + mode selector)
2. **AudioManager** — unlocks 4 skipped tests (audio system)
3. **MultiBedManager** — unlocks 3 skipped tests (multiple beds)
4. **BiomeCropBridge** — unlocks 2 skipped tests (biome crops)

## Rules

- Codex agents create NEW files only. Never modify existing files.
- Each module exports a class matching the contract exactly.
- Each module includes a `.test.js` file with unit tests.
- Integration wiring (into ui-binder.js, store.js, state.js) is done by Claude Code.
- Style reference files are read-only references for code style, not modification targets.

## Contract 1: ToolManager

**Output files:** `src/game/tool-manager.js`, `src/game/tool-manager.test.js`
**Style reference:** `src/game/inventory.js`

### Exports

```js
export class ToolManager {
  constructor(store, inventory)
  registerTool(id, { name, icon, action, durability, cooldownMs })
  getTool(id) → ToolDef | null
  getAllTools() → ToolDef[]
  selectTool(toolId) → ToolDef | null
  getSelectedTool() → ToolDef | null
  canUseTool(toolId, cellIndex) → boolean
  useTool(toolId, cellIndex) → { success, costDurability? }
  getToolDurability(toolId) → { current, max } | null
  repairTool(toolId, restoredTo) → { success }
  dispose()
}
```

### Default Tools

| id | name | icon | durability | action |
|----|------|------|-----------|--------|
| watering_can | Watering Can | 💧 | 100 | WATER_CELL |
| pruning_shears | Pruning Shears | ✂️ | 50 | PRUNE_CELL |
| soil_scanner | Soil Scanner | 📡 | 30 | SCAN_CELL |
| smart_watering_can | Smart Watering Can | 🚿 | 80 | WATER_CELL |

### Store Integration (for Claude to wire)

New actions: `EQUIP_TOOL`, `SET_ACTIVE_TOOL`
State additions: `season.activeTool`, `campaign.gameMode`

---

## Contract 2: AudioManager

**Output files:** `src/audio/audio-manager.js` (ALREADY EXISTS — verify and extend)
**Style reference:** `src/scene/weather-fx.js`

### Exports (already implemented)

```js
export class AudioManager {
  constructor()
  async init() → boolean
  registerSFX(id, url, { volume, pitch, cooldownMs })
  playSFX(id) → boolean
  playPlaceholder(id, pitch?) → boolean
  async setAmbient(url, { fadeInMs?, volume? })
  stopAmbient(fadeOutMs?)
  setMasterVolume(v)
  setSFXVolume(v)
  setAmbientVolume(v)
  setMuted(muted)
  async suspend()
  async resume()
  dispose()
}
```

### Note

AudioManager already exists at `src/audio/audio-manager.js`. Codex task is to:
1. Verify it matches this contract
2. Add missing methods if any
3. Write `src/audio/audio-manager.test.js` with unit tests

---

## Contract 3: MultiBedManager

**Output files:** `src/game/multi-bed.js`, `src/game/multi-bed.test.js`
**Style reference:** `src/game/state.js` (createGrid, GRID_UNLOCKS pattern)

### Exports

```js
export class MultiBedManager {
  constructor(store)
  acquireBed(bedId, { name, zone, initialGridCols, initialGridRows })
  getBed(bedId) → BedState | null
  getAllBeds() → BedState[]
  getActiveBed() → BedState | null
  switchActiveBed(bedId) → boolean
  getActiveGrid() → Cell[]
  getGridForBed(bedId) → Cell[]
  expandBedGrid(bedId, newRows) → boolean
  serializeBeds() → BedState[]
  loadBeds(bedStates) → void
  dispose()
}
```

### BedState Shape

```js
{ id, name, zone, grid: Cell[], gridCols, gridRows, harvestResult: null }
```

### Store Integration (for Claude to wire)

New actions: `ACQUIRE_BED`, `SWITCH_BED`
State additions: `campaign.beds`, `campaign.activeBedId`

---

## Contract 4: BiomeCropBridge

**Output files:** `src/game/biome-crops.js`, `src/game/biome-crops.test.js`
**Style reference:** `src/game/foraging.js`

### Exports

```js
export class BiomeCropBridge {
  constructor(store, foragingSystem)
  getBiomeCropsForZone(zoneId) → string[]
  getZoneForCrop(cropId) → string | null
  unlockBiomeCrop(cropId) → boolean
  isCropBiomeExclusive(cropId) → boolean
  isCropUnlocked(cropId) → boolean
  getBiomeCropRecipes() → { [recipeId]: RecipeData }
  getForageableBiomeCrops(zoneId, season) → string[]
  dispose()
}
```

### Biome Crop Data

| cropId | zone | faction |
|--------|------|---------|
| wild_garlic | forest_edge | woodland |
| shiitake_mushroom | forest_edge | woodland |
| watercress | riverside | river |
| prairie_onion | meadow | meadow |

### Store Integration (for Claude to wire)

New actions: `UNLOCK_BIOME_CROP`
State additions: `campaign.biomeCropsUnlocked`

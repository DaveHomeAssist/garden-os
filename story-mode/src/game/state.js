/**
 * Game State — campaign + season state objects.
 */
import { getAllCrops, getCropsForChapter } from '../data/crops.js';
import { addItemToInventoryState, createInventoryState } from './inventory.js';
import { getDefaultSkillsState, getSkillXpMap } from './skills.js';

const PHASES = {
  PLANNING: 'PLANNING',
  EARLY_SEASON: 'EARLY_SEASON',
  MID_SEASON: 'MID_SEASON',
  LATE_SEASON: 'LATE_SEASON',
  HARVEST: 'HARVEST',
  TRANSITION: 'TRANSITION',
};

const BEAT_PHASES = [PHASES.EARLY_SEASON, PHASES.MID_SEASON, PHASES.LATE_SEASON];

const SEASONS = ['spring', 'summer', 'fall', 'winter'];

const COLS = 8;
const ROWS = 4;
const CELL_COUNT = COLS * ROWS;
const GRID_UNLOCKS = [
  { cols: 8, rows: 4, chapter: 1, gardeningLevel: 1 },
  { cols: 8, rows: 6, chapter: 6, gardeningLevel: 5 },
  { cols: 8, rows: 8, chapter: 10, gardeningLevel: 8 },
];
const DEFAULT_SITE_CONFIG = { sunHours: 6, trellis: true, orientation: 'ew' };
const DEFAULT_REPUTATION = { old_gus: 0, maya: 0, lila: 0 };
const DEFAULT_WORLD_STATE = {
  currentZone: 'player_plot',
  visitedZones: ['player_plot'],
  lastSpawnPoint: null,
};

// All phases in order for progress indicator
const PHASE_ORDER = [
  PHASES.PLANNING,
  PHASES.EARLY_SEASON,
  PHASES.MID_SEASON,
  PHASES.LATE_SEASON,
  PHASES.HARVEST,
  PHASES.TRANSITION,
];

function attachGridMeta(cells, cols = COLS, rows = ROWS) {
  cells.cols = cols;
  cells.rows = rows;
  return cells;
}

function createGrid(cols = COLS, rows = ROWS) {
  return attachGridMeta(Array.from({ length: cols * rows }, () => ({
    cropId: null,
    protected: false,
    mulched: false,
    damageState: null,
    carryForwardType: null,
    eventModifier: 0,
    interventionBonus: 0,
    soilFatigue: 0,
    lastWateredAt: null,
  })), cols, rows);
}

function createEmptyGrid(cols = COLS, rows = ROWS) {
  return createGrid(cols, rows);
}

function getGridCols(grid, fallback = COLS) {
  return Number.isInteger(grid?.cols) ? grid.cols : fallback;
}

function getGridRows(grid, fallback = ROWS) {
  return Number.isInteger(grid?.rows) ? grid.rows : fallback;
}

function getAvailableGridSizes(chapter = 1, gardeningLevel = 1) {
  return GRID_UNLOCKS.filter((unlock) => (
    chapter >= unlock.chapter || gardeningLevel >= unlock.gardeningLevel
  ));
}

function createSeasonState(chapter, season, campaign = null, cols = COLS, rows = ROWS) {
  return {
    chapter,
    season,
    month: 1,
    phase: PHASES.PLANNING,
    beatIndex: 0,
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    grid: createEmptyGrid(cols, rows),
    gridCols: cols,
    gridRows: rows,
    interventionTokens: 3,
    eventsDrawn: [],
    eventTitles: [],
    eventActive: null,
    interventionChosen: null,
    harvestResult: null,
    lastResolvedEvent: null,
    lastEventEffectSummary: null,
    newlyEarnedKeepsakes: [],
    winterReviewSeen: false,
    toolCooldowns: {},
    campaign,
  };
}

function createCampaignState() {
  const skills = getDefaultSkillsState();
  let inventory = createInventoryState();
  inventory = addItemToInventoryState(inventory, 'watering_can', 1).inventory;
  inventory = addItemToInventoryState(inventory, 'pruning_shears', 1).inventory;
  inventory = addItemToInventoryState(inventory, 'fertilizer_bag', 3).inventory;
  inventory = addItemToInventoryState(inventory, 'pest_spray', 3).inventory;
  inventory = addItemToInventoryState(inventory, 'mulch_bag', 3).inventory;
  return {
    version: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapter: 1,
    currentSeason: 'spring',
    complete: false,
    completedChapters: [],
    seasonHistory: [],
    pantry: {},
    recipesCompleted: [],
    keepsakes: [],
    sandbox: false,
    cropsUnlocked: getCropsForChapter(1).map((crop) => crop.id),
    journalEntries: [],
    lastSeasonReview: null,
    seenCutsceneIds: [],
    masteryRank: 0,
    soilHealth: Array(CELL_COUNT).fill(1.0),
    previousGrid: null,
    questLog: {},
    reputation: { ...DEFAULT_REPUTATION },
    worldState: { ...DEFAULT_WORLD_STATE, visitedZones: [...DEFAULT_WORLD_STATE.visitedZones] },
    activeNeighbors: ['neighbor_gardener', 'neighbor_beekeeper'],
    inventory,
    craftedItems: {},
    skills,
    skillXp: getSkillXpMap(skills),
    activeFestival: null,
    lastLevelUp: null,
  };
}

function createGameState() {
  const campaign = createCampaignState();
  const season = createSeasonState(1, 'spring', campaign);
  return {
    campaign,
    season,
    settings: {
      dayNightEnabled: false,
      audio: {
        masterVolume: 1,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        ambientVolume: 0.3,
        muted: false,
      },
    },
    selectedCropId: null,
    cameraMode: 'overview',
    cameraWeight: 'overview',
    selectedWeight: 'overview',
    panelOpen: null,
    showChapterIntro: true,
  };
}

function createSandboxState() {
  const campaign = createCampaignState();
  const SANDBOX_COLS = 8;
  const SANDBOX_ROWS = 8;
  campaign.sandbox = true;
  campaign.currentChapter = 99;
  campaign.cropsUnlocked = getAllCrops().map((c) => c.id);
  campaign.soilHealth = Array(SANDBOX_COLS * SANDBOX_ROWS).fill(1.0);
  const season = createSeasonState(99, 'spring', campaign, SANDBOX_COLS, SANDBOX_ROWS);
  return {
    campaign,
    season,
    settings: {
      dayNightEnabled: false,
      audio: {
        masterVolume: 1,
        sfxVolume: 1,
        ambientVolume: 0.3,
        muted: false,
      },
    },
    selectedCropId: null,
    cameraMode: 'overview',
    cameraWeight: 'overview',
    selectedWeight: 'overview',
    panelOpen: null,
    showChapterIntro: false,
  };
}

export {
  PHASES,
  BEAT_PHASES,
  SEASONS,
  COLS,
  ROWS,
  CELL_COUNT,
  GRID_UNLOCKS,
  PHASE_ORDER,
  DEFAULT_SITE_CONFIG,
  attachGridMeta,
  createGrid,
  createEmptyGrid,
  createSeasonState,
  createCampaignState,
  createGameState,
  createSandboxState,
  DEFAULT_REPUTATION,
  DEFAULT_WORLD_STATE,
  getGridCols,
  getGridRows,
  getAvailableGridSizes,
};

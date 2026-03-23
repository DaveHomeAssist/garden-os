/**
 * Game State — campaign + season state objects.
 */
import { getCropsForChapter } from '../data/crops.js';

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
const DEFAULT_SITE_CONFIG = { sunHours: 6, trellis: true, orientation: 'ew' };

// All phases in order for progress indicator
const PHASE_ORDER = [
  PHASES.PLANNING,
  PHASES.EARLY_SEASON,
  PHASES.MID_SEASON,
  PHASES.LATE_SEASON,
  PHASES.HARVEST,
  PHASES.TRANSITION,
];

function createEmptyGrid() {
  return Array.from({ length: CELL_COUNT }, () => ({
    cropId: null,
    protected: false,
    mulched: false,
    damageState: null,
    carryForwardType: null,
    eventModifier: 0,
    interventionBonus: 0,
    soilFatigue: 0,
  }));
}

function createSeasonState(chapter, season, campaign = null) {
  return {
    chapter,
    season,
    phase: PHASES.PLANNING,
    beatIndex: 0,
    siteConfig: { ...DEFAULT_SITE_CONFIG },
    grid: createEmptyGrid(),
    interventionTokens: 3,
    eventsDrawn: [],
    eventTitles: [],
    eventActive: null,
    interventionChosen: null,
    beatScores: [],
    harvestResult: null,
    lastResolvedEvent: null,
    lastEventEffectSummary: null,
    newlyEarnedKeepsakes: [],
    winterReviewSeen: false,
    campaign,
  };
}

function createCampaignState() {
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
    activeNeighbors: [],
    inventory: {},
    craftedItems: {},
    skills: {},
    skillXp: {},
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
    selectedCropId: null,
    cameraMode: 'overview',
    cameraWeight: 'overview',
    selectedWeight: 'overview',
    panelOpen: null,
    showChapterIntro: true,
    settings: {
      audio: { musicVolume: 0.5, sfxVolume: 0.7, muted: false },
    },
  };
}

const DEFAULT_REPUTATION = {
  old_gus: 0,
  maya: 0,
  lila: 0,
};

const DEFAULT_WORLD_STATE = {
  currentZone: 'player_plot',
  visitedZones: ['player_plot'],
};

/**
 * Attach grid dimension metadata to a cell array.
 * Runtime grid is always an array with .cols/.rows properties.
 * For serialization, use saveSeasonState which converts to { cells, cols, rows }.
 */
function attachGridMeta(cells, cols = COLS, rows = ROWS) {
  const arr = Array.isArray(cells) ? cells : [];
  arr.cols = cols;
  arr.rows = rows;
  return arr;
}

function getGridCols(grid) {
  return grid?.cols ?? COLS;
}

function getGridRows(grid) {
  return grid?.rows ?? ROWS;
}

export {
  PHASES,
  BEAT_PHASES,
  SEASONS,
  COLS,
  ROWS,
  CELL_COUNT,
  PHASE_ORDER,
  DEFAULT_SITE_CONFIG,
  DEFAULT_REPUTATION,
  DEFAULT_WORLD_STATE,
  createEmptyGrid,
  createSeasonState,
  createCampaignState,
  createGameState,
  attachGridMeta,
  getGridCols,
  getGridRows,
};

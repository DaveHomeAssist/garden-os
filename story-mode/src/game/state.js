/**
 * Game State — campaign + season state objects.
 */
import { getCropsForChapter } from '../data/crops.js';

const PHASES = {
  PLANNING: 'PLANNING',
  COMMIT: 'COMMIT',
  EARLY_SEASON: 'EARLY_SEASON',
  MID_SEASON: 'MID_SEASON',
  LATE_SEASON: 'LATE_SEASON',
  HARVEST: 'HARVEST',
  REVIEW: 'REVIEW',
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
  PHASES.COMMIT,
  PHASES.EARLY_SEASON,
  PHASES.MID_SEASON,
  PHASES.LATE_SEASON,
  PHASES.HARVEST,
  PHASES.REVIEW,
  PHASES.TRANSITION,
];

function createEmptyGrid() {
  return Array.from({ length: CELL_COUNT }, () => ({
    cropId: null,
    protected: false,
    mulched: false,
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
    campaign,
  };
}

function createCampaignState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapter: 1,
    currentSeason: 'spring',
    complete: false,
    completedChapters: [],
    seasonHistory: [],
    pantry: {},
    recipesCompleted: [],
    cropsUnlocked: getCropsForChapter(1).map((crop) => crop.id),
    journalEntries: [],
    seenCutsceneIds: [],
    masteryRank: 0,
    soilHealth: Array(CELL_COUNT).fill(1.0),
    previousGrid: null,
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
  };
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
  createEmptyGrid,
  createSeasonState,
  createCampaignState,
  createGameState,
};

/**
 * Game State — campaign + season state objects.
 */

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

function createSeasonState(chapter, season) {
  return {
    chapter,
    season,
    phase: PHASES.PLANNING,
    beatIndex: 0,
    grid: createEmptyGrid(),
    interventionTokens: 3,
    eventsDrawn: [],
    eventActive: null,
    interventionChosen: null,
    beatScores: [],
    harvestResult: null,
  };
}

function createCampaignState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapter: 1,
    completedChapters: [],
    seasonHistory: [],
    pantry: {},
    recipesCompleted: [],
    cropsUnlocked: [],
    journalEntries: [],
    masteryRank: 0,
    soilHealth: Array(CELL_COUNT).fill(1.0),
  };
}

function createGameState() {
  const campaign = createCampaignState();
  const season = createSeasonState(1, 'spring');
  return {
    campaign,
    season,
    selectedCropId: null,
    cameraMode: 'overview',
    cameraWeight: 'overview',
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
  createEmptyGrid,
  createSeasonState,
  createCampaignState,
  createGameState,
};

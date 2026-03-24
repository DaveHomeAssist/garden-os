/**
 * Phase Machine — implements SEASON_ENGINE_SPEC.md state transitions.
 */
import { PHASES, BEAT_PHASES, SEASONS, createSeasonState, getAvailableGridSizes } from './state.js';
import { getCropsForChapter } from '../data/crops.js';
import { drawEvent } from '../data/events.js';
import { scoreBed } from '../scoring/bed-score.js';
import { pushJournalEntry, saveCampaign } from './save.js';

const TRANSITIONS = {
  [PHASES.PLANNING]: PHASES.EARLY_SEASON,
  [PHASES.EARLY_SEASON]: PHASES.MID_SEASON,
  [PHASES.MID_SEASON]: PHASES.LATE_SEASON,
  [PHASES.LATE_SEASON]: PHASES.HARVEST,
  [PHASES.HARVEST]: PHASES.TRANSITION,
  [PHASES.TRANSITION]: PHASES.PLANNING,
};

function rotateSeason(currentSeason) {
  const currentIndex = SEASONS.indexOf(currentSeason);
  if (currentIndex === -1) return SEASONS[0];
  return SEASONS[(currentIndex + 1) % SEASONS.length];
}

function listPlantedCropIds(grid) {
  return [...new Set(grid.map((cell) => cell.cropId).filter(Boolean))];
}

function createAdvanceResult() {
  return {
    advanced: false,
    seasonChanged: false,
    chapterChanged: false,
    campaignComplete: false,
    scoreResult: null,
    journalEntryAdded: false,
    trigger: null,
  };
}

function getEventSeverity(event) {
  const modifier = Math.abs(event?.mechanicalEffect?.modifier ?? 0);
  const duration = event?.mechanicalEffect?.duration ?? 'current_beat';
  if (modifier >= 1.5 || duration === 'season' || event?.carryForward) return 'high';
  if (modifier >= 0.75 || duration === 'current_season') return 'medium';
  return 'low';
}

function createEventTrigger(season) {
  if (!season.eventActive) return null;
  return {
    type: 'event_drawn',
    eventId: season.eventActive.id,
    eventTitle: season.eventActive.title,
    eventDescription: season.eventActive.description,
    eventCategory: season.eventActive.category,
    eventValence: season.eventActive.valence,
    eventSeverity: getEventSeverity(season.eventActive),
    eventCarryForward: season.eventActive.carryForward?.effect ?? null,
    eventCommentary: season.eventActive.commentary ?? null,
    season: season.season,
    chapter: season.chapter,
  };
}

function assignBeatState(season, beatIndex) {
  season.beatIndex = beatIndex;
  season.month = beatIndex + 1;
  season.interventionChosen = null;
  season.eventActive = drawEvent(season.season, season.chapter, season.eventsDrawn, season.month);

  if (season.eventActive) {
    season.eventsDrawn.push(season.eventActive.id);
    season.eventTitles.push(season.eventActive.title);

    // Ensure every event has a mechanicalEffect — assign a default for stub events
    if (!season.eventActive.mechanicalEffect) {
      season.eventActive.mechanicalEffect = season.eventActive.valence === 'positive'
        ? { modifier: 0.3, target: { type: 'random_cells' }, duration: 'current_beat' }
        : { modifier: -0.5, target: { type: 'random_cells' }, duration: 'current_beat' };
    }
  }
}

function finalizeHarvest(season) {
  if (season.harvestResult) return season.harvestResult;

  const campaign = season.campaign ?? null;
  const pantry = campaign?.pantry ?? {};
  season.harvestResult = scoreBed(season.grid, season.siteConfig, season.season, pantry);
  return season.harvestResult;
}

function recordSeasonJournal(season) {
  const campaign = season.campaign;
  if (!campaign) return false;

  const harvest = finalizeHarvest(season);
  pushJournalEntry(campaign, {
    chapter: season.chapter,
    season: season.season,
    score: harvest.score,
    grade: harvest.grade,
    eventsEncountered: season.eventTitles,
    cropsPlanted: listPlantedCropIds(season.grid),
    timestamp: new Date().toISOString(),
  });
  return true;
}

function summarizeReviewCell(cellScore, grid) {
  const sourceCell = grid[cellScore.cellIndex] ?? {};
  return {
    cellIndex: cellScore.cellIndex,
    cropId: cellScore.cropId,
    total: cellScore.total,
    factors: { ...cellScore.factors },
    soilFatigue: sourceCell.soilFatigue ?? 0,
    eventModifier: sourceCell.eventModifier ?? 0,
    interventionBonus: sourceCell.interventionBonus ?? 0,
    carryForwardType: sourceCell.carryForwardType ?? null,
  };
}

function buildSeasonReviewSnapshot(season) {
  const harvest = finalizeHarvest(season);
  const rankedCells = (harvest.cellScores ?? [])
    .filter(Boolean)
    .map((cellScore) => summarizeReviewCell(cellScore, season.grid));

  const bestCells = [...rankedCells]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const worstCells = [...rankedCells]
    .sort((a, b) => a.total - b.total)
    .slice(0, 3);

  return {
    chapter: season.chapter,
    season: season.season,
    score: harvest.score,
    grade: harvest.grade,
    occupiedCount: harvest.occupiedCount ?? 0,
    eventsEncountered: [...(season.eventTitles ?? [])],
    yieldList: [...(harvest.yieldList ?? [])],
    recipeMatches: [...(harvest.recipeMatches ?? [])],
    bestCells,
    worstCells,
  };
}

const HEAVY_FEEDERS = new Set([
  'cherry_tom', 'compact_tomato', 'pepper', 'zucchini', 'broccoli',
  'kale', 'lettuce', 'arugula', 'spinach', 'chard', 'basil',
]);

function applyCarryForwardInfrastructure(nextCell, previousCell) {
  if (!previousCell?.carryForwardType) return;

  if (previousCell.carryForwardType === 'mulched') {
    nextCell.eventModifier += 0.25;
    return;
  }

  if (previousCell.carryForwardType === 'compacted') {
    nextCell.eventModifier -= 0.5;
    return;
  }

  if (previousCell.carryForwardType === 'enriched') {
    nextCell.eventModifier += 0.3;
  }
}

function rollCampaignForward(season) {
  const campaign = season.campaign;
  if (!campaign) {
    return { complete: false, chapterChanged: false };
  }

  if (!campaign.completedChapters.includes(season.chapter)) {
    campaign.completedChapters.push(season.chapter);
  }

  campaign.seasonHistory.push({
    chapter: season.chapter,
    season: season.season,
    score: season.harvestResult?.score ?? 0,
    grade: season.harvestResult?.grade ?? 'F',
  });

  // Bug 2/8: Save current grid as previousGrid before creating next season
  campaign.lastSeasonReview = buildSeasonReviewSnapshot(season);
  campaign.previousGrid = season.grid.map((cell) => ({ ...cell }));

  if (campaign.sandbox) {
    const nextSeason = rotateSeason(season.season);
    campaign.currentSeason = nextSeason;
    const cols = season.gridCols ?? 8;
    const rows = season.gridRows ?? 8;
    const nextSeasonState = createSeasonState(campaign.currentChapter, nextSeason, campaign, cols, rows);
    if (campaign.previousGrid) {
      for (let i = 0; i < nextSeasonState.grid.length; i++) {
        const prevCell = campaign.previousGrid[i];
        if (prevCell && prevCell.cropId && HEAVY_FEEDERS.has(prevCell.cropId)) {
          nextSeasonState.grid[i].soilFatigue = Math.min(
            (nextSeasonState.grid[i].soilFatigue || 0) + 0.3,
            0.9,
          );
        }
        applyCarryForwardInfrastructure(nextSeasonState.grid[i], prevCell);
      }
    }
    Object.assign(season, nextSeasonState);
    return { complete: false, chapterChanged: false };
  }

  const nextChapter = campaign.currentChapter + 1;
  const nextSeason = rotateSeason(season.season);

  campaign.currentChapter = nextChapter;
  campaign.currentSeason = nextSeason;
  campaign.complete = nextChapter > 12;

  // Bug 7: End-game guard — don't create a new season if campaign is complete
  if (campaign.complete) {
    saveCampaign(campaign);
    return { complete: true, chapterChanged: true };
  }

  campaign.cropsUnlocked = getCropsForChapter(nextChapter).map((crop) => crop.id);

  // Grid expansion: unlock larger grid at chapter milestones (GRID_UNLOCKS in state.js)
  const gardeningLevel = campaign.skills?.gardening?.level ?? 1;
  const availableSizes = getAvailableGridSizes(nextChapter, gardeningLevel);
  const bestSize = availableSizes[availableSizes.length - 1] ?? { cols: 8, rows: 4 };
  const nextSeasonState = createSeasonState(nextChapter, nextSeason, campaign, bestSize.cols, bestSize.rows);

  // Bug 2: Apply soil fatigue for heavy feeders in the same cell position
  if (campaign.previousGrid) {
    for (let i = 0; i < nextSeasonState.grid.length; i++) {
      const prevCell = campaign.previousGrid[i];
      if (prevCell && prevCell.cropId && HEAVY_FEEDERS.has(prevCell.cropId)) {
        nextSeasonState.grid[i].soilFatigue = Math.min(
          (nextSeasonState.grid[i].soilFatigue || 0) + 0.3,
          0.9,
        );
      }
      applyCarryForwardInfrastructure(nextSeasonState.grid[i], prevCell);
    }
  }

  Object.assign(season, nextSeasonState);

  // Resize soilHealth array if grid expanded
  const newCellCount = bestSize.cols * bestSize.rows;
  if (Array.isArray(campaign.soilHealth) && campaign.soilHealth.length < newCellCount) {
    while (campaign.soilHealth.length < newCellCount) {
      campaign.soilHealth.push(1.0);
    }
  }

  saveCampaign(campaign);
  return { complete: false, chapterChanged: true };
}

export function canAdvance(season) {
  const { phase } = season;
  if (phase === PHASES.PLANNING) {
    if (season.campaign?.sandbox) return true;
    const planted = season.grid.filter((cell) => cell.cropId !== null).length;
    return planted >= 8;
  }
  if (BEAT_PHASES.includes(phase)) {
    return season.interventionChosen !== null || season.eventActive === null;
  }
  if (phase === PHASES.HARVEST) return season.harvestResult !== null;
  if (phase === PHASES.TRANSITION) return true;
  return false;
}

export function advance(state) {
  const season = state.season;
  const result = createAdvanceResult();
  if (!canAdvance(season)) return result;

  const previousPhase = season.phase;
  const nextPhase = TRANSITIONS[previousPhase];
  if (!nextPhase) return result;

  result.advanced = true;

  if (nextPhase === PHASES.EARLY_SEASON) {
    season.phase = nextPhase;
    season.interventionTokens = 3;
    assignBeatState(season, 0);
    result.seasonChanged = true;
    result.trigger = createEventTrigger(season);
    return result;
  }

  if (nextPhase === PHASES.MID_SEASON) {
    season.phase = nextPhase;
    assignBeatState(season, 1);
    result.seasonChanged = true;
    result.trigger = createEventTrigger(season);
    return result;
  }

  if (nextPhase === PHASES.LATE_SEASON) {
    season.phase = nextPhase;
    assignBeatState(season, 2);
    result.seasonChanged = true;
    result.trigger = createEventTrigger(season);
    return result;
  }

  if (nextPhase === PHASES.HARVEST) {
    season.phase = nextPhase;
    season.eventActive = null;
    season.interventionChosen = null;
    result.scoreResult = finalizeHarvest(season);
    result.trigger = {
      type: 'harvest_complete',
      score: result.scoreResult.score,
      grade: result.scoreResult.grade,
      yieldCount: result.scoreResult.yieldList?.length ?? 0,
      yieldList: result.scoreResult.yieldList ?? [],
      recipeMatches: result.scoreResult.recipeMatches ?? [],
      season: season.season,
      chapter: season.chapter,
    };
    return result;
  }

  if (nextPhase === PHASES.TRANSITION) {
    result.journalEntryAdded = recordSeasonJournal(season);
    season.phase = nextPhase;
    result.trigger = {
      type: 'chapter_complete',
      chapter: season.chapter,
      season: season.season,
    };
    return result;
  }

  if (previousPhase === PHASES.TRANSITION && nextPhase === PHASES.PLANNING) {
    const rollover = rollCampaignForward(season);
    result.chapterChanged = rollover.chapterChanged;
    result.campaignComplete = rollover.complete;
    if (rollover.complete) {
      result.trigger = { type: 'campaign_complete' };
    } else {
      result.trigger = {
        type: 'chapter_start',
        chapter: season.chapter,
        season: season.season,
      };
    }
    return result;
  }

  season.phase = nextPhase;
  return result;
}

export function getPhaseLabel(phase) {
  const labels = {
    [PHASES.PLANNING]: 'Planning',
    [PHASES.EARLY_SEASON]: 'Early Season',
    [PHASES.MID_SEASON]: 'Mid Season',
    [PHASES.LATE_SEASON]: 'Late Season',
    [PHASES.HARVEST]: 'Harvest',
    [PHASES.TRANSITION]: 'Season Complete',
  };
  return labels[phase] ?? phase;
}

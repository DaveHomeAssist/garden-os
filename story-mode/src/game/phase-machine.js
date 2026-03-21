/**
 * Phase Machine — implements SEASON_ENGINE_SPEC.md state transitions.
 * No backward transitions after COMMIT.
 */
import { PHASES, BEAT_PHASES, SEASONS, createSeasonState } from './state.js';
import { getCropsForChapter } from '../data/crops.js';
import { drawEvent } from '../data/events.js';
import { scoreBed } from '../scoring/bed-score.js';
import { pushJournalEntry, saveCampaign } from './save.js';

const TRANSITIONS = {
  [PHASES.PLANNING]: PHASES.COMMIT,
  [PHASES.COMMIT]: PHASES.EARLY_SEASON,
  [PHASES.EARLY_SEASON]: PHASES.MID_SEASON,
  [PHASES.MID_SEASON]: PHASES.LATE_SEASON,
  [PHASES.LATE_SEASON]: PHASES.HARVEST,
  [PHASES.HARVEST]: PHASES.REVIEW,
  [PHASES.REVIEW]: PHASES.TRANSITION,
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

function assignBeatState(season, beatIndex) {
  season.beatIndex = beatIndex;
  season.interventionChosen = null;
  season.eventActive = drawEvent(season.season, season.chapter, season.eventsDrawn);

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

const HEAVY_FEEDERS = new Set([
  'cherry_tom', 'compact_tomato', 'pepper', 'zucchini', 'broccoli',
  'kale', 'lettuce', 'arugula', 'spinach', 'chard', 'basil',
]);

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
  campaign.previousGrid = season.grid.map((cell) => ({ ...cell }));

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

  const nextSeasonState = createSeasonState(nextChapter, nextSeason, campaign);

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
    }
  }

  Object.assign(season, nextSeasonState);

  saveCampaign(campaign);
  return { complete: false, chapterChanged: true };
}

export function canAdvance(season) {
  const { phase } = season;
  if (phase === PHASES.PLANNING) {
    const planted = season.grid.filter((cell) => cell.cropId !== null).length;
    return planted >= 8;
  }
  if (phase === PHASES.COMMIT) return true;
  if (BEAT_PHASES.includes(phase)) {
    return season.interventionChosen !== null || season.eventActive === null;
  }
  if (phase === PHASES.HARVEST) return season.harvestResult !== null;
  if (phase === PHASES.REVIEW) return true;
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
    if (season.eventActive) {
      result.trigger = {
        type: 'event_drawn',
        eventId: season.eventActive.id,
        eventTitle: season.eventActive.title,
        season: season.season,
        chapter: season.chapter,
      };
    }
    return result;
  }

  if (nextPhase === PHASES.MID_SEASON) {
    season.phase = nextPhase;
    assignBeatState(season, 1);
    result.seasonChanged = true;
    if (season.eventActive) {
      result.trigger = {
        type: 'event_drawn',
        eventId: season.eventActive.id,
        eventTitle: season.eventActive.title,
        season: season.season,
        chapter: season.chapter,
      };
    }
    return result;
  }

  if (nextPhase === PHASES.LATE_SEASON) {
    season.phase = nextPhase;
    assignBeatState(season, 2);
    result.seasonChanged = true;
    if (season.eventActive) {
      result.trigger = {
        type: 'event_drawn',
        eventId: season.eventActive.id,
        eventTitle: season.eventActive.title,
        season: season.season,
        chapter: season.chapter,
      };
    }
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
      season: season.season,
      chapter: season.chapter,
    };
    return result;
  }

  if (nextPhase === PHASES.REVIEW) {
    result.journalEntryAdded = recordSeasonJournal(season);
    season.phase = nextPhase;
    return result;
  }

  if (nextPhase === PHASES.TRANSITION) {
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

export function cancelCommit(season) {
  if (season.phase === PHASES.COMMIT) {
    season.phase = PHASES.PLANNING;
    return true;
  }
  return false;
}

export function getPhaseLabel(phase) {
  const labels = {
    [PHASES.PLANNING]: 'Planning',
    [PHASES.COMMIT]: 'Confirm Plan',
    [PHASES.EARLY_SEASON]: 'Early Season',
    [PHASES.MID_SEASON]: 'Mid Season',
    [PHASES.LATE_SEASON]: 'Late Season',
    [PHASES.HARVEST]: 'Harvest',
    [PHASES.REVIEW]: 'Season Review',
    [PHASES.TRANSITION]: 'Next Season',
  };
  return labels[phase] ?? phase;
}

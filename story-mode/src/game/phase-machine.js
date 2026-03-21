/**
 * Phase Machine — implements SEASON_ENGINE_SPEC.md state transitions.
 * No backward transitions after COMMIT.
 */
import { PHASES, BEAT_PHASES } from './state.js';

const TRANSITIONS = {
  [PHASES.PLANNING]:      PHASES.COMMIT,
  [PHASES.COMMIT]:        PHASES.EARLY_SEASON,
  [PHASES.EARLY_SEASON]:  PHASES.MID_SEASON,
  [PHASES.MID_SEASON]:    PHASES.LATE_SEASON,
  [PHASES.LATE_SEASON]:   PHASES.HARVEST,
  [PHASES.HARVEST]:       PHASES.REVIEW,
  [PHASES.REVIEW]:        PHASES.TRANSITION,
  [PHASES.TRANSITION]:    PHASES.PLANNING,
};

export function canAdvance(season) {
  const { phase } = season;
  if (phase === PHASES.PLANNING) {
    const planted = season.grid.filter(c => c.cropId !== null).length;
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

export function advance(season) {
  if (!canAdvance(season)) return false;

  const nextPhase = TRANSITIONS[season.phase];
  if (!nextPhase) return false;

  season.phase = nextPhase;

  if (nextPhase === PHASES.EARLY_SEASON) {
    season.beatIndex = 0;
    season.interventionTokens = 3;
  } else if (nextPhase === PHASES.MID_SEASON) {
    season.beatIndex = 1;
    season.interventionChosen = null;
    season.eventActive = null;
  } else if (nextPhase === PHASES.LATE_SEASON) {
    season.beatIndex = 2;
    season.interventionChosen = null;
    season.eventActive = null;
  }

  return true;
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

export const FACTION_BADGE_COLORS = {
  climbers: '#2d8a4e',
  fast_cycles: '#6dbf6d',
  greens: '#3a7a4f',
  roots: '#c47a3a',
  herbs: '#7ab85e',
  fruiting: '#d44a2a',
  brassicas: '#4a8a6a',
  companions: '#e8c84a',
};

export const FACTION_NAMES = {
  climbers: 'Climber',
  fast_cycles: 'Fast',
  greens: 'Greens',
  roots: 'Root',
  herbs: 'Herb',
  fruiting: 'Fruit',
  brassicas: 'Brassica',
  companions: 'Companion',
};

export const INTERVENTION_LABELS = {
  protect: 'Protect',
  mulch: 'Mulch',
  swap: 'Swap',
  companion_patch: 'Companion Patch',
  prune: 'Prune',
  accept_loss: 'Accept Loss',
};

export const INTERVENTION_PROMPTS = {
  protect: 'Choose a planted cell to shield from this event.',
  mulch: 'Choose a planted cell to mulch for this season and next-season carry-forward.',
  companion_patch: 'Choose a planted cell to patch with an adjacency bonus.',
  prune: 'Choose a planted cell to remove from the bed.',
  swap: 'Choose the first planted cell to swap.',
};

export const SEASON_ICONS = { spring: '🌱', summer: '☀️', fall: '🍂', winter: '❄️' };
export const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };

export const DEFAULT_TOOLS = [
  { id: 'hand', label: 'Hand', icon: '✋', shortcut: '1' },
  { id: 'water', label: 'Water', icon: '💧', shortcut: '2' },
  { id: 'plant', label: 'Plant', icon: '🌱', shortcut: '3' },
  { id: 'harvest', label: 'Harvest', icon: '🌾', shortcut: '4' },
  { id: 'protect', label: 'Protect', icon: '🛡️', shortcut: '5' },
  { id: 'mulch', label: 'Mulch', icon: '🍂', shortcut: '6' },
];

export function hasKeepsake(campaign, keepsakeId) {
  return Array.isArray(campaign.keepsakes) && campaign.keepsakes.some((entry) => entry.id === keepsakeId);
}

export function getRowAverages(cellScores, rowCount = 4, colCount = 8) {
  const rowSums = new Array(rowCount).fill(0);
  const rowCounts = new Array(rowCount).fill(0);
  cellScores.forEach((score, index) => {
    const row = Math.floor(index / colCount);
    if (row < rowCount) {
      rowSums[row] += score;
      rowCounts[row] += 1;
    }
  });
  return rowSums.map((sum, index) => (rowCounts[index] > 0 ? sum / rowCounts[index] : 0));
}

export function getYearForChapter(chapter) {
  return Math.ceil(chapter / 4);
}

export function isLetItGrowInteractionMode(state) {
  const isLIG = state.campaign?.gameMode === 'sandbox' || state.campaign?.sandbox;
  const isExplorePhase = ['PLANNING', 'COMMIT', 'TRANSITION'].includes(state.season?.phase);
  return isLIG || isExplorePhase;
}

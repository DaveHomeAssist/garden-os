/**
 * Season Calendar — compact field-kit status card for year, season, and beat.
 */
import { getChapterTitle } from './chapter-text.js';

const CAMPAIGN_YEARS = 3;

const SEASON_MONTHS = {
  spring: { early: 'March', mid: 'April', late: 'May' },
  summer: { early: 'June', mid: 'July', late: 'August' },
  fall: { early: 'September', mid: 'October', late: 'November' },
  winter: { early: 'December', mid: 'January', late: 'February' },
};

const SEASON_EMOJI = {
  spring: '🌱',
  summer: '☀️',
  fall: '🍂',
  winter: '❄️',
};

const BEAT_NAMES = ['early', 'mid', 'late'];

function createElement(tagName, { id, className, text, ariaHidden } = {}) {
  const element = document.createElement(tagName);
  if (id) element.id = id;
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  if (ariaHidden) element.setAttribute('aria-hidden', 'true');
  return element;
}

export function createSeasonCalendar() {
  const card = createElement('section', { id: 'season-calendar', className: 'season-card' });
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  card.setAttribute('aria-atomic', 'true');
  card.dataset.uiRole = 'season-status';

  const row = createElement('div', { id: 'cal-season-row', className: 'season-card__row' });
  const emoji = createElement('span', {
    id: 'cal-emoji',
    className: 'season-card__emoji',
    text: '🌱',
    ariaHidden: true,
  });
  const copy = createElement('div', { className: 'season-card__copy' });
  copy.append(
    createElement('div', { id: 'cal-month', className: 'season-card__month', text: 'March' }),
    createElement('div', { id: 'cal-chapter-title', className: 'season-card__chapter' }),
    createElement('div', { id: 'cal-year', className: 'season-card__year', text: 'Year 1 of 3' }),
  );
  row.append(emoji, copy);

  const beats = createElement('div', { id: 'cal-beats', className: 'season-card__beats', ariaHidden: true });
  for (const beatName of BEAT_NAMES) {
    const beat = createElement('span', { className: 'cal-beat season-card__beat' });
    beat.dataset.beat = beatName;
    beat.dataset.state = 'upcoming';
    beats.append(beat);
  }

  const beatLabel = createElement('div', {
    id: 'cal-beat-label',
    className: 'season-card__beat-label',
    text: 'Planning Phase',
  });

  card.append(row, beats, beatLabel);
  return card;
}

export function updateSeasonCalendar(state) {
  const card = document.getElementById('season-calendar');
  if (!card) return;

  const chapter = state.campaign.currentChapter;
  const season = state.season.season;
  const phase = state.season.phase;
  const year = Math.min(CAMPAIGN_YEARS, Math.max(1, Math.ceil(chapter / 4)));

  let beatIndex = 0;
  if (phase === 'MID_SEASON') beatIndex = 1;
  else if (['LATE_SEASON', 'HARVEST', 'TRANSITION'].includes(phase)) beatIndex = 2;

  const beatName = BEAT_NAMES[beatIndex] ?? 'early';
  const months = SEASON_MONTHS[season] ?? SEASON_MONTHS.spring;
  const month = months[beatName] ?? months.early;
  const emoji = SEASON_EMOJI[season] ?? SEASON_EMOJI.spring;
  const chapterTitle = getChapterTitle(chapter);

  document.getElementById('cal-emoji').textContent = emoji;
  document.getElementById('cal-month').textContent = month;
  document.getElementById('cal-year').textContent = `Year ${year} of ${CAMPAIGN_YEARS}`;
  document.getElementById('cal-chapter-title').textContent = chapterTitle;

  const seasonIsActive = ['EARLY_SEASON', 'MID_SEASON', 'LATE_SEASON'].includes(phase);
  const seasonIsComplete = ['HARVEST', 'TRANSITION'].includes(phase);
  card.querySelectorAll('.cal-beat').forEach((beat, index) => {
    let beatState = 'upcoming';
    if (seasonIsComplete || (seasonIsActive && index < beatIndex)) beatState = 'complete';
    else if (seasonIsActive && index === beatIndex) beatState = 'current';
    beat.dataset.state = beatState;
  });

  const label = document.getElementById('cal-beat-label');
  if (phase === 'PLANNING') label.textContent = 'Planning Phase';
  else if (phase === 'HARVEST') label.textContent = 'Harvest Time';
  else if (phase === 'TRANSITION') label.textContent = 'Season Complete';
  else label.textContent = `${beatName} ${season}`;

  card.setAttribute(
    'aria-label',
    [month, chapterTitle, `Year ${year} of ${CAMPAIGN_YEARS}`, label.textContent]
      .filter(Boolean)
      .join('. '),
  );
}

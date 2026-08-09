/**
 * Season Calendar — compact HUD widget showing year, season, and beat progress.
 */
import { getChapterTitle } from './chapter-text.js';

const SEASON_MONTHS = {
  spring: { early: 'March', mid: 'April', late: 'May' },
  summer: { early: 'June', mid: 'July', late: 'August' },
  fall:   { early: 'September', mid: 'October', late: 'November' },
  winter: { early: 'December', mid: 'January', late: 'February' },
};

const SEASON_EMOJI = {
  spring: '🌱',
  summer: '☀️',
  fall: '🍂',
  winter: '❄️',
};

const BEAT_NAMES = ['early', 'mid', 'late'];

const CAMPAIGN_YEARS = 3;

export function createSeasonCalendar() {
  const el = document.createElement('div');
  el.id = 'season-calendar';
  el.className = 'field-card';

  el.innerHTML = `
    <div id="cal-season-row" class="field-card__row">
      <span id="cal-emoji" class="field-card__emoji">🌱</span>
      <div>
        <div id="cal-month" class="field-card__month">March</div>
        <div id="cal-chapter-title" class="field-card__chapter"></div>
        <div id="cal-year" class="field-card__year">Year 1 of 3</div>
      </div>
    </div>
    <div class="field-card__beats" id="cal-beats">
      <div class="cal-beat field-card__beat is-filled"></div>
      <div class="cal-beat field-card__beat"></div>
      <div class="cal-beat field-card__beat"></div>
    </div>
    <div id="cal-beat-label" class="field-card__beat-label">Early Season</div>
  `;

  return el;
}

export function updateSeasonCalendar(state) {
  const el = document.getElementById('season-calendar');
  if (!el) return;

  const chapter = state.campaign.currentChapter;
  const season = state.season.season;
  const phase = state.season.phase;
  // A campaign is three years of four chapters. Free play can run past chapter
  // 12, so clamp rather than render "Year 25 of 3".
  const year = Math.min(CAMPAIGN_YEARS, Math.max(1, Math.ceil(chapter / 4)));

  // Determine beat index from phase
  let beatIdx = 0;
  if (phase === 'MID_SEASON') beatIdx = 1;
  else if (phase === 'LATE_SEASON') beatIdx = 2;
  else if (phase === 'HARVEST' || phase === 'TRANSITION') beatIdx = 2;

  const beatName = BEAT_NAMES[beatIdx] || 'early';
  const months = SEASON_MONTHS[season] || SEASON_MONTHS.spring;
  const month = months[beatName] || months.early;
  const emoji = SEASON_EMOJI[season] || '🌱';

  document.getElementById('cal-emoji').textContent = emoji;
  document.getElementById('cal-month').textContent = month;
  document.getElementById('cal-year').textContent = `Year ${year} of ${CAMPAIGN_YEARS}`;

  const chapterTitleEl = document.getElementById('cal-chapter-title');
  if (chapterTitleEl) {
    chapterTitleEl.textContent = getChapterTitle(chapter);
  }

  // Beat progress bars — fill state is styled by .field-card__beat.is-filled
  const beatPhase = ['EARLY_SEASON','MID_SEASON','LATE_SEASON','HARVEST','TRANSITION'].includes(phase);
  const beats = el.querySelectorAll('.cal-beat');
  beats.forEach((b, i) => {
    b.classList.toggle('is-filled', beatPhase && i <= beatIdx);
  });

  // Beat label
  const labelEl = document.getElementById('cal-beat-label');
  if (phase === 'PLANNING') {
    labelEl.textContent = 'Planning Phase';
  } else if (phase === 'HARVEST') {
    labelEl.textContent = 'Harvest Time';
  } else if (phase === 'TRANSITION') {
    labelEl.textContent = 'Season Complete';
  } else {
    labelEl.textContent = `${beatName} ${season}`;
  }
}

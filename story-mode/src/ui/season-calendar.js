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

export function createSeasonCalendar() {
  const el = document.createElement('div');
  el.id = 'season-calendar';
  el.style.cssText = `
    position:absolute;
    top:64px;
    left:16px;
    z-index:10;
    background:rgba(30,17,10,0.72);
    backdrop-filter:blur(14px);
    border:1px solid rgba(232,200,74,0.14);
    border-radius:14px;
    box-shadow:0 12px 28px rgba(0,0,0,0.22);
    padding:10px 12px;
    min-width:128px;
    max-width:168px;
    pointer-events:none;
    font-family:'DM Sans',sans-serif;
  `;

  el.innerHTML = `
    <div id="cal-season-row" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;">
      <span id="cal-emoji" style="font-size:16px;line-height:1;">🌱</span>
      <div style="min-width:0;">
        <div id="cal-month" style="font-family:'Fraunces',serif;font-weight:600;font-size:14px;color:#f7f2ea;line-height:1.15;">March</div>
        <div id="cal-chapter-title" style="font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(247,242,234,0.62);line-height:1.2;margin-top:2px;"></div>
        <div id="cal-year" style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.34);letter-spacing:0.08em;margin-top:4px;">Year 1 of 3</div>
      </div>
    </div>
    <div style="display:flex;gap:5px;align-items:center;" id="cal-beats">
      <div class="cal-beat" style="width:28px;height:4px;border-radius:999px;background:rgba(232,200,74,0.5);"></div>
      <div class="cal-beat" style="width:28px;height:4px;border-radius:999px;background:rgba(247,242,234,0.08);"></div>
      <div class="cal-beat" style="width:28px;height:4px;border-radius:999px;background:rgba(247,242,234,0.08);"></div>
    </div>
    <div id="cal-beat-label" style="font-family:'DM Mono',monospace;font-size:8px;color:rgba(247,242,234,0.28);letter-spacing:0.08em;margin-top:5px;text-transform:uppercase;">Early Season</div>
  `;

  return el;
}

export function updateSeasonCalendar(state) {
  const el = document.getElementById('season-calendar');
  if (!el) return;

  const chapter = state.campaign.currentChapter;
  const season = state.season.season;
  const phase = state.season.phase;
  const year = Math.ceil(chapter / 4);

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
  document.getElementById('cal-year').textContent = `Year ${year} of 3`;

  const chapterTitleEl = document.getElementById('cal-chapter-title');
  if (chapterTitleEl) {
    chapterTitleEl.textContent = getChapterTitle(chapter);
  }

  // Beat progress bars
  const beats = el.querySelectorAll('.cal-beat');
  beats.forEach((b, i) => {
    if (i <= beatIdx && ['EARLY_SEASON','MID_SEASON','LATE_SEASON','HARVEST','TRANSITION'].includes(phase)) {
      b.style.background = 'rgba(232,200,74,0.5)';
    } else if (phase === 'PLANNING') {
      b.style.background = 'rgba(247,242,234,0.08)';
    } else {
      b.style.background = 'rgba(247,242,234,0.08)';
    }
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

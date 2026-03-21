/**
 * Season Calendar — compact HUD widget showing year, season, and beat progress.
 */

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
    top:60px;
    left:16px;
    z-index:10;
    background:rgba(30,17,10,0.82);
    backdrop-filter:blur(12px);
    border:1px solid rgba(232,200,74,0.12);
    border-radius:12px;
    padding:12px 14px;
    min-width:140px;
    pointer-events:none;
    font-family:'DM Sans',sans-serif;
  `;

  el.innerHTML = `
    <div id="cal-season-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <span id="cal-emoji" style="font-size:18px;">🌱</span>
      <div>
        <div id="cal-month" style="font-family:'Fraunces',serif;font-weight:600;font-size:15px;color:#f7f2ea;line-height:1.2;">March</div>
        <div id="cal-year" style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(247,242,234,0.35);letter-spacing:0.08em;">Year 1</div>
      </div>
    </div>
    <div style="display:flex;gap:4px;align-items:center;" id="cal-beats">
      <div class="cal-beat" style="width:32px;height:4px;border-radius:2px;background:rgba(232,200,74,0.5);"></div>
      <div class="cal-beat" style="width:32px;height:4px;border-radius:2px;background:rgba(247,242,234,0.08);"></div>
      <div class="cal-beat" style="width:32px;height:4px;border-radius:2px;background:rgba(247,242,234,0.08);"></div>
    </div>
    <div id="cal-beat-label" style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.25);letter-spacing:0.08em;margin-top:4px;text-transform:uppercase;">Early Season</div>
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
  else if (phase === 'HARVEST' || phase === 'REVIEW' || phase === 'TRANSITION') beatIdx = 2;

  const beatName = BEAT_NAMES[beatIdx] || 'early';
  const months = SEASON_MONTHS[season] || SEASON_MONTHS.spring;
  const month = months[beatName] || months.early;
  const emoji = SEASON_EMOJI[season] || '🌱';

  document.getElementById('cal-emoji').textContent = emoji;
  document.getElementById('cal-month').textContent = month;
  document.getElementById('cal-year').textContent = `Year ${year}`;

  // Beat progress bars
  const beats = el.querySelectorAll('.cal-beat');
  beats.forEach((b, i) => {
    if (i <= beatIdx && ['EARLY_SEASON','MID_SEASON','LATE_SEASON','HARVEST','REVIEW','TRANSITION'].includes(phase)) {
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
  } else if (phase === 'REVIEW') {
    labelEl.textContent = 'Season Review';
  } else {
    labelEl.textContent = `${beatName} ${season}`;
  }
}

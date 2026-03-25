import { explainFactor } from '../scoring/score-explain.js';

function cellLabel(index) {
  const row = Math.floor(index / 8) + 1;
  const col = (index % 8) + 1;
  return `R${row} · C${col}`;
}

function seasonLabel(season) {
  return season ? season.charAt(0).toUpperCase() + season.slice(1) : 'Season';
}

function gradeColor(grade) {
  if (grade === 'A+' || grade === 'A') return '#8fd39b';
  if (grade === 'B') return '#e8c84a';
  if (grade === 'C') return '#d8aa68';
  return '#d67d64';
}

function renderSoilCells(cells) {
  return cells.map((cell) => {
    const fatigue = Math.round((cell.soilFatigue ?? 0) * 100);
    const carry = cell.carryForward?.label ?? '';
    const emphasis = fatigue >= 60 ? '#d67d64' : fatigue >= 30 ? '#d8aa68' : '#8fd39b';
    return `
      <div style="padding:8px;border-radius:10px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);min-height:74px;">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(247,242,234,0.55);">${cellLabel(cell.index)}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:${emphasis};">FT ${fatigue}%</span>
        </div>
        <div style="font-size:11px;color:rgba(247,242,234,0.72);line-height:1.35;">${carry || 'No carry-forward effect'}</div>
      </div>
    `;
  }).join('');
}

function renderReviewCells(cells, titleColor) {
  if (!cells.length) {
    return `<div style="font-size:12px;color:rgba(247,242,234,0.5);">No planted cells recorded.</div>`;
  }
  return cells.map((cell) => {
    // Find the weakest factor for this cell to show a targeted tip
    let worstFactor = null;
    let worstVal = Infinity;
    if (cell.factors) {
      for (const [key, val] of Object.entries(cell.factors)) {
        const threshold = key === 'adjacency' ? 0 : 2.5;
        if (val < threshold && val < worstVal) {
          worstVal = val;
          worstFactor = key;
        }
      }
    }
    const tip = worstFactor ? explainFactor(worstFactor, worstVal) : null;
    return `
    <div style="padding:10px 12px;border-radius:10px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
        <div>
          <div style="font-family:'Fraunces',serif;font-size:15px;color:#f7f2ea;">${cell.cropName}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(247,242,234,0.5);">${cellLabel(cell.cellIndex)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Fraunces',serif;font-size:18px;color:${titleColor};">${cell.total.toFixed(1)}</div>
          <div style="font-size:10px;color:rgba(247,242,234,0.45);">soil ${Math.round((cell.soilFatigue ?? 0) * 100)}%</div>
        </div>
      </div>
      ${tip?.tip ? `<div style="font-size:10px;color:rgba(247,242,234,0.5);margin-top:6px;line-height:1.4;">💡 ${tip.tip}</div>` : ''}
    </div>
  `;
  }).join('');
}

export function showWinterReview(container, data, handlers = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'harvest-reveal';
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;
    background:rgba(20,17,24,0.92);z-index:32;
    padding:18px;padding-top:max(18px, env(safe-area-inset-top, 0px));
    padding-bottom:max(18px, env(safe-area-inset-bottom, 0px));
    overflow:hidden;
    animation:fadeInIntro 0.35s ease-out both;
  `;

  overlay.innerHTML = `
    <div style="width:min(1040px,100%);max-height:calc(100vh - 36px);display:flex;flex-direction:column;gap:14px;border-radius:18px;background:rgba(24,21,29,0.9);border:1px solid rgba(247,242,234,0.08);box-shadow:0 28px 90px rgba(0,0,0,0.42);backdrop-filter:blur(10px);overflow:hidden;">
      <div style="text-align:center;padding:18px 20px 0;flex:0 0 auto;">
        <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(247,242,234,0.4);margin-bottom:6px;">Winter Review</div>
        <h2 style="margin:0;font-family:'Fraunces',serif;font-size:34px;color:#f7f2ea;">Year ${data.year} in the bed</h2>
        <p style="margin:10px auto 0;max-width:640px;font-size:15px;line-height:1.6;color:rgba(247,242,234,0.72);">
          Review the last year, inspect tired soil, read carry-forward effects, and leave winter with a plan.
        </p>
      </div>

      <div style="padding:0 20px 10px;display:grid;gap:16px;overflow-y:auto;min-height:0;flex:1 1 auto;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
        ${data.yearEntries.map((entry) => `
          <div style="padding:14px;border-radius:12px;background:rgba(247,242,234,0.05);border:1px solid rgba(247,242,234,0.08);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,242,234,0.45);">${seasonLabel(entry.season)}</span>
              <span style="font-family:'Fraunces',serif;font-size:20px;color:${gradeColor(entry.grade)};">${entry.grade}</span>
            </div>
            <div style="font-family:'Fraunces',serif;font-size:26px;color:#f7f2ea;">${entry.score}</div>
            <div style="font-size:12px;color:rgba(247,242,234,0.56);margin-top:4px;">${entry.eventsEncountered.length} events · ${entry.cropsPlanted.length} crops</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:16px;">
        <section style="padding:16px;border-radius:14px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.38);margin-bottom:10px;">Soil + Carry Forward</div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;">
            ${renderSoilCells(data.soilCells)}
          </div>
        </section>

        <section style="padding:16px;border-radius:14px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);display:grid;gap:14px;">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.38);margin-bottom:8px;">Last Harvest</div>
            <div style="display:flex;gap:16px;align-items:baseline;">
              <div style="font-family:'Fraunces',serif;font-size:34px;color:#f7f2ea;">${data.lastReview.score ?? '--'}</div>
              <div style="font-family:'Fraunces',serif;font-size:24px;color:${gradeColor(data.lastReview.grade)};">${data.lastReview.grade ?? '–'}</div>
            </div>
            <div style="font-size:12px;color:rgba(247,242,234,0.56);margin-top:4px;">${data.lastReview.eventsEncountered.length} events · ${data.lastReview.yieldList.length} harvested crops</div>
          </div>

          <div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.38);margin-bottom:8px;">Recipes + Keepsakes</div>
            <div style="font-size:14px;color:#f7f2ea;line-height:1.55;">
              ${data.recipesCompleted} / ${data.totalRecipes} recipes complete<br />
              ${data.keepsakesUnlocked} / ${data.totalKeepsakes} keepsakes found
            </div>
          </div>

          <div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.38);margin-bottom:8px;">Season Events</div>
            <div style="display:grid;gap:6px;">
              ${data.lastReview.eventsEncountered.length
                ? data.lastReview.eventsEncountered.map((eventTitle) => `<div style="font-size:12px;color:rgba(247,242,234,0.7);">${eventTitle}</div>`).join('')
                : '<div style="font-size:12px;color:rgba(247,242,234,0.5);">Quiet season. No events recorded.</div>'}
            </div>
          </div>
        </section>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <section style="padding:16px;border-radius:14px;background:rgba(90,171,107,0.08);border:1px solid rgba(90,171,107,0.18);">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(143,211,155,0.78);margin-bottom:8px;">Strongest Cells</div>
          <div style="display:grid;gap:8px;">${renderReviewCells(data.lastReview.bestCells, '#8fd39b')}</div>
        </section>
        <section style="padding:16px;border-radius:14px;background:rgba(214,125,100,0.08);border:1px solid rgba(214,125,100,0.18);">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(214,125,100,0.8);margin-bottom:8px;">Weakest Cells</div>
          <div style="display:grid;gap:8px;">${renderReviewCells(data.lastReview.worstCells, '#d67d64')}</div>
        </section>
      </div>

      <section style="padding:16px;border-radius:14px;background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.38);margin-bottom:10px;">Next Spring Hints</div>
        <div style="display:grid;gap:8px;">
          ${data.hints.map((hint) => `<div style="font-size:14px;line-height:1.55;color:rgba(247,242,234,0.8);">${hint}</div>`).join('')}
        </div>
      </section>

      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 20px 18px;border-top:1px solid rgba(247,242,234,0.08);background:linear-gradient(180deg, rgba(24,21,29,0.15) 0%, rgba(24,21,29,0.95) 28%);flex:0 0 auto;">
        <div style="font-size:12px;line-height:1.5;color:rgba(247,242,234,0.56);max-width:520px;">
          Winter is review-only. When you continue, the game rolls straight into the next chapter with this soil and carry-forward state in mind.
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
        ${handlers.onViewBackpack ? `
          <button type="button" id="winter-review-backpack" style="padding:12px 18px;border-radius:10px;border:1px solid rgba(247,242,234,0.18);background:rgba(247,242,234,0.08);color:#f7f2ea;font-size:14px;cursor:pointer;">
            Open Backpack
          </button>
        ` : ''}
        <button type="button" id="winter-review-continue" style="padding:12px 20px;border-radius:10px;border:none;background:#e8c84a;color:#1e110a;font-size:14px;font-weight:600;cursor:pointer;">
          Continue
        </button>
        </div>
      </div>
    </div>
  `;

  overlay.querySelector('#winter-review-backpack')?.addEventListener('click', () => {
    handlers.onViewBackpack?.();
  });

  overlay.querySelector('#winter-review-continue')?.addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.25s ease-in both';
    setTimeout(() => {
      overlay.remove();
      handlers.onContinue?.();
    }, 220);
  });

  container.appendChild(overlay);
}

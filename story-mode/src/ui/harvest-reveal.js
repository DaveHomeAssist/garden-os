/**
 * Harvest Reveal — animated score breakdown overlay.
 * Shows final score, grade, and per-factor breakdown.
 */

const FACTOR_LABELS = {
  sunFit: { label: 'Sun Fit', emoji: '☀️', weight: '2x' },
  supportFit: { label: 'Support', emoji: '🪴', weight: '1x' },
  shadeFit: { label: 'Shade', emoji: '🌤️', weight: '1x' },
  accessFit: { label: 'Access', emoji: '🚶', weight: '1x' },
  seasonFit: { label: 'Season', emoji: '📅', weight: '1x' },
  adjacency: { label: 'Adjacency', emoji: '🤝', weight: '±' },
};

const GRADE_COLORS = {
  'A+': '#e8c84a',
  'A': '#5aab6b',
  'B': '#4a9aba',
  'C': '#dda855',
  'D': '#d48a4a',
  'F': '#d44a2a',
};

export function showHarvestReveal(container, result, onDismiss) {
  const overlay = document.createElement('div');
  overlay.className = 'harvest-reveal';
  overlay.style.cssText = `
    position:absolute;inset:0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:rgba(30,17,10,0.94);
    z-index:30;padding:24px;
    animation:fadeInIntro 0.5s ease-out both;
    overflow-y:auto;
  `;

  const gradeColor = GRADE_COLORS[result.grade] || '#f7f2ea';

  // Compute average factors across all scored cells
  const factorAvgs = {};
  let scoredCount = 0;
  for (const cell of result.cellScores) {
    if (!cell) continue;
    scoredCount++;
    for (const [key, val] of Object.entries(cell.factors)) {
      factorAvgs[key] = (factorAvgs[key] || 0) + val;
    }
  }
  for (const key of Object.keys(factorAvgs)) {
    factorAvgs[key] = scoredCount > 0 ? factorAvgs[key] / scoredCount : 0;
  }

  overlay.innerHTML = `
    <div style="text-align:center;max-width:420px;width:100%;">
      <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(247,242,234,0.35);margin-bottom:8px;">Harvest Complete</div>

      <div class="harvest-score-ring" style="
        width:120px;height:120px;border-radius:50%;
        border:4px solid ${gradeColor};
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        margin:0 auto 8px;
        box-shadow:0 0 30px ${gradeColor}33;
      ">
        <div style="font-family:'Fraunces',serif;font-weight:700;font-size:36px;color:${gradeColor};line-height:1;" id="score-counter">0</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:rgba(247,242,234,0.4);">/ 100</div>
      </div>

      <div style="
        font-family:'Fraunces',serif;font-weight:700;font-size:28px;
        color:${gradeColor};margin-bottom:20px;
      " id="grade-badge">${result.grade}</div>

      <div style="
        background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);
        border-radius:12px;padding:16px;margin-bottom:16px;text-align:left;
      ">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.3);margin-bottom:10px;">Scoring Factors</div>
        ${Object.entries(FACTOR_LABELS).map(([key, info]) => {
          const val = factorAvgs[key] || 0;
          const maxVal = key === 'adjacency' ? 2 : 5;
          const minVal = key === 'adjacency' ? -2 : 0;
          const pct = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
          const barColor = pct > 70 ? '#5aab6b' : pct > 40 ? '#e8c84a' : '#d44a2a';
          return `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:16px;width:24px;text-align:center;">${info.emoji}</span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(247,242,234,0.7);">${info.label}</span>
                  <span style="font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.4);">${val.toFixed(1)} <span style="font-size:9px;color:rgba(247,242,234,0.25);">${info.weight}</span></span>
                </div>
                <div style="height:6px;border-radius:3px;background:rgba(247,242,234,0.06);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.8s ease-out;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="
        display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;
      ">
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Planted</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${result.occupiedCount}</div>
        </div>
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Variety</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${result.details.uniqueCrops}</div>
        </div>
        <div style="background:rgba(247,242,234,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:rgba(247,242,234,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Fill</div>
          <div style="font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:#f7f2ea;">${Math.round(result.details.fillRatio * 100)}%</div>
        </div>
      </div>

      ${result.details.diversityBonus > 0 ? `
        <div style="font-size:12px;color:#5aab6b;margin-bottom:4px;">+${result.details.diversityBonus.toFixed(1)} diversity bonus</div>
      ` : ''}
      ${result.details.recipeBonus > 0 ? `
        <div style="font-size:12px;color:#e8c84a;margin-bottom:4px;">+${result.details.recipeBonus.toFixed(1)} recipe bonus</div>
      ` : ''}
      ${result.details.fillPenalty > 0 ? `
        <div style="font-size:12px;color:#d44a2a;margin-bottom:4px;">-${result.details.fillPenalty.toFixed(1)} fill penalty</div>
      ` : ''}

      <button id="harvest-continue" style="
        margin-top:20px;width:100%;max-width:280px;
        font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;
        padding:14px 28px;border-radius:8px;cursor:pointer;
        background:#e8c84a;color:#1e110a;border:none;
      ">Continue</button>
    </div>
  `;

  // Animate score counter
  const counterEl = overlay.querySelector('#score-counter');
  let count = 0;
  const target = result.score;
  const duration = 1200;
  const startTime = performance.now();

  function animateCounter(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    count = Math.round(eased * target);
    counterEl.textContent = count;
    if (progress < 1) requestAnimationFrame(animateCounter);
  }
  requestAnimationFrame(animateCounter);

  overlay.querySelector('#harvest-continue').addEventListener('click', () => {
    overlay.style.animation = 'fadeOutIntro 0.3s ease-in both';
    setTimeout(() => {
      overlay.remove();
      onDismiss?.();
    }, 300);
  });

  container.appendChild(overlay);
}

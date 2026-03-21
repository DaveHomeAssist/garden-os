/**
 * Event Card — bottom-sheet panel showing season event with intervention buttons.
 * Called when a beat phase begins and an event is active.
 */

const INTERVENTIONS = [
  { id: 'protect', label: 'Protect', emoji: '🛡️', desc: 'Shield one cell from this event' },
  { id: 'mulch', label: 'Mulch', emoji: '🍂', desc: '+0.5 score, carries forward' },
  { id: 'swap', label: 'Swap', emoji: '🔄', desc: 'Exchange two adjacent crops' },
  { id: 'companion_patch', label: 'Patch', emoji: '🌼', desc: '+1.0 adjacency bonus this beat' },
  { id: 'prune', label: 'Prune', emoji: '✂️', desc: 'Remove one crop entirely' },
  { id: 'accept_loss', label: 'Accept', emoji: '🤷', desc: 'Take the hit, save your token' },
];

export function showEventCard(container, event, tokensLeft, onChoose) {
  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open';
  sheet.id = 'event-card-panel';

  const valenceColor = event.valence === 'positive' ? '#5aab6b'
    : event.valence === 'negative' ? '#d44a2a'
    : event.valence === 'mixed' ? '#e8c84a'
    : '#8ba8b5';

  const valenceLabel = event.valence === 'positive' ? '+'
    : event.valence === 'negative' ? '−'
    : event.valence === 'mixed' ? '~'
    : '·';

  sheet.innerHTML = `
    <div class="panel-handle"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(247,242,234,0.35);margin-bottom:4px;">Season Event</div>
        <div style="font-family:'Fraunces',serif;font-weight:600;font-size:20px;color:#f7f2ea;line-height:1.3;">${escapeHtml(event.title)}</div>
      </div>
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:50%;
        background:${valenceColor}22;border:1px solid ${valenceColor}44;
        color:${valenceColor};font-weight:700;font-size:18px;
        flex-shrink:0;
      ">${valenceLabel}</span>
    </div>

    <p style="font-size:14px;line-height:1.65;color:rgba(247,242,234,0.7);margin-bottom:16px;">
      ${escapeHtml(event.description)}
    </p>

    ${event.mechanicalEffect ? `
      <div style="
        background:rgba(247,242,234,0.04);border:1px solid rgba(247,242,234,0.08);
        border-radius:8px;padding:10px 12px;margin-bottom:16px;
        font-family:'DM Mono',monospace;font-size:11px;color:rgba(247,242,234,0.5);
      ">
        <div style="margin-bottom:4px;text-transform:uppercase;letter-spacing:0.1em;font-size:9px;color:rgba(247,242,234,0.3);">Effect</div>
        ${event.mechanicalEffect.modifier > 0 ? '+' : ''}${event.mechanicalEffect.modifier} · ${event.mechanicalEffect.duration || 'this beat'}
      </div>
    ` : ''}

    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,242,234,0.35);margin-bottom:8px;">
      Response · ${tokensLeft} token${tokensLeft !== 1 ? 's' : ''} left
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" id="intervention-grid">
      ${INTERVENTIONS.map(iv => {
        const isAccept = iv.id === 'accept_loss';
        const disabled = !isAccept && tokensLeft <= 0;
        return `
          <button data-intervention="${iv.id}" ${disabled ? 'disabled' : ''} style="
            background:${disabled ? 'rgba(247,242,234,0.02)' : 'rgba(247,242,234,0.06)'};
            border:1px solid rgba(247,242,234,${disabled ? '0.05' : '0.12'});
            border-radius:8px;padding:10px 6px;cursor:${disabled ? 'default' : 'pointer'};
            color:${disabled ? 'rgba(247,242,234,0.2)' : '#f7f2ea'};
            font-family:'DM Sans',sans-serif;font-size:12px;text-align:center;
            transition:border-color 0.15s;
            opacity:${disabled ? '0.4' : '1'};
          ">
            <div style="font-size:20px;margin-bottom:4px;">${iv.emoji}</div>
            <div style="font-weight:600;margin-bottom:2px;">${iv.label}</div>
            <div style="font-size:10px;color:rgba(247,242,234,0.4);line-height:1.3;">${iv.desc}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  sheet.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-intervention]');
    if (!btn || btn.disabled) return;
    const interventionId = btn.dataset.intervention;
    sheet.classList.remove('is-open');
    setTimeout(() => {
      sheet.remove();
      onChoose(interventionId);
    }, 300);
  });

  container.innerHTML = '';
  container.appendChild(sheet);
}

export function dismissEventCard() {
  const panel = document.getElementById('event-card-panel');
  if (panel) {
    panel.classList.remove('is-open');
    setTimeout(() => panel.remove(), 300);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

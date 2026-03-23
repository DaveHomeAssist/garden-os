import { escapeHtml, showReadOnlySheet } from './read-only-sheet.js';

const GUIDE_NAV = [
  { id: 'overview', label: 'Overview', tone: 'green' },
  { id: 'loop', label: 'Story Loop', tone: 'green' },
  { id: 'scoring', label: 'Scoring', tone: 'amber' },
  { id: 'interventions', label: 'Interventions', tone: 'amber' },
  { id: 'scene', label: 'Scene Styles', tone: 'blue' },
  { id: 'tools', label: 'Tools', tone: 'amber' },
  { id: 'controls', label: 'Controls', tone: 'gray' },
];

const MODE_ROWS = [
  ['Story Mode', pill('Live', 'green'), 'Main menu -> save slot'],
  ['Planner Mode', pill('In development', 'amber'), 'Not yet a menu path'],
  ['Let It Grow', pill('Gated', 'amber'), 'Proximity mode flag'],
  ['Daily Challenge', pill('Coming soon', 'gray'), 'Locked'],
  ['Speedrun', pill('Coming soon', 'gray'), 'Locked'],
];

const SCORE_ROWS = [
  ['Fill rate', 'Strong penalty for empty cells. Empty beds fail immediately.'],
  ['Diversity: 2 crops', '+0.3 bonus'],
  ['Diversity: 3 crops', '+0.5 bonus'],
  ['Diversity: 4+ crops', '+0.7 bonus'],
  ['Completed pantry recipes', '+0.2 each, capped at +0.8 total'],
  ['Multiple tall crop types', '-0.8 penalty after the first type'],
  ['Multiple trellis/support types', '-0.6 penalty after the first type'],
];

const GRADE_ROWS = [
  { grade: 'A+', range: '90+', tone: 'green' },
  { grade: 'A', range: '85-89', tone: 'green-soft' },
  { grade: 'B', range: '70-84', tone: 'amber-deep' },
  { grade: 'C', range: '55-69', tone: 'amber' },
  { grade: 'D', range: '40-54', tone: 'red' },
  { grade: 'F', range: '<40', tone: 'red-deep' },
];

const TOOL_ROWS = [
  ['Hand', 'Any highlighted cell or crop', '—'],
  ['Plant', 'Empty cells only', '—'],
  ['Water', 'Planted cells only', '30 s'],
  ['Protect', 'Planted, unprotected cells', '60 s'],
  ['Mulch', 'Open, unmulched cells', '120 s'],
  ['Harvest', 'Late-season ready crops', '—'],
];

const KEYBOARD_ROWS = [
  [keys(['W', 'A', 'S', 'D']), 'Move player in Let It Grow / proximity mode'],
  [keys(['Arrow keys']), 'Move player in Let It Grow / proximity mode'],
  [keys(['Enter']), 'Interact with the selected cell'],
  [keys(['Space']), 'Interact with the selected cell'],
  [keys(['P']), 'Open seed palette'],
  [keys(['B']), 'Open backpack'],
  [keys(['Esc']), 'Pause or back out of the current surface'],
  [keys(['Tab']), 'Next tool'],
  [keys([']']), 'Next tool'],
  [keys(['Shift+Tab']), 'Previous tool'],
  [keys(['[']), 'Previous tool'],
  [keys(['1-6']), 'Jump directly to tool slots'],
];

const TOUCH_ROWS = [
  ['Tap', 'Interact with the selected cell'],
  ['Touch stick', 'Movement in Let It Grow / proximity mode'],
  ['Bottom tool buttons', 'Switch tools on touch devices'],
];

const GUIDE_FOOTER =
  'Current build focus: Story Mode is playable now. Planner Mode and Let It Grow are being folded into the same codebase, but they are not full menu modes yet.';

function pill(label, tone = 'gray') {
  return `<span class="gameplay-guide__pill gameplay-guide__pill--${tone}">${escapeHtml(label)}</span>`;
}

function keys(values) {
  return values
    .map((value) => `<span class="gameplay-guide__kbd">${escapeHtml(value)}</span>`)
    .join(' ');
}

function renderTable(headers, rows, modifier = '') {
  return `
    <table class="gameplay-guide__table ${modifier}">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `
            <tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>
          `)
          .join('')}
      </tbody>
    </table>
  `;
}

function renderCallout({ tone = 'green', label, body }) {
  return `
    <div class="gameplay-guide__callout gameplay-guide__callout--${tone}">
      <div class="gameplay-guide__callout-label">${escapeHtml(label)}</div>
      <div class="gameplay-guide__callout-body">${escapeHtml(body)}</div>
    </div>
  `;
}

function renderSection({ id, title, subtitle, bodyHtml, active = false }) {
  return `
    <section
      class="gameplay-guide__section${active ? ' is-active' : ''}"
      data-guide-panel="${escapeHtml(id)}"
      id="gameplay-guide-${escapeHtml(id)}"
      ${active ? '' : 'hidden'}
    >
      <div class="gameplay-guide__section-header">
        <h3 class="gameplay-guide__section-title">${escapeHtml(title)}</h3>
        <div class="gameplay-guide__section-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      ${bodyHtml}
    </section>
  `;
}

function renderOverviewSection() {
  return renderSection({
    id: 'overview',
    title: 'What this build is',
    subtitle: 'This is the current gameplay contract, not the future roadmap.',
    active: true,
    bodyHtml: `
      ${renderCallout({
        tone: 'green',
        label: 'Story Mode is live',
        body:
          'Inherit Mom’s backyard, plan one season at a time, ride out three season beats, harvest and review. Planner Mode and Let It Grow are being built on top of these systems.',
      })}
      ${renderTable(
        ['Mode', 'Status', 'Entry'],
        MODE_ROWS.map((row) => row.map((cell, index) => (index === 0 || index === 2 ? escapeHtml(cell) : cell))),
      )}
    `,
  });
}

function renderLoopSection() {
  const steps = [
    {
      label: 'Pick a save slot',
      body: 'Crop unlocks expand with chapter progression.',
    },
    {
      label: 'Planning phase',
      body: `Fill the 8 x 4 bed, choose a mix of crops, and commit the plan. Scene switches to ${pill('planner', 'blue')}.`,
    },
    {
      label: 'Season beats',
      body: `Three beats: early, mid, and late. Events and interventions change the board. Scene shifts to ${pill('story', 'blue')}.`,
    },
    {
      label: 'Harvest',
      body: 'The bed is scored. Recipes and pantry progress update.',
    },
    {
      label: 'Grade reveal',
      body: `Major results can use ${pill('celebration', 'blue')}. Campaign moves to the next season or chapter.`,
    },
  ];

  return renderSection({
    id: 'loop',
    title: 'Story mode loop',
    subtitle: '8 x 4 bed, 32 cells, three save slots.',
    bodyHtml: `
      <div class="gameplay-guide__loop">
        ${steps
          .map(
            (step, index) => `
              <div class="gameplay-guide__loop-step">
                <div class="gameplay-guide__loop-num">${index + 1}</div>
                <div>
                  <div class="gameplay-guide__loop-label">${escapeHtml(step.label)}</div>
                  <div class="gameplay-guide__loop-body">${step.body}</div>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
    `,
  });
}

function renderScoringSection() {
  return renderSection({
    id: 'scoring',
    title: 'How the score works',
    subtitle: 'Every planted cell contributes a cell score. Empty beds fail immediately.',
    bodyHtml: `
      ${renderCallout({
        tone: 'green',
        label: 'Best planning mindset',
        body:
          'Fill the bed. Diversify with intent. Avoid stacking structural demands unless the crop combo is worth it.',
      })}
      ${renderTable(
        ['Factor', 'Effect'],
        SCORE_ROWS.map((row) => row.map((cell) => escapeHtml(cell))),
      )}
      <div class="gameplay-guide__microheading">Grade thresholds</div>
      <div class="gameplay-guide__grade-grid">
        ${GRADE_ROWS
          .map(
            (row) => `
              <div class="gameplay-guide__grade-card">
                <div class="gameplay-guide__grade-letter gameplay-guide__grade-letter--${row.tone}">${escapeHtml(row.grade)}</div>
                <div class="gameplay-guide__grade-score">${escapeHtml(row.range)}</div>
              </div>
            `,
          )
          .join('')}
      </div>
    `,
  });
}

function renderInterventionsSection() {
  return renderSection({
    id: 'interventions',
    title: 'Interventions and carry-forward',
    subtitle: 'Three tokens per season. Use them to react to events and set up the next season.',
    bodyHtml: `
      ${renderTable(
        ['Token', 'What it does', 'Carries forward'],
        [
          ['Protect', 'Marks a planted cell as protected so current events can skip it.', 'No'],
          ['Mulch', 'Adds an immediate intervention bonus to the cell.', 'Yes, into next season'],
        ].map((row) => row.map((cell) => escapeHtml(cell))),
      )}
      ${renderCallout({
        tone: 'green',
        label: 'Season memory',
        body:
          'The campaign remembers your previous bed and soil health across seasons. Lessons, bonuses, and consequences can carry forward.',
      })}
    `,
  });
}

function renderSceneSection() {
  const cards = [
    {
      tone: 'green',
      name: 'planner',
      when: 'Planning phase and inspect-heavy play',
      desc: 'Flat, diagram-like, and readable. Reduced atmosphere so bed decisions are easy to read.',
    },
    {
      tone: 'amber',
      name: 'story',
      when: 'Cutscenes, events, and harvest beats',
      desc: 'Atmospheric, warmer, and more directional. It carries the main story presentation.',
    },
    {
      tone: 'blue',
      name: 'celebration',
      when: 'Grade reveals and major chapter moments',
      desc: 'Richer and punchier than story mode, reserved for peak payoff moments.',
    },
  ];

  return renderSection({
    id: 'scene',
    title: 'Scene style system',
    subtitle: 'Three visual presets now exist so planning readability and story atmosphere can both be correct.',
    bodyHtml: `
      <div class="gameplay-guide__scene-stack">
        ${cards
          .map(
            (card) => `
              <div class="gameplay-guide__scene-card">
                <div class="gameplay-guide__scene-swatch gameplay-guide__scene-swatch--${card.tone}"></div>
                <div>
                  <div class="gameplay-guide__scene-name">${escapeHtml(card.name)}</div>
                  <div class="gameplay-guide__scene-when">${escapeHtml(card.when)}</div>
                  <div class="gameplay-guide__scene-desc">${escapeHtml(card.desc)}</div>
                </div>
              </div>
            `,
          )
          .join('')}
      </div>
      <div class="gameplay-guide__footnote">
        Planner to story transitions can ease over. Story back to planner should feel snappy because it is player-driven.
      </div>
    `,
  });
}

function renderToolsSection() {
  return renderSection({
    id: 'tools',
    title: 'Let It Grow tool layer',
    subtitle: 'Active branch, not the primary Story Mode menu path yet.',
    bodyHtml: `
      ${renderCallout({
        tone: 'amber',
        label: 'Experimental',
        body: 'The tool bar is functional. Cooldowns are per-cell, not global.',
      })}
      <div class="gameplay-guide__tool-table">
        <div class="gameplay-guide__tool-head">
          <div class="gameplay-guide__tool-head-cell">Tool</div>
          <div class="gameplay-guide__tool-head-cell">Valid target</div>
          <div class="gameplay-guide__tool-head-cell gameplay-guide__tool-head-cell--right">Cooldown</div>
        </div>
        <div class="gameplay-guide__tool-body">
          ${TOOL_ROWS
            .map(
              (row) => `
                <div class="gameplay-guide__tool-row">
                  <div class="gameplay-guide__tool-cell gameplay-guide__tool-cell--label">${escapeHtml(row[0])}</div>
                  <div class="gameplay-guide__tool-cell">${escapeHtml(row[1])}</div>
                  <div class="gameplay-guide__tool-cell gameplay-guide__tool-cell--cooldown">${escapeHtml(row[2])}</div>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `,
  });
}

function renderControlsSection() {
  return renderSection({
    id: 'controls',
    title: 'Controls',
    subtitle: 'Keyboard, mouse, and touch all route into the same live systems.',
    bodyHtml: `
      <div class="gameplay-guide__microheading">Keyboard</div>
      ${renderTable(['Input', 'Action'], KEYBOARD_ROWS)}
      <div class="gameplay-guide__microheading">Touch</div>
      ${renderTable(
        ['Input', 'Action'],
        TOUCH_ROWS.map((row) => row.map((cell) => escapeHtml(cell))),
      )}
    `,
  });
}

function buildGuideBodyHtml() {
  return `
    <div class="gameplay-guide-shell">
      <nav class="gameplay-guide__nav" aria-label="Gameplay guide sections">
        ${GUIDE_NAV
          .map(
            (item, index) => `
              <button
                type="button"
                class="gameplay-guide__nav-item${index === 0 ? ' is-active' : ''}"
                data-guide-section="${escapeHtml(item.id)}"
                aria-controls="gameplay-guide-${escapeHtml(item.id)}"
                aria-selected="${index === 0 ? 'true' : 'false'}"
              >
                <span class="gameplay-guide__nav-dot gameplay-guide__nav-dot--${item.tone}" aria-hidden="true"></span>
                <span>${escapeHtml(item.label)}</span>
              </button>
            `,
          )
          .join('')}
      </nav>
      <div class="gameplay-guide__content">
        ${renderOverviewSection()}
        ${renderLoopSection()}
        ${renderScoringSection()}
        ${renderInterventionsSection()}
        ${renderSceneSection()}
        ${renderToolsSection()}
        ${renderControlsSection()}
      </div>
    </div>
  `;
}

function wireGuideNavigation(sheet) {
  const navItems = Array.from(sheet.querySelectorAll('[data-guide-section]'));
  const sections = Array.from(sheet.querySelectorAll('[data-guide-panel]'));
  const content = sheet.querySelector('.gameplay-guide__content');

  function activateSection(id) {
    navItems.forEach((item) => {
      const active = item.dataset.guideSection === id;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    sections.forEach((section) => {
      const active = section.dataset.guidePanel === id;
      section.classList.toggle('is-active', active);
      section.hidden = !active;
    });
    content?.scrollTo?.({ top: 0, behavior: 'auto' });
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => activateSection(item.dataset.guideSection));
  });
}

function closeGuideOverlay(overlay, onClosed) {
  if (!overlay || overlay.dataset.closing === 'true') return;
  overlay.dataset.closing = 'true';
  overlay.classList.remove('is-open');
  const sheet = overlay.querySelector('.panel-sheet');
  sheet?.classList.remove('is-open');
  window.setTimeout(() => {
    overlay.remove();
    onClosed?.();
  }, 260);
}

export function showGameplayGuide({
  launcher = null,
  title = 'Gameplay Guide',
  subtitle = 'How the current Garden OS build actually plays.',
} = {}) {
  const existing = document.getElementById('title-guide-overlay');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'title-guide-overlay';
  overlay.className = 'title-guide-overlay';
  document.body.appendChild(overlay);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.removeEventListener('keydown', onKeyDown);
    launcher?.focus?.({ preventScroll: true });
  };

  const sheet = showReadOnlySheet(overlay, {
    id: 'gameplay-guide-sheet',
    title,
    subtitle,
    bodyHtml: buildGuideBodyHtml(),
    footerHtml: `<span>${escapeHtml(GUIDE_FOOTER)}</span>`,
    closeLabel: 'Close gameplay guide',
    onClose: cleanup,
  });

  sheet.classList.add('read-only-sheet--gameplay-guide');
  wireGuideNavigation(sheet);

  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeGuideOverlay(overlay, cleanup);
  };

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeGuideOverlay(overlay, cleanup);
    }
  });

  document.addEventListener('keydown', onKeyDown);

  window.requestAnimationFrame(() => {
    overlay.classList.add('is-open');
  });

  sheet.querySelector('[data-close="true"]')?.focus({ preventScroll: true });
  return sheet;
}

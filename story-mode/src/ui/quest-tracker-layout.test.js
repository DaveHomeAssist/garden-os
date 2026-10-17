// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { showEventCard } from './event-card.js';

// jsdom swaps in its own URL class, so resolve the stylesheet by path.
const questCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../assets/css/hud-quests.css'), 'utf8');
const STEP_ASIDE = 'body:has(#panel-container .panel-sheet) .quest-tracker';

function mountPlayScreen() {
  document.body.dataset.storyScreen = 'play';
  document.body.innerHTML = '<div id="panel-container"></div><aside class="quest-tracker"></aside>';
  return document.getElementById('panel-container');
}

describe('quest tracker layout', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete document.body.dataset.storyScreen;
  });

  it('hides the tracker while a panel sheet is open', () => {
    const rule = questCss.match(/body:has\(#panel-container \.panel-sheet\) \.quest-tracker,[^{]*\{([^}]*)\}/);
    expect(rule, 'step-aside rule missing from hud-quests.css').not.toBeNull();
    expect(rule[1]).toMatch(/display:\s*none/);
  });

  it('matches the step-aside rule for the season event card (Late Frost, Windy Week, Spring Rain)', () => {
    const container = mountPlayScreen();
    expect(document.querySelector(STEP_ASIDE)).toBeNull();
    showEventCard(container, {
      id: 'late_frost',
      title: 'Late Frost Advisory',
      category: 'weather',
      valence: 'negative',
      description: 'Frost-sensitive crops take the hit.',
      interventionOptions: [],
    }, 3, () => {});
    expect(document.querySelector('#event-card-panel.panel-sheet')).not.toBeNull();
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
  });

  it('matches the step-aside rule for the Select Crop palette sheet', () => {
    const container = mountPlayScreen();
    const sheet = document.createElement('div');
    // Same markup contract as showCropPalette() in ui-binder.js.
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'crop-palette-panel';
    container.appendChild(sheet);
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
  });

  it('keeps the objective banner out of the tracker column on laptop widths', () => {
    expect(questCss).toMatch(/@media \(min-width: 901px\)\s*\{\s*body\[data-design-language="field-kit"\]\[data-story-screen="play"\]:has\(\.quest-tracker\) #phase-helper\s*\{\s*max-width: min\(690px, calc\(100vw - 2 \* \(270px \+ var\(--hud-safe-inline, 12px\) \+ 16px\)\)\);/);
  });
});

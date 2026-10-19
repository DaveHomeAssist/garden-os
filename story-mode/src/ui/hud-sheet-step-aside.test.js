// @vitest-environment jsdom
// playtest5 bugs 2 + 3: floating buttons and the quest tracker step aside for
// bottom sheets and the pause menu.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const controlsCss = readFileSync(join(here, '../../assets/css/hud-controls.css'), 'utf8');
const questCss = readFileSync(join(here, '../../assets/css/hud-quests.css'), 'utf8');

const SHEET_FABS = 'body[data-design-language="field-kit"][data-story-screen="play"]:has(#panel-container .panel-sheet) :is(#fab-plant, #fab-advance, #fab-backpack)';
const PAUSE_TRACKER = 'body:has(#pause-menu.is-open) .quest-tracker';

function mount() {
  document.body.dataset.designLanguage = 'field-kit';
  document.body.dataset.storyScreen = 'play';
  document.body.innerHTML = `
    <div id="app"><div class="pause-overlay" id="pause-menu" aria-hidden="true" inert></div></div>
    <div id="panel-container"></div>
    <button id="fab-plant"></button><button id="fab-advance"></button><button id="fab-backpack"></button>
    <aside class="quest-tracker"></aside>`;
}

afterEach(() => {
  document.body.innerHTML = '';
  delete document.body.dataset.designLanguage;
  delete document.body.dataset.storyScreen;
});

describe('narrow screens: Plant / Next / Backpack step aside for any bottom sheet', () => {
  it('the rule exists inside the 900px media query and hides the buttons', () => {
    const block = controlsCss.match(/@media \(max-width: 900px\) \{\s*body\[data-design-language="field-kit"\]\[data-story-screen="play"\]:has\(#panel-container \.panel-sheet\) :is\(#fab-plant, #fab-advance, #fab-backpack\) \{([^}]*)\}/);
    expect(block, 'sheet step-aside rule missing from hud-controls.css').not.toBeNull();
    expect(block[1]).toMatch(/display:\s*none/);
  });

  it('matches all three buttons once the Select Crop sheet is in #panel-container', () => {
    mount();
    expect(document.querySelectorAll(SHEET_FABS)).toHaveLength(0);
    const sheet = document.createElement('div');
    sheet.className = 'panel-sheet is-open';
    sheet.id = 'crop-palette-panel';
    document.getElementById('panel-container').appendChild(sheet);
    expect([...document.querySelectorAll(SHEET_FABS)].map((e) => e.id)).toEqual(['fab-plant', 'fab-advance', 'fab-backpack']);
  });
});

describe('the quest tracker hides while the pause menu is open', () => {
  it('the rule exists and hides the tracker', () => {
    const rule = questCss.match(/body:has\(#pause-menu\.is-open\) \.quest-tracker \{([^}]*)\}/);
    expect(rule, 'pause step-aside rule missing from hud-quests.css').not.toBeNull();
    expect(rule[1]).toMatch(/display:\s*none/);
  });

  it('matches only while #pause-menu has is-open', () => {
    mount();
    expect(document.querySelector(PAUSE_TRACKER)).toBeNull();
    document.getElementById('pause-menu').classList.add('is-open');
    expect(document.querySelector(PAUSE_TRACKER)).not.toBeNull();
    document.getElementById('pause-menu').classList.remove('is-open');
    expect(document.querySelector(PAUSE_TRACKER)).toBeNull();
  });
});

describe('phones: the quest tracker stacks above the tool hotbar (playtest5 bug 6)', () => {
  const px = (re, src) => Number(src.match(re)?.[1]);
  it('the tracker bottom clears the hotbar top', () => {
    const narrow = questCss.match(/@media \(max-width: 600px\) \{\s*\.quest-tracker \{([^}]*)\}/);
    expect(narrow, '600px tracker rule missing from hud-quests.css').not.toBeNull();
    const trackerBottom = px(/bottom:\s*calc\((\d+)px/, narrow[1]);
    const hotbar = controlsCss.match(/\.tool-hud \{\s*position: fixed !important;([^}]*)\}/)[1];
    const hotbarBottom = px(/inset: auto auto calc\((\d+)px/, hotbar);
    const padding = px(/padding:\s*(\d+)px/, hotbar);
    const slot = px(/\.tool-hud__slot \{\s*width: (\d+)px;\s*height: \d+px;\s*flex: 0 0 \d+px;/, controlsCss);
    expect(hotbarBottom).toBe(150);
    // hotbar top = bottom offset + slot + vertical padding (+1px borders).
    expect(trackerBottom).toBeGreaterThanOrEqual(hotbarBottom + slot + 2 * padding + 2);
  });
});

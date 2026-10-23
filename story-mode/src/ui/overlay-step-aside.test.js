// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const questCss = readFileSync(join(here, '../../assets/css/hud-quests.css'), 'utf8');
const layoutCss = readFileSync(join(here, '../../assets/css/layout.css'), 'utf8');
const STEP_ASIDE = 'body:has(#overlay-container > *) .quest-tracker';

function mount() {
  document.body.dataset.storyScreen = 'play';
  document.body.innerHTML = '<div id="panel-container"></div><div id="overlay-container"></div><aside class="quest-tracker"></aside>';
  return document.getElementById('overlay-container');
}

describe('panels no longer cover each other', () => {
  afterEach(() => { document.body.innerHTML = ''; delete document.body.dataset.storyScreen; });

  it('hides the quest tracker while a full-screen overlay is showing', () => {
    const rule = questCss.match(/body:has\(#overlay-container > \*\) \.quest-tracker\s*\{([^}]*)\}/);
    expect(rule, 'overlay step-aside rule missing').not.toBeNull();
    expect(rule[1]).toMatch(/display:\s*none/);
  });

  it('matches for the harvest reveal, the winter review, the season card and the ending recap, and not during play', () => {
    const overlay = mount();
    expect(document.querySelector(STEP_ASIDE)).toBeNull();
    overlay.innerHTML = '<div class="harvest-reveal harvest-reveal-overlay"></div>';
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
    overlay.innerHTML = '<div class="winter-review winter-review-overlay"></div>';
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
    overlay.innerHTML = '<div class="chapter-intro" id="season-transition-overlay"></div>';
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
    overlay.innerHTML = '<div class="chapter-intro campaign-recap" id="campaign-recap-overlay"></div>';
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
    overlay.innerHTML = '';
    expect(document.querySelector(STEP_ASIDE)).toBeNull();
  });

  it('the empty sheet column does not take clicks meant for the bed', () => {
    const block = layoutCss.match(/#panel-container \{[^}]*\}/)[0];
    expect(block).toMatch(/pointer-events:\s*none/);
    expect(layoutCss).toMatch(/#panel-container > \* \{ pointer-events: auto; \}/);
  });
});

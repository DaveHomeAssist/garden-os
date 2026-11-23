// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { setElementInteractive } from './focus-state.js';
import { showWorldMapPanel } from './world-map.js';

const here = dirname(fileURLToPath(import.meta.url));
const marketCss = readFileSync(join(here, '../../assets/css/hud-market.css'), 'utf8');
const questCss = readFileSync(join(here, '../../assets/css/hud-quests.css'), 'utf8');
const foundationCss = readFileSync(join(here, '../../assets/css/hud-foundation.css'), 'utf8');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const token = (css, scope, name) => {
  const block = css.match(new RegExp(`${scope.replace(/[[\]().*"=]/g, '\\$&')} \\{([^}]*)\\}`))?.[1] ?? '';
  return block.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
};

describe('world map lock text contrast (field-kit)', () => {
  const lockBlock = marketCss.match(/\n\.world-map__lock \{([^}]*)\}/)?.[1] ?? '';
  const lockInk = lockBlock.match(/color:\s*var\(--map-lock-ink,\s*(#[0-9a-f]{6})\)/i)?.[1];

  it('uses a dark amber ink instead of the translucent sun-gold', () => {
    expect(lockInk).toBe('#5a3c06');
    expect(lockBlock).not.toMatch(/rgba\(232,\s*200,\s*74/);
    expect(lockBlock).toMatch(/font-weight:\s*600/);
  });

  it('meets WCAG AA (4.5:1) on the cream sheet, the soft paper and the darkest measured card surface', () => {
    const paper = hex(token(foundationCss, 'body[data-design-language="field-kit"]', '--hud-paper'));
    const paperSoft = hex(token(foundationCss, 'body[data-design-language="field-kit"]', '--hud-paper-soft'));
    // Darkest card pixel sampled at 1024x706 with the 3D scene behind the translucent sheet.
    const measuredCard = [197, 191, 182];
    for (const bg of [paper, paperSoft, measuredCard]) {
      expect(contrast(hex(lockInk), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the old colour failed AA on the same card (regression guard for the measurement)', () => {
    const old = [232, 200, 74].map((c, i) => Math.round(c * 0.9 + [208, 203, 193][i] * 0.1));
    expect(contrast(old, [208, 203, 193])).toBeLessThan(2);
  });

  it('keeps the field-kit gold in the dark theme, where it passes AA on the dark sheet', () => {
    expect(marketCss).toMatch(/html\[data-theme="dark"\] \.world-map__lock \{\s*--map-lock-ink: var\(--hud-gold, #e0b950\);/);
    const darkScope = 'html[data-theme="dark"] body[data-design-language="field-kit"]';
    const gold = hex(token(foundationCss, darkScope, '--hud-gold'));
    for (const name of ['--hud-paper', '--hud-paper-soft']) {
      expect(contrast(gold, hex(token(foundationCss, darkScope, name)))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('locked zones still render their reason with the .world-map__lock class', () => {
    document.body.innerHTML = '<div id="panel-container"></div>';
    const model = { zones: [{ id: 'meadow', name: 'Meadow', biome: 'grassland', connectionCount: 2, visited: false, current: false, allowed: false, blockers: [{ message: 'The meadow trails are overgrown.' }] }] };
    showWorldMapPanel(document.getElementById('panel-container'), model, () => {});
    const lock = document.querySelector('.world-map__lock');
    expect(lock?.textContent).toBe('The meadow trails are overgrown.');
    expect(document.querySelector('[data-zone-id="meadow"]').getAttribute('aria-describedby')).toBe('world-map-lock-meadow');
    document.body.innerHTML = '';
  });
});

describe('quest tracker steps aside for the intro cutscene at every width', () => {
  const STEP_ASIDE = 'body:has(#cutscene-layer:not([inert])) .quest-tracker';
  afterEach(() => { document.body.innerHTML = ''; delete document.body.dataset.storyScreen; });

  it('declares the cutscene step-aside outside any media query (so it applies above 900px)', () => {
    const topLevel = questCss.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
    const rule = topLevel.match(/body:has\(#cutscene-layer:not\(\[inert\]\)\) \.quest-tracker \{([^}]*)\}/);
    expect(rule, 'all-widths cutscene rule missing').not.toBeNull();
    expect(rule[1]).toMatch(/display:\s*none/);
    const narrow = questCss.match(/@media \(max-width: 900px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(narrow).not.toMatch(/#cutscene-layer/);
  });

  it('hides while the cutscene layer is live and restores when it goes inert again', () => {
    document.body.dataset.storyScreen = 'play';
    document.body.innerHTML = '<div id="cutscene-layer" aria-hidden="true" inert><div id="dp-panel"></div></div><aside class="quest-tracker"></aside>';
    const layer = document.getElementById('cutscene-layer');
    expect(document.querySelector(STEP_ASIDE)).toBeNull();
    setElementInteractive(layer, true); // cutscene starts (ui-binder onStateChange visible)
    expect(document.querySelector(STEP_ASIDE)).not.toBeNull();
    setElementInteractive(layer, false); // onFinish
    expect(document.querySelector(STEP_ASIDE)).toBeNull();
  });
});

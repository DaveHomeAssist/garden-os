// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../../assets/css/hud-controls.css'), 'utf8');
const panelSrc = readFileSync(join(here, 'backpack-panel.js'), 'utf8');

const hex = (s) => s.replace('#', '').match(/../g).map((v) => parseInt(v, 16));
const lum = (rgb) => {
  const f = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (rgb, alpha, bg) => rgb.map((v, i) => v * alpha + bg[i] * (1 - alpha));

function tokens() {
  const block = css.match(/#backpack-panel \{([^}]*)\}/)[1];
  return Object.fromEntries([...block.matchAll(/--(bp-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

// The sheet paints on var(--text): cream in both themes (measured 241,227,206).
const CREAM = [241, 227, 206];
// Darkest washes the panel lays under text: tone wash, seed/quest/ok tints.
const BACKGROUNDS = [
  CREAM,
  over([42, 25, 13], 0.08, CREAM),
  over([90, 171, 107], 0.16, CREAM),
  over([232, 200, 74], 0.18, CREAM),
  over([127, 191, 127], 0.18, CREAM),
];

describe('backpack sheet text contrast', () => {
  it('every text ink token clears WCAG AA (4.5:1) on the sheet and its tints', () => {
    const t = tokens();
    for (const name of ['bp-ink', 'bp-ink-soft', 'bp-ink-muted', 'bp-label', 'bp-chip-ink', 'bp-warn', 'bp-ok']) {
      expect(t[name], name).toMatch(/^#[0-9a-f]{6}$/i);
      for (const bg of BACKGROUNDS) {
        expect(contrast(hex(t[name]), bg), `${name} on rgb(${bg.map(Math.round)})`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('render templates no longer use the near-white inks as text colours', () => {
    // Everything above the drag code (the ghost keeps its own tint).
    const templates = panelSrc.slice(0, panelSrc.indexOf('ghost.style'));
    expect(templates).not.toMatch(/#f7f2ea|#f4dfa1|#e8b58d|#9dd59d|rgba\(232,200,74,0\.6\)/i);
    expect(templates).not.toMatch(/rgba\(247,242,234/);
    for (const m of templates.matchAll(/(?<![-\w])color:\s*([^;"]+)/g)) {
      // Only tokens, or the dark ink used on the gold active buttons.
      expect(m[1].replace(/'?#1a120c'?/g, '').match(/#[0-9a-f]{3,6}|rgba?\(/gi), m[0]).toBeNull();
    }
  });
});

describe('floating buttons step aside while the backpack is open', () => {
  function mount(open) {
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.setAttribute('data-design-language', 'field-kit');
    document.body.setAttribute('data-story-screen', 'play');
    document.body.innerHTML = `
      <button id="fab-bug"></button><button id="fab-advance"></button>
      <button id="fab-plant"></button><button id="fab-backpack"></button>
      <div id="panel-container">${open ? '<div id="backpack-panel" class="panel-sheet is-open"></div>' : ''}</div>`;
  }
  const hidden = (id) => getComputedStyle(document.getElementById(id)).display === 'none';

  it('has the rules in hud-controls.css', () => {
    expect(css).toContain(':has(#backpack-panel.is-open) #fab-bug');
    expect(css).toMatch(/@media \(max-width: 900px\) \{\s*body[^{]*:has\(#backpack-panel\.is-open\) :is\(#fab-plant, #fab-advance, #fab-backpack\)/);
  });

  it('hides the bug FAB whenever the backpack is open and restores it on close', () => {
    mount(true);
    expect(hidden('fab-bug')).toBe(true);
    mount(false);
    expect(['fab-bug', 'fab-advance', 'fab-plant', 'fab-backpack'].some(hidden)).toBe(false);
  });

  it('matches the narrow-screen FABs via the open-backpack selector', () => {
    mount(true);
    for (const id of ['fab-plant', 'fab-advance', 'fab-backpack']) {
      expect(document.getElementById(id).matches(
        'body[data-design-language="field-kit"][data-story-screen="play"]:has(#backpack-panel.is-open) :is(#fab-plant, #fab-advance, #fab-backpack)',
      )).toBe(true);
    }
  });
});

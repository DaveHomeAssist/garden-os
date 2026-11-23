// fix/phone-landscape-controls: phone landscape layout (Move stick in the
// bottom-left corner, hotbar bottom-centre, objective top-centre, Plant /
// Backpack in the right column) and the portrait prompt card clearing the
// stick. Browser check: tests/phone-controls-check.mjs.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE_LANDSCAPE_QUERY } from './ui-constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../../assets/css/phone-controls.css'), 'utf8');
const main = readFileSync(join(here, '../main.js'), 'utf8');
const stick = readFileSync(join(here, 'touch-stick.js'), 'utf8');

const block = (query) => {
  const start = css.indexOf(`@media ${query} {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  return '';
};
const rule = (src, selectorEnd) => {
  const i = src.indexOf(`${selectorEnd} {`);
  return i < 0 ? '' : src.slice(i, src.indexOf('}', i) + 1);
};

describe('phone controls', () => {
  const landscape = block(PHONE_LANDSCAPE_QUERY);

  it('loads after mobile-a11y.css so its overrides win', () => {
    expect(main.indexOf("import '../assets/css/phone-controls.css';")).toBeGreaterThan(main.indexOf("import '../assets/css/mobile-a11y.css';"));
  });

  it('landscape parks the Move stick in the bottom-left corner via the stick CSS variables', () => {
    expect(PHONE_LANDSCAPE_QUERY).toBe('(orientation: landscape) and (max-height: 500px)');
    const s = rule(landscape, '.touch-stick');
    expect(s).toMatch(/--touch-stick-bottom: 6px;/);
    expect(s).toMatch(/--touch-stick-left: 12px;/);
    expect(stick).toMatch(/var\(--touch-stick-bottom, \$\{STICK_BOTTOM_PX\}px\)/);
    expect(stick).toMatch(/var\(--touch-stick-left, \$\{STICK_LEFT_PX\}px\) \+ env\(safe-area-inset-left/);
  });

  it('landscape puts the hotbar bottom-centre and the objective top-centre', () => {
    const hotbar = rule(landscape, '.tool-hud.is-visible');
    expect(hotbar).toMatch(/inset: auto auto var\(--phone-ls-bottom\) 50% !important;/);
    expect(hotbar).toMatch(/transform: translateX\(-50%\) !important;/);
    const objective = rule(landscape, '#phase-helper');
    expect(objective).toMatch(/top: calc\(68px \+ env\(safe-area-inset-top, 0px\)\);/);
    expect(objective).toMatch(/width: min\(520px, calc\(100vw - 400px\)\);/);
  });

  it('landscape moves Backpack and Plant to the right column and lifts the prompt above the hotbar', () => {
    expect(rule(landscape, '#fab-backpack')).toMatch(/left: auto;\s*right: var\(--phone-ls-edge\);/);
    expect(rule(landscape, '#fab-plant')).toMatch(/left: auto;\s*right: var\(--phone-ls-edge\);/);
    expect(rule(landscape, '#village-prompt.village-prompt')).toMatch(/bottom: calc\(8px \+ 66px \+ 10px/);
  });

  it('portrait touch phones centre the prompt card right of the stick and keep #83 (card body passes taps through)', () => {
    const portrait = block('(max-width: 600px) and (orientation: portrait)');
    const p = rule(portrait, '#app:has(> .touch-stick) #village-prompt.village-prompt');
    expect(p).toMatch(/left: calc\(50% \+ 70px\) !important;/);
    expect(p).toMatch(/width: max-content;/);
    expect(css).not.toMatch(/#village-prompt[^{]*\{[^}]*pointer-events: auto/);
  });
});

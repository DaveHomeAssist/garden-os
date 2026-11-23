// fix/phone-objective-card: phones clamp the objective card to two lines and
// expand it on tap; phone landscape (short screens) gets the same card;
// wider screens are unchanged.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE_OBJECTIVE_QUERY } from './ui-constants.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../../assets/css/hud-controls.css'), 'utf8');
const binder = readFileSync(join(here, 'ui-binder.js'), 'utf8');

const phoneBlock = (() => {
  const start = css.indexOf('/* Phones (fix/phone-objective-card)');
  return start < 0 ? '' : css.slice(start);
})();

describe('phone objective card', () => {
  it('clamps to label + two lines under 600px and keeps a readable size', () => {
    expect(phoneBlock).toMatch(/@media \(max-width: 600px\), \(orientation: landscape\) and \(max-height: 500px\) \{/);
    expect(phoneBlock).toMatch(/-webkit-line-clamp: 3;/);
    expect(phoneBlock).toMatch(/font-size: 12px;/);
    expect(phoneBlock).toMatch(/#phase-helper\.is-expanded \{\s*-webkit-line-clamp: unset;/);
  });

  it('only takes taps when visible and actually truncated or expanded', () => {
    expect(phoneBlock).toMatch(/#phase-helper\.is-visible\[data-truncated="true"\],[\s\S]*#phase-helper\.is-visible\.is-expanded \{\s*pointer-events: auto;/);
    expect(phoneBlock).not.toMatch(/#phase-helper \{[^}]*pointer-events: auto/);
  });

  it('comes after the 900px rules so it wins on phones', () => {
    expect(css.lastIndexOf('@media (max-width: 900px)')).toBeLessThan(css.indexOf('/* Phones (fix/phone-objective-card)'));
  });

  it('binder toggles expansion on tap and resets it when the objective text changes', () => {
    expect(binder).toMatch(/window\.matchMedia\(PHONE_OBJECTIVE_QUERY\)/);
    expect(PHONE_OBJECTIVE_QUERY).toBe('(max-width: 600px), (orientation: landscape) and (max-height: 500px)');
    expect(binder).toMatch(/phaseHelper\?\.addEventListener\('click'/);
    expect(binder).toMatch(/if \(phaseHelper\.textContent !== helperText\) \{\s*phaseHelper\.textContent = helperText;\s*setObjectiveExpanded\(false\);/);
    expect(binder).toMatch(/phaseHelper\.dataset\.truncated = 'true'/);
  });
});

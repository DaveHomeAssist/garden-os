// fix/phone-hud-declutter: phone status chip (crop counter + quests + bug
// button in one), one-line objective after first read, lighter phone HUD.
// Browser check: tests/phone-controls-check.mjs and tests/mobile-a11y-audit.mjs.
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStatusChipLabel, buildStatusChipText, mountPhoneStatusChip, PHONE_HUD_QUERY } from './phone-hud.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../../assets/css/phone-hud.css'), 'utf8');
const binder = readFileSync(join(here, 'ui-binder.js'), 'utf8');

describe('phone status chip text', () => {
  it('shows the crop count, and quests only when there are some', () => {
    expect(buildStatusChipText({ crops: '3 / 32' })).toBe('🌱 3/32');
    expect(buildStatusChipText({ crops: '3 / 32', quests: 0 })).toBe('🌱 3/32');
    expect(buildStatusChipText({ crops: '3 / 32', quests: 2 })).toBe('🌱 3/32 · 📜 2');
  });

  it('gives screen readers the full sentence and the open state', () => {
    expect(buildStatusChipLabel({ crops: '3 / 32', quests: 1 })).toBe('3 of 32 squares planted, 1 active quest. Show details and bug report');
    expect(buildStatusChipLabel({ crops: '0 / 32', open: true })).toMatch(/Hide details/);
  });
});

describe('mountPhoneStatusChip', () => {
  const setup = () => {
    document.body.innerHTML = `
      <div id="hud"><div class="hud-left"></div><div class="hud-right"><span id="hud-crops">0 / 32</span></div></div>
      <button id="fab-bug"></button>
      <aside class="quest-tracker"><span class="quest-tracker__count">1/3</span></aside>`;
    delete document.body.dataset.phoneStatus;
    return mountPhoneStatusChip({ doc: document });
  };

  it('mounts once into the right rail and mirrors the counter', async () => {
    const chip = setup();
    expect(document.querySelectorAll('#hud-status-chip')).toHaveLength(1);
    expect(chip.element.parentElement.classList.contains('hud-right')).toBe(true);
    expect(chip.element.querySelector('.hud-status-chip__text').textContent).toBe('🌱 0/32 · 📜 1');
    document.getElementById('hud-crops').textContent = '5 / 32';
    await new Promise((r) => setTimeout(r, 0));
    expect(chip.element.querySelector('.hud-status-chip__text').textContent).toBe('🌱 5/32 · 📜 1');
    mountPhoneStatusChip({ doc: document });
    expect(document.querySelectorAll('#hud-status-chip')).toHaveLength(1);
  });

  it('opens on tap, closes on a tap elsewhere or on the bug button', () => {
    const chip = setup();
    chip.element.click();
    expect(document.body.dataset.phoneStatus).toBe('open');
    expect(chip.element.getAttribute('aria-expanded')).toBe('true');
    expect(chip.element.textContent).toMatch(/^🌱 0\/32 · 📜 1, 0 of 32 squares planted, 1 active quest\. Hide details/);
    expect(chip.element.hasAttribute('aria-label')).toBe(false);
    document.querySelector('.quest-tracker').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.body.dataset.phoneStatus).toBe('open');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.body.dataset.phoneStatus).toBeUndefined();
    chip.element.click();
    document.getElementById('fab-bug').click();
    expect(document.body.dataset.phoneStatus).toBeUndefined();
    expect(chip.element.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('phone-hud.css', () => {
  it('only applies at phone sizes (portrait up to 430px, landscape phones)', () => {
    expect(PHONE_HUD_QUERY).toBe('(max-width: 430px) and (orientation: portrait), (orientation: landscape) and (max-height: 500px)');
    expect(css).toContain(`@media ${PHONE_HUD_QUERY} {`);
    // Everything else is inside a phone media query, except the chip's default hide.
    const outside = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').trim();
    expect(outside).toBe('.hud-status-chip {\n  display: none;\n}');
  });

  it('keeps the 12px text floor and 44px targets', () => {
    for (const m of css.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    for (const m of css.matchAll(/(?:min-)?(?:width|height):\s*(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(44);
  });

  it('folds the counter, tracker and bug button behind the chip, and drops card chrome', () => {
    expect(css).toMatch(/:not\(\[data-phone-status="open"\]\) :is\(\.quest-tracker, #fab-bug\)/);
    expect(css).toMatch(/:is\(#hud-crops, \.hud-score-wrap\)/);
    expect(css).toMatch(/#phase-helper\.is-fresh/);
    expect(css).toMatch(/-webkit-line-clamp: 1;/);
  });

  it('shows a new objective in full once, then settles it', () => {
    expect(binder).toMatch(/markObjectiveFresh\(helperText\)/);
    expect(binder).toMatch(/seenObjectives\.has\(text\)/);
  });
});

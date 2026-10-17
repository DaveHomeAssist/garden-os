// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// jsdom swaps in its own URL class, so resolve the stylesheets by path.
const cssDir = join(dirname(fileURLToPath(import.meta.url)), '../../assets/css');
const controlsCss = readFileSync(join(cssDir, 'hud-controls.css'), 'utf8');
const questCss = readFileSync(join(cssDir, 'hud-quests.css'), 'utf8');

function mountHud() {
  document.head.innerHTML = `<style>${controlsCss}</style>`;
  document.body.dataset.designLanguage = 'field-kit';
  document.body.dataset.storyScreen = 'play';
  document.body.innerHTML = `
    <div id="panel-container"></div>
    <button id="fab-bug">bug</button>
    <button id="fab-advance">Start Season</button>
    <button id="fab-plant">Plant</button>`;
  return {
    panel: document.getElementById('panel-container'),
    bug: document.getElementById('fab-bug'),
    advance: document.getElementById('fab-advance'),
    plant: document.getElementById('fab-plant'),
  };
}

function openSheet(panel, id) {
  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open';
  sheet.id = id;
  panel.appendChild(sheet);
  return sheet;
}

describe('HUD controls step aside for open sheets', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete document.body.dataset.designLanguage;
    delete document.body.dataset.storyScreen;
  });

  it('hides the bug FAB while the crop picker or event card is open', () => {
    const hud = mountHud();
    expect(getComputedStyle(hud.bug).display).not.toBe('none');
    const sheet = openSheet(hud.panel, 'crop-palette-panel');
    expect(getComputedStyle(hud.bug).display).toBe('none');
    sheet.remove();
    expect(getComputedStyle(hud.bug).display).not.toBe('none');
    openSheet(hud.panel, 'event-card-panel');
    expect(getComputedStyle(hud.bug).display).toBe('none');
  });

  it('hides disabled Start Season / Plant over a sheet but keeps an enabled Next', () => {
    const hud = mountHud();
    openSheet(hud.panel, 'event-card-panel');
    hud.advance.disabled = true;
    hud.plant.disabled = true;
    expect(getComputedStyle(hud.advance).visibility).toBe('hidden');
    expect(getComputedStyle(hud.plant).visibility).toBe('hidden');
    hud.advance.disabled = false;
    expect(getComputedStyle(hud.advance).visibility).not.toBe('hidden');
  });

  it('leaves disabled FABs visible when no sheet is open', () => {
    const hud = mountHud();
    hud.advance.disabled = true;
    expect(getComputedStyle(hud.advance).visibility).not.toBe('hidden');
  });
});

describe('quest tracker placement at 900px and below', () => {
  const narrow = questCss.match(/@media \(max-width: 900px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

  it('moves the tracker to the bottom from the HUD breakpoint (900px), not 720px', () => {
    expect(narrow).toMatch(/\.quest-tracker \{\s*top: auto;\s*bottom: calc\(150px/);
    expect(questCss).not.toMatch(/@media \(max-width: 720px\)/);
  });

  it('hides the bottom-anchored tracker while a cutscene is showing', () => {
    expect(narrow).toMatch(/body:has\(#cutscene-layer:not\(\[inert\]\)\) \.quest-tracker \{\s*display: none;/);
  });
});

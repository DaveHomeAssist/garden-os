// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createDialoguePanel } from './dialogue-panel.js';

// jsdom swaps in its own URL class, so resolve the stylesheet by path.
// Git may check the stylesheet out with CRLF on Windows. Assert CSS content,
// not the host's line-ending convention.
const themeCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../assets/css/theme.css'), 'utf8').replace(/\r\n/g, '\n');

function mount() {
  document.head.innerHTML = `<style>${themeCss}</style>`;
  document.body.innerHTML = '<div id="cutscene-layer"><div id="dialogue-root"></div></div>';
  return createDialoguePanel(document.getElementById('dialogue-root'));
}

const beat = (extra = {}) => ({
  visible: true,
  speaker: 'narrator',
  speakerName: 'Narrator',
  textVisible: 'Hello.',
  canAdvance: true,
  canSkip: true,
  beatIndex: 0,
  beatCount: 1,
  ...extra,
});

describe('dialogue panel idle paint work', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.removeAttribute('data-scene-held');
  });

  it('flags when the tap-to-continue hint is actually shown', () => {
    const panel = mount();
    const el = panel.getPanelElement();
    panel.render(beat({ canAdvance: false }));
    expect(el.dataset.hint).toBe('off');
    panel.render(beat());
    expect(el.dataset.hint).toBe('on');
    panel.render(beat({ choices: [{ label: 'Yes' }] }));
    expect(el.dataset.hint).toBe('off');
  });

  it('stops the hint bounce unless the panel is visible, the hint is on and the scene is not held', () => {
    // jsdom does not compute the animation shorthand, so check that the
    // stylesheet carries the stop rule and which states its selector matches.
    const STOP = '#cutscene-layer .dp-panel:not(.dp-panel--visible) *,\nbody[data-scene-held] #cutscene-layer .dp-panel *,\n#cutscene-layer .dp-panel:not([data-hint="on"]) .dp-advance-hint';
    expect(themeCss).toContain(`${STOP} {\n  animation: none;\n}`);
    const panel = mount();
    const hint = panel.getPanelElement().querySelector('#dp-advance-hint');
    const stopped = () => hint.matches(STOP.replace(/\n/g, ' '));

    expect(stopped()).toBe(true); // hidden panel
    panel.render(beat());
    expect(stopped()).toBe(false); // shown, waiting for a tap: bounce
    panel.render(beat({ canAdvance: false }));
    expect(stopped()).toBe(true); // still typing
    panel.render(beat());
    document.body.setAttribute('data-scene-held', '');
    expect(stopped()).toBe(true); // pause menu open or tab hidden
    document.body.removeAttribute('data-scene-held');
    expect(stopped()).toBe(false);
    panel.hide();
    expect(stopped()).toBe(true);
  });

  it('drops the backdrop blur while hidden or held, and honours reduced motion', () => {
    expect(themeCss).toMatch(/#cutscene-layer \.dp-panel:not\(\.dp-panel--visible\),\s*body\[data-scene-held\] #cutscene-layer \.dp-panel \{[^}]*backdrop-filter: none;/);
    expect(themeCss).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*#cutscene-layer \.dp-advance-hint \{\s*animation: none;/);
  });
});

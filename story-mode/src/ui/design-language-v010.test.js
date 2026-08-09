// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { installDesignLanguageV010 } from './design-language-v010.js';

let installed = null;

afterEach(() => {
  installed?.dispose();
  installed = null;
  document.body.innerHTML = '';
  document.body.removeAttribute('data-design-language');
});

function mountFixture() {
  document.body.innerHTML = `
    <div id="phase-helper">Bed is ready. Tap Commit Plan to begin Early Season.</div>
    <button id="hud-action">Start Season</button>
    <button id="fab-advance">Start Season</button>
    <div id="season-calendar">
      <span id="cal-month">March</span>
      <span id="cal-chapter-title">A Fresh Start</span>
      <span id="cal-year">Year 1 of 3</span>
      <span id="cal-beat-label">Planning Phase</span>
    </div>
  `;
}

describe('installDesignLanguageV010', () => {
  it('marks the active design-language version and removes stale CTA copy', () => {
    mountFixture();
    installed = installDesignLanguageV010();

    expect(document.body.dataset.designLanguage).toBe('v0.10');
    expect(document.getElementById('phase-helper').textContent).toContain('Select Start Season');
    expect(document.getElementById('phase-helper').textContent).not.toContain('Commit Plan');
  });

  it('connects both progression controls to the current task', () => {
    mountFixture();
    installed = installDesignLanguageV010();

    for (const id of ['hud-action', 'fab-advance']) {
      const button = document.getElementById(id);
      expect(button.getAttribute('aria-describedby')).toBe('phase-helper');
      expect(button.getAttribute('data-ui-role')).toBe('primary-action');
      expect(button.getAttribute('aria-label')).toContain('Start Season');
      expect(button.getAttribute('aria-label')).toContain('Select Start Season');
    }
  });

  it('exposes season status as one readable live region', () => {
    mountFixture();
    installed = installDesignLanguageV010();

    const calendar = document.getElementById('season-calendar');
    expect(calendar.getAttribute('role')).toBe('status');
    expect(calendar.getAttribute('aria-live')).toBe('polite');
    expect(calendar.getAttribute('aria-label')).toBe(
      'March. A Fresh Start. Year 1 of 3. Planning Phase',
    );
  });

  it('keeps action labels synchronized after the runtime changes phase copy', async () => {
    mountFixture();
    installed = installDesignLanguageV010();

    document.getElementById('fab-advance').textContent = 'Harvest';
    document.getElementById('phase-helper').textContent = 'Late season complete.';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('fab-advance').getAttribute('aria-label')).toBe(
      'Harvest. Late season complete.',
    );
  });
});

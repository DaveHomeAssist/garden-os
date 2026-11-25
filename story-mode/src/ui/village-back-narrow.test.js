// @vitest-environment jsdom
// 320x568 (bug list Nov 25): "Back to village" sat on the season calendar.
// The narrowest phones show "← Village"; the accessible name is unchanged.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBackToVillageButton } from './village-hooks.js';

const css = readFileSync(resolve(process.cwd(), 'assets/css/village-overlays.css'), 'utf8');

describe('Back to village on the narrowest phones', () => {
  it('keeps its full name and text, with "Back to " in a droppable span', () => {
    const button = createBackToVillageButton(document.body, () => {});
    expect(button.getAttribute('aria-label')).toBe('Back to village (Esc)');
    expect(button.textContent.replace(/\s+/g, ' ').trim()).toBe('← Back to village');
    expect(button.querySelector('.village-back-button__lead')?.textContent).toBe('Back to ');
    button.remove();
  });

  it('drops the lead words below 360px wide only', () => {
    const m = css.match(/@media \(max-width: 359px\) \{\s*#village-back \.village-back-button__lead \{\s*display: none;/);
    expect(m).not.toBeNull();
  });
});

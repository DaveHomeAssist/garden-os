// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildWorldMapModel, createWorldMapPanel } from './world-map.js';
import { createGameState } from '../game/state.js';

describe('world map panel', () => {
  it('explains why a zone is locked on its card', () => {
    const panel = createWorldMapPanel(buildWorldMapModel(createGameState()), () => {});
    const riverside = panel.querySelector('[data-zone-id="riverside"]');
    expect(riverside.disabled).toBe(true);
    const lockId = riverside.getAttribute('aria-describedby');
    expect(panel.querySelector(`#${lockId}`).textContent).toMatch(/river/i);
    expect(panel.querySelector('[data-zone-id="neighborhood"]').disabled).toBe(false);
  });

  it('travels only through enabled zone buttons', () => {
    const travelled = [];
    const panel = createWorldMapPanel(buildWorldMapModel(createGameState()), (zoneId) => travelled.push(zoneId));
    panel.querySelector('[data-zone-id="neighborhood"]').click();
    panel.querySelector('[data-zone-id="riverside"]').click();
    expect(travelled).toEqual(['neighborhood']);
  });

  it('builds the panel without parsing markup strings', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/ui/world-map.js'), 'utf8');
    expect(source).not.toMatch(/innerHTML/);
  });
});

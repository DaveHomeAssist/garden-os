import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.GOS_URL || 'http://127.0.0.1:4317/garden-os/story-mode/';
const out = process.env.GOS_OUT || '../../outputs/garden-freeplay-integration';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-mode="freeplay"]').waitFor();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Start Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#hud-pause').click();
  await page.locator('#pause-main-menu').click();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).waitFor();
  // Seed through the real persistence API, including its IndexedDB authority journal.
  await page.evaluate(async () => {
    const { createSandboxState, createGameState } = await import('./src/game/state.js');
    const { initGame, waitForSessionFlush } = await import('./src/game/game-init.js');
    const { saveCampaign } = await import('./src/game/save.js');
    const story = createGameState();
    story.campaign.playerProfile.displayName = 'Story untouched';
    saveCampaign(story.campaign, 0);
    const state = createSandboxState();
    state.campaign.playerProfile.displayName = 'Free Play resume';
    state.season.grid[0].cropId = 'basil';
    const session = initGame(state, { slot: 'freeplay' });
    await session.persistGameState();
    session.cleanup();
    await waitForSessionFlush();
  });
  const storyBefore = await page.evaluate(() => localStorage.getItem('gos-story-slot-0-campaign'));
  await page.reload();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#hud-pause').waitFor({ state: 'visible' });
  await page.locator('#hud-pause').click();
  await page.locator('#pause-export').waitFor({ state: 'visible' });
  assert.match(await page.locator('#pause-status').innerText(), /saved independently/i);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#pause-export').click()]);
  const text = await readFile(await download.path(), 'utf8');
  const payload = JSON.parse(text);
  assert.equal(payload.formatVersion, 2);
  assert.equal(payload.slots[0].slot, 'freeplay');
  assert.equal(payload.slots[0].campaign.playerProfile.displayName, 'Free Play resume');
  assert.equal(payload.slots[0].season.grid.cells.length, 32);
  assert.equal(payload.slots[0].season.grid.cells[0].cropId, 'basil');
  assert.match(download.suggestedFilename(), /freeplay/);
  await writeFile(`${out}/freeplay-save.json`, text);
  // Import the downloaded file through the current confirmation UI.
  const [picker] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#pause-import').click()]);
  await picker.setFiles({ name: 'freeplay.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Replace Free Play', exact: true }).click();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('gos-story-slot-0-campaign')), storyBefore);
  await page.reload();
  await page.locator('[data-mode="freeplay"]').click();
  await page.getByRole('button', { name: 'Continue Free Play', exact: true }).click();
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#hud-pause').waitFor({ state: 'visible' });
  await page.screenshot({ path: `${out}/freeplay-resumed.png` });
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-results.json`, JSON.stringify({ passed: true, checks: ['authority persistence', 'reload and resume', '8x4 bed', 'live version 2 export', 'confirmed import', 'Story slot unchanged', 'resume after import'], pageErrors: errors }, null, 2));
  console.log('PASS: Free Play authority persistence, resume, export/import and Story isolation');
} finally {
  await browser.close();
}

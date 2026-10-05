import { chromium } from 'playwright';
const out = '/workspace/gardenos-quests/shots';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => { localStorage.clear(); });
await page.goto('http://localhost:5181/garden-os/story-mode/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
await page.locator('[data-action="new"][data-slot="0"]').click();
await page.waitForSelector('.title-profile-setup', { state: 'visible' });
await page.locator('.title-profile-setup button[type="submit"]').click();
await page.waitForFunction(() => window.gardenOS?.render_game_to_text, null, { timeout: 60000 });
await page.waitForTimeout(2500);
// dismiss intro dialogue(s)
for (let i = 0; i < 6; i++) {
  const visible = await page.locator('.dp-panel.dp-panel--visible').isVisible().catch(() => false);
  if (!visible) break;
  const skip = page.locator('#dp-skip-btn');
  if (await skip.isVisible().catch(() => false)) await skip.click({ force: true }); else await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
}
console.log('tracker visible', await page.locator('.quest-tracker').isVisible());
await page.screenshot({ path: `${out}/1-play-tracker.png` });
console.log('snapshot', JSON.stringify(await page.evaluate(() => window.gardenOS.quests.getSnapshot())));
await page.evaluate(() => window.gardenOS.quests.talkTo('lila'));
await page.waitForTimeout(400);
async function advanceTo(text) {
  const btn = page.locator('.dp-choice-btn', { hasText: text }).first();
  for (let i = 0; i < 20; i++) {
    if (await btn.isVisible().catch(() => false)) return btn;
    const anyChoice = await page.locator('.dp-choice-btn').count();
    if (!anyChoice) await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  }
  console.log('choices now', JSON.stringify(await page.locator('.dp-choice-btn').allTextContents()));
  return null;
}
const offer = await advanceTo('New request');
console.log('offer button', offer ? await offer.textContent() : null);
await page.screenshot({ path: `${out}/2-talk-lila.png` });
if (offer) { await offer.click(); }
const accept = await advanceTo("I'll do it");
console.log('accept button', Boolean(accept));
if (accept) await accept.click();
for (let i = 0; i < 10; i++) {
  if (!(await page.locator('.dp-panel.dp-panel--visible').isVisible().catch(() => false))) break;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
}
console.log('after accept', JSON.stringify(await page.evaluate(() => window.gardenOS.quests.getSnapshot())));
await page.screenshot({ path: `${out}/3-tracker-active.png` });
await page.keyboard.press('q');
await page.waitForTimeout(400);
console.log('log open', await page.locator('.quest-log').isVisible());
await page.screenshot({ path: `${out}/4-quest-log.png` });
await page.keyboard.press('q');
const buttons = await page.locator('.dp-panel--visible button, .dp-panel--visible [role="button"]').allTextContents();
console.log('dialogue buttons', JSON.stringify(buttons));
await browser.close();
console.log('errors', JSON.stringify(errors.slice(0, 10)));

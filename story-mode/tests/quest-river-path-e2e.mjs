// Browser smoke test (not part of `npm test`): Old Gus's "The River Path" (gus_river_path), the
// quest that gates Riverside, played end to end on a production build WITHOUT pre-completing it.
// The save is seeded only with the quest's own prerequisites (chapter 5, Old Gus reputation 25)
// and Foraging level 2 for the meadow gate on the way to the river. Then, with real inputs only:
// Continue -> walk to the Neighborhood -> talk to Gus and accept -> search behind the big oak
// (finds the Old River Map) -> turn in to Gus -> walk east into the Meadow -> on into Riverside.
// window.render_game_to_text() and window.gardenOS.quests are read for assertions, never written.
// Usage (from story-mode/):
//   npm run build && npx vite preview --port 4175 --host 127.0.0.1
//   GOS_URL=http://127.0.0.1:4175/garden-os/story-mode/ node tests/quest-river-path-e2e.mjs
// Screenshots and results.json go to $GOS_SHOTS (default: <tmpdir>/gos-quest-river-path-e2e).
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const SHOTS = process.env.GOS_SHOTS || join(tmpdir(), 'gos-quest-river-path-e2e');
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.GOS_URL || 'http://127.0.0.1:4175/garden-os/story-mode/';
const pageErrors = [];
async function launch(vp) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: vp });
  // Record every toast shown (they fade quickly) so rewards can be reported exactly.
  await ctx.addInitScript(() => {
    window.__toasts = [];
    new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) { if (n.nodeType === 1 && n.parentElement?.id === 'toast-container') window.__toasts.push(n.innerText?.trim()); } })
      .observe(document, { childList: true, subtree: true });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { pageErrors.push(e.message); console.log('PAGEERR', e.message); });
  p.on('console', (m) => { if (m.type() === 'error') { pageErrors.push(m.text()); console.log('CONSOLE', m.text()); } });
  return { b, p };
}
const st = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
async function pos(p) { const s = await st(p); return { ...s.player.position, zone: s.currentZone }; }
const dialog = (p) => p.evaluate(() => ({
  visible: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'),
  speaker: document.querySelector('#dp-panel')?.dataset.speaker,
  text: document.querySelector('#dp-text')?.textContent?.trim(),
  choices: [...document.querySelectorAll('#dp-choice-row .dp-choice-btn')].map((b) => b.textContent.trim()),
}));
// Per-axis pulse walker: ~0.9 m per 400 ms pulse at 480x320 headless; feedback after each pulse.
const K = 0.9 / 400;
async function pulse(p, key, ms) { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(250); }
async function axisTo(p, axis, target, tol = 0.25) {
  let last = null; let same = 0;
  for (let i = 0; i < 40; i++) {
    const c = await pos(p);
    if (last && c.zone !== last.zone) return { ok: true, at: c, zoneChanged: true };
    const delta = target - c[axis];
    if (Math.abs(delta) <= tol) return { ok: true, at: c };
    if (last && Math.abs(c[axis] - last[axis]) < 0.01) { if (++same >= 3) return { ok: false, blocked: true, at: c }; } else same = 0;
    last = c;
    const key = axis === 'z' ? (delta < 0 ? 'w' : 's') : (delta > 0 ? 'd' : 'a');
    await pulse(p, key, Math.round(Math.min(500, Math.max(40, Math.abs(delta) / K * 0.85))));
  }
  return { ok: false, at: await pos(p) };
}
async function goTo(p, x, z, { order = 'xz', tol = 0.25 } = {}) {
  for (const axis of order) { const r = await axisTo(p, axis, axis === 'x' ? x : z, tol); if (!r.ok || r.zoneChanged) return { ...r, target: [x, z] }; }
  return { ok: true, at: await pos(p) };
}
async function pulseUntilZone(p, key, zone, max = 20) {
  for (let i = 0; i < max; i++) { const c = await pos(p); if (c.zone === zone) return { ok: true, at: c }; await pulse(p, key, 300); }
  const c = await pos(p); return { ok: c.zone === zone, at: c };
}
const hudText = (p) => p.evaluate(() => ({
  tracker: document.querySelector('.quest-tracker')?.innerText?.replace(/\s+\n/g, '\n').trim() ?? null,
  log: document.querySelector('#quest-log-panel')?.innerText?.trim() ?? null,
  toasts: [...document.querySelectorAll('#toast-container > *')].map((t) => t.innerText.trim()).filter(Boolean),
}));
async function openLogText(p) {
  if (!(await p.locator('#quest-log-panel').count())) { await p.keyboard.press('q'); await p.waitForTimeout(900); }
  const t = await hudText(p);
  return t;
}
async function closeLog(p) { if (await p.locator('#quest-log-panel').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(600); } }
const SMALL = { width: 480, height: 320 }; // swiftshader: small viewport keeps the frame rate usable for walking
const BIG = { width: 1280, height: 800 };
const { b, p } = await launch(SMALL);
const results = []; const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
async function shot(name) { await p.setViewportSize(BIG); await p.waitForTimeout(1800); await p.screenshot({ path: `${SHOTS}/${name}.png` }); await p.setViewportSize(SMALL); await p.waitForTimeout(600); }
async function step(name, fn) {
  let ok = false, detail = null;
  try { detail = await fn(); ok = detail?.ok !== false; } catch (e) { detail = { error: e.message.split('\n')[0] }; }
  results.push({ step: name, pass: ok, detail }); log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(detail)?.slice(0, 300));
  writeFileSync(`${SHOTS}/results.json`, JSON.stringify(results, null, 2));
  if (!ok) { await shot(`FAIL-${name.replace(/\W+/g, '-')}`); throw new Error(`step failed: ${name}`); }
}
const snap = () => p.evaluate(() => window.gardenOS.quests.getSnapshot());
async function waitChoices(timeout = 15000) { const t = Date.now(); while (Date.now() - t < timeout) { const d = await dialog(p); if (d.choices.length || !d.visible) return d; await p.waitForTimeout(400); } return dialog(p); }
async function pick(re) { const d = await waitChoices(); const btn = p.locator('#dp-choice-row .dp-choice-btn').filter({ hasText: re }); if (!(await btn.count())) return { picked: null, choices: d.choices }; const label = (await btn.first().textContent()).trim(); await btn.first().click(); await p.waitForTimeout(800); return { picked: label }; }
async function closeDialog() { for (let i = 0; i < 8; i++) { const d = await waitChoices(6000); if (!d.visible) return; if (d.choices.length) await p.locator('#dp-choice-row .dp-choice-btn').last().click(); else await p.keyboard.press('Space'); await p.waitForTimeout(900); } }

const QUEST = 'gus_river_path';
// Fixture: a story campaign at the quest's prerequisites. Nothing about the quest itself is seeded.
function seededCampaign() {
  const skill = (level, xp) => ({ level, xp });
  return {
    version: 8,
    sandbox: false,
    gameMode: 'story',
    currentChapter: 5,
    currentSeason: 'spring',
    updatedAt: new Date().toISOString(),
    questLog: {},
    choiceLog: {},
    storyLog: [],
    reputation: { old_gus: 25, maya: 0, lila: 0 },
    zoneReputation: {},
    activeFestival: null,
    skills: {
      gardening: skill(1, 0), soil_science: skill(1, 0), crafting: skill(1, 0),
      foraging: skill(2, 100), tool_use: skill(1, 0), social: skill(1, 0),
    },
    worldState: { currentZone: 'player_plot', visitedZones: ['player_plot'], lastSpawnPoint: null, forageState: { cooldowns: {}, history: {} } },
    currency: { balance: 100, ledger: [] },
    market: { seed: 'garden-os-market', priceHistory: [], transactions: [] },
    contentPacks: { loaded: [], rejected: [] },
    contentProvenance: [],
    beds: {},
    activeBedId: 'player_plot',
    biomeCropsUnlocked: [],
  };
}
const quest = async () => { const s = await snap(); const q = s.active.find((x) => x.id === QUEST); return { state: q?.state ?? (s.completed.includes(QUEST) ? 'COMPLETED' : 'none'), progress: q?.progress ?? null, available: s.available.includes(QUEST) }; };
async function skipCutscene() { for (let i = 0; i < 4; i++) { const sk = p.locator('#dp-skip-btn'); if ((await dialog(p)).visible && await sk.isVisible().catch(() => false)) { await sk.click(); await p.waitForTimeout(1200); } else return; } }
async function pressE() { const hl = (await st(p)).highlightedInteraction?.label ?? null; await p.keyboard.press('e'); await p.waitForTimeout(1500); return hl; }
// Gus's neighborhood slot is (-3, 4), just east of house_west; stand at (-1.9, 4).
// Walking is feedback-driven and can stop a little short under load, so after the walk, take
// short steps toward the target until the interaction prompt for it is highlighted.
async function ensureHighlight(re, x, z) {
  for (let i = 0; i < 6; i++) {
    const s = await st(p);
    if (re.test(s.highlightedInteraction?.label ?? '')) return s.player.position;
    await goTo(p, x, z, { order: i % 2 ? 'zx' : 'xz', tol: 0.12 });
    await p.waitForTimeout(400);
  }
  return (await st(p)).player.position;
}
async function toGus() { await goTo(p, 0.0, 4.0, { order: 'zx' }); const r = await goTo(p, -2.1, 4.0, { order: 'xz', tol: 0.2 }); await ensureHighlight(/Gus/, -2.1, 4.0); return { ...r, at: await pos(p) }; }
// The big oak is the tree at (6, -2); its hollow (quest site big_oak_hollow) is at (7.0, -1.2).
async function toOak() { await goTo(p, 7.0, 4.0, { order: 'xz' }); const r = await goTo(p, 7.0, -1.2, { order: 'z', tol: 0.2 }); await ensureHighlight(/big oak/i, 7.0, -1.2); return { ...r, at: await pos(p) }; }

try {
  await step('0. Seeded save: chapter 5, Gus rep 25, river path not done; Continue', async () => {
    await p.context().addInitScript((campaign) => {
      if (localStorage.getItem('gos-river-e2e-seeded')) return;
      localStorage.clear();
      localStorage.setItem('gos-story-active-slot', '0');
      localStorage.setItem('gos-story-slot-0-campaign', JSON.stringify(campaign));
      localStorage.setItem('gos-river-e2e-seeded', '1');
    }, seededCampaign());
    await p.goto(URL); await p.waitForTimeout(1500);
    await p.locator('[data-action="continue"][data-slot="0"]').click();
    await p.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 30000 }); await p.waitForTimeout(2500);
    await skipCutscene();
    const s = await st(p); const q = await quest();
    await shot('00-continued');
    return { ok: s.currentZone === 'player_plot' && q.state === 'none' && q.available, chapter: s.chapter ?? s.currentChapter, season: s.season, zone: s.currentZone, quest: q };
  });

  await step('1. Walk to the Neighborhood', async () => {
    await goTo(p, 3.0, 2.2); await goTo(p, 3.0, -4.5, { order: 'z' }); await goTo(p, 0.8, -7.4);
    const r = await pulseUntilZone(p, 'w', 'neighborhood'); await p.waitForTimeout(2000);
    await shot('01-neighborhood');
    return { ok: r.at.zone === 'neighborhood', at: r.at };
  });

  await step('2. Talk to Gus and accept The River Path', async () => {
    const near = await toGus();
    const prompt = await pressE();
    const greet = await waitChoices();
    await shot('02a-gus-greeting');
    const a = await pick(/New request: .*River/i);
    const offer = await waitChoices();
    await shot('02b-gus-offer');
    const c = await pick(/I'll do it/);
    await closeDialog();
    const q = await quest();
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    const hud = await hudText(p);
    await p.screenshot({ path: `${SHOTS}/02c-accepted-tracker.png` });
    await p.setViewportSize(SMALL); await p.waitForTimeout(600);
    return { ok: !!a.picked && !!c.picked && ['ACCEPTED', 'IN_PROGRESS'].includes(q.state), prompt, greet, a, offer, quest: q, tracker: hud.tracker, at: near.at };
  });

  await step('3. Search behind the big oak and find the Old River Map', async () => {
    const near = await toOak();
    const prompt = await pressE();
    const found = await dialog(p);
    await shot('03a-oak-search');
    await closeDialog();
    const q = await quest();
    const s = await st(p);
    await p.setViewportSize(BIG); await p.waitForTimeout(1500);
    const hud = await hudText(p);
    await p.screenshot({ path: `${SHOTS}/03b-map-found-tracker.png` });
    await p.setViewportSize(SMALL); await p.waitForTimeout(600);
    return { ok: q.state === 'READY_TO_TURN_IN', prompt, found, quest: q, tracker: hud.tracker, toasts: await p.evaluate(() => window.__toasts.slice(-4)), at: near.at, zone: s.currentZone };
  });

  await step('4. Return to Gus and turn in', async () => {
    await goTo(p, 7.0, 4.0, { order: 'z' });
    const near = await toGus();
    const mark = await p.evaluate(() => window.__toasts.length);
    const prompt = await pressE();
    const ready = await waitChoices();
    const t = await pick(/Turn in: .*River/i);
    const outcome = await waitChoices();
    await shot('04a-turn-in');
    // Pick the first outcome choice if the quest offers one, then close.
    if (outcome.choices.length) await p.locator('#dp-choice-row .dp-choice-btn').first().click();
    await p.waitForTimeout(900);
    await closeDialog();
    const q = await quest();
    const toasts = await p.evaluate((m) => window.__toasts.slice(m), mark);
    await shot('04b-turned-in');
    return { ok: q.state === 'COMPLETED', prompt, ready, t, outcome, quest: q, toasts, at: near.at };
  });

  await step('5. Walk east into the Meadow, then on to Riverside', async () => {
    await goTo(p, 7.0, 4.0, { order: 'xz' }); await goTo(p, 7.0, 1.4, { order: 'z' });
    const m = await pulseUntilZone(p, 'd', 'meadow', 12); await p.waitForTimeout(2500);
    await shot('05a-meadow');
    if (m.at.zone !== 'meadow') return { ok: false, meadow: m.at };
    await goTo(p, m.at.x, 0, { order: 'z' }); await goTo(p, 8.6, 0, { order: 'x' });
    const r = await pulseUntilZone(p, 'd', 'riverside', 12); await p.waitForTimeout(2500);
    await shot('05b-riverside');
    const s = await st(p);
    return { ok: s.currentZone === 'riverside', meadow: m.at, riverside: r.at, visited: s.visitedZones ?? null };
  });
  log('ALL PASS', `total ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} catch (e) {
  log('STOPPED', e.message);
  process.exitCode = 1;
} finally {
  writeFileSync(`${SHOTS}/results.json`, JSON.stringify(results, null, 2));
  writeFileSync(`${SHOTS}/page-errors.json`, JSON.stringify(pageErrors, null, 2));
  if (pageErrors.length) log('page errors:', pageErrors.length);
  await b.close();
}

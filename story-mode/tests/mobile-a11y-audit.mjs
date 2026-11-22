// Mobile accessibility audit (manual, not a CI gate).
// Walks title -> gardener setup (top + scrolled) -> story dialogue -> quest
// card/log -> Free Play yard -> bug report -> village -> shop -> pause -> world
// map (+ phone landscape) at phone, phone-landscape and iPad sizes,
// running axe-core (WCAG 2.x A/AA + best-practice) plus a 44px tap-target,
// font-size and off-screen-control probe and a keyboard/focus check.
//
//   npm run dev -- --port 5311 &
//   GOS_URL=http://localhost:5311/garden-os/story-mode/ GOS_OUT=/tmp/a11y npm run a11y:mobile
//
// QUICK=1 stops after the title, setup, yard and bug-report states (no story
// dialogue, village, shop or map). VPS=390x844,360x800 picks the sizes.
// Every state also records `overlaps`: visible controls that sit under the
// theme toggle (floating pill on main, #title-theme after the follow-up);
// it must cover nothing.
//
// Writes <GOS_OUT>/<LABEL>-<viewport>-<state>.png and report-<LABEL>.json.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL = process.env.GOS_URL || 'http://localhost:5173/garden-os/story-mode/';
const LABEL = process.env.LABEL || 'audit';
const OUT = process.env.GOS_OUT || process.env.OUT || 'mobile-a11y-audit';
mkdirSync(OUT, { recursive: true });
// Phone landscape sizes (844x390, 740x360) run every state in landscape;
// a phone counts by its short side, so they get isMobile + touch too.
const VPS = (process.env.VPS || '390x844,360x800,844x390,740x360,1024x706').split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { width: w, height: h, tag: s, phone: Math.min(w, h) < 600, landscape: w > h }; });
const report = { states: {}, errors: [], keyboard: {} };
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const probe = () => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return null; if (el.closest('[inert],[aria-hidden="true"]')) return null; if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return null; return r; };
  const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ` "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`;
  const small = [];
  for (const el of document.querySelectorAll('button, a[href], [role="button"], input:not([type=hidden]), select, summary, [tabindex]:not([tabindex="-1"])')) {
    if (el.disabled) continue; const r = vis(el); if (!r) continue;
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const tiny = []; const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const t = walker.currentNode; if (!t.textContent.trim()) continue; const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el); const r = vis(el); if (!r) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 14 - 0.01) tiny.push(`${name(el)} ${fs}px`); }
  const offscreen = [];
  for (const sel of ['#hud-pause', '#hud-action', '#fab-plant', '#fab-backpack', '#fab-advance', '#village-back', '#village-map', '.quest-tracker [data-quest-log-toggle]']) { const el = document.querySelector(sel); if (!el) continue; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (cs.display === 'none' || el.closest('[inert]')) continue; if (r.width && (r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5)) offscreen.push(`${sel} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`); }
  const overlaps = [];
  const toggle = document.querySelector('[data-garden-theme-toggle]');
  let tr = toggle && vis(toggle);
  // A toggle under an open sheet (e.g. the setup dialog) covers nothing.
  if (tr) { const hit = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2); if (!hit || !toggle.contains(hit)) tr = null; }
  if (tr) {
    for (const el of document.querySelectorAll('button, a[href], [role="button"], input:not([type=hidden]), select, textarea, label.profile-choice')) {
      if (el === toggle || toggle.contains(el)) continue; const r = vis(el); if (!r) continue;
      if (r.left < tr.right - 1 && r.right > tr.left + 1 && r.top < tr.bottom - 1 && r.bottom > tr.top + 1) overlaps.push(name(el));
    }
  }
  const themeToggle = tr ? { x: Math.round(tr.left), y: Math.round(tr.top), w: Math.round(tr.width), h: Math.round(tr.height) } : null;
  const pauseEl = document.querySelector('#hud-pause');
  const pcs = pauseEl && getComputedStyle(pauseEl);
  // Computed size, so it is recorded even while the HUD is hidden (title/setup).
  const pauseBtn = pcs ? `${parseFloat(pcs.width)}x${parseFloat(pcs.height)}` : null;
  const meta = document.querySelector('meta[name=viewport]')?.content;
  // ☰ must take its own taps (in phone landscape the Move stick used to sit on it).
  const pr = pauseEl && vis(pauseEl);
  const pauseHit = pr ? Boolean(pauseEl.contains(document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2))) : null;
  return { small, overlaps, themeToggle, pauseBtn, pauseHit, tinyCount: tiny.length, tiny: tiny.slice(0, 60), under12: tiny.filter((t) => parseFloat(t.split(" ").at(-1)) < 12 - 0.01).length, offscreen, meta };
};

async function capture(p, vp, name) {
  const key = `${vp.tag}-${name}`;
  const path = `${OUT}/${LABEL}-${key}.png`;
  await p.screenshot({ path }).catch((e) => report.errors.push(`${key} shot ${e.message}`));
  let axe = null;
  try {
    const res = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).exclude('#viewport canvas').analyze();
    const byImpact = {}; for (const v of res.violations) byImpact[v.impact] = (byImpact[v.impact] || 0) + v.nodes.length;
    axe = { byImpact, rules: res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, targets: v.nodes.slice(0, 40).map((x) => x.target.join(' ') + (x.any?.[0]?.message ? ' :: ' + x.any[0].message.slice(0, 120) : '')) })) };
  } catch (e) { report.errors.push(`${key} axe ${e.message}`); }
  const pr = await p.evaluate(probe).catch((e) => ({ err: e.message }));
  report.states[key] = { axe, ...pr };
  console.log('state', key, JSON.stringify(axe?.byImpact), 'small', pr.small?.length, 'tiny', pr.tinyCount, 'off', pr.offscreen?.length, 'overlaps', pr.overlaps?.length, 'pause', pr.pauseBtn, 'pauseHit', pr.pauseHit, pr.small?.length ? JSON.stringify(pr.small) : '', pr.overlaps?.length ? JSON.stringify(pr.overlaps) : '');
}

const mkctx = (vp) => b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.phone, hasTouch: true, deviceScaleFactor: vp.phone ? 2 : 1 });
for (const vp of VPS) {
  if (!process.env.SKIP_STORY) {
    const ctx = await mkctx(vp); const p = await ctx.newPage();
    p.on('pageerror', (e) => report.errors.push(`${vp.tag} pageerror ${e.message}`));
    try {
      await p.goto(URL); await p.waitForTimeout(2500);
      await capture(p, vp, '00-title');
      {
        const t = p.locator('[data-garden-theme-toggle]').first();
        const themeOf = () => p.evaluate(() => document.documentElement.dataset.theme);
        const before = await themeOf(); await t.click(); await p.waitForTimeout(300);
        const flipped = await themeOf(); await t.click(); await p.waitForTimeout(300);
        report.theme = report.theme || {};
        report.theme[vp.tag] = { before, flipped, restored: await themeOf(), works: before !== flipped };
      }
      await p.locator('button:has-text("New Game")').first().click(); await p.waitForTimeout(800);
      await p.locator('.title-profile-setup').waitFor({ state: 'visible' }); await p.waitForTimeout(400);
      await capture(p, vp, '11-setup');
      // Scroll every scrollable box in the setup sheet to the end: the lower
      // swatch rows are where a bottom-anchored floating control would sit.
      await p.evaluate(() => { for (const el of [document.scrollingElement, ...document.querySelectorAll('.title-profile-setup, .title-profile-setup *')]) { if (el && el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight; } });
      await p.waitForTimeout(400);
      await capture(p, vp, '12-setup-scrolled');
      if (process.env.QUICK) throw new Error('QUICK');
      await p.locator('button:has-text("Start Story")').click();
      await p.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 120000 });
      await p.waitForFunction(() => { const panel = document.querySelector('#dp-panel'); return panel?.classList.contains('dp-panel--visible') && parseFloat(getComputedStyle(panel).opacity) > 0.99 && (document.querySelector('#dp-text')?.textContent?.trim().length ?? 0) > 20; }, null, { timeout: 90000 }).catch(() => {});
      await p.waitForTimeout(2500);
      await capture(p, vp, '02-dialogue');
      await p.locator('#dp-skip-btn').click(); await p.waitForTimeout(1500);
      await p.evaluate(() => window.gardenOS.quests.talkTo('lila')); await p.waitForTimeout(1200);
      for (let i = 0; i < 10; i++) {
        const d = await p.evaluate(() => ({ visible: document.querySelector('#dp-panel')?.classList.contains('dp-panel--visible'), choices: [...document.querySelectorAll('#dp-choice-row .dp-choice-btn')].map((x) => x.textContent.trim()) }));
        if (!d.visible) break;
        if (d.choices.length) { const want = d.choices.findIndex((c) => /New request|I'll do it/.test(c)); await p.locator('#dp-choice-row .dp-choice-btn').nth(want >= 0 ? want : d.choices.length - 1).click(); }
        else await p.keyboard.press('Space');
        await p.waitForTimeout(900);
      }
      await p.waitForTimeout(1200);
      await capture(p, vp, '03-quest-card');
      await p.locator('.quest-tracker [data-quest-log-toggle]').click().catch(() => {}); await p.waitForTimeout(1000);
      await capture(p, vp, '04-quest-log');
    } catch (e) { if (e.message !== 'QUICK') report.errors.push(`${vp.tag} story ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  {
    const ctx = await mkctx(vp); const p = await ctx.newPage();
    p.on('pageerror', (e) => report.errors.push(`${vp.tag} pageerror ${e.message}`));
    const waitFor = (fn, arg, timeout = 60000) => p.waitForFunction(fn, arg, { timeout, polling: 100 });
    try {
      await p.goto(URL);
      await p.locator('[data-mode="freeplay"]').click();
      await p.getByRole('button', { name: 'Start Free Play', exact: true }).click();
      await waitFor(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'player_plot' && !d.travelling; });
      await p.waitForTimeout(1500);
      await capture(p, vp, '05-yard-hud');
      {
        const box = await p.locator('#hud-pause').boundingBox();
        if (box) await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-05b-pause-button.png`, clip: { x: 0, y: 0, width: Math.min(vp.width, box.x + box.width + 160), height: box.y + box.height + 24 } }).catch(() => {});
        report.states[`${vp.tag}-05-yard-hud`].pauseBox = box && `${Math.round(box.width)}x${Math.round(box.height)}`;
      }
      await p.locator('#fab-bug').click(); await p.locator('#bug-panel').waitFor({ state: 'visible' }); await p.waitForTimeout(600);
      await capture(p, vp, '06-bug-report');
      await p.locator('#bug-cancel').click(); await p.waitForTimeout(500);
      if (process.env.QUICK) throw new Error('QUICK');
      await p.locator('#village-back').click();
      await waitFor(() => { const d = window.gardenOS?.village?.getDebugState?.(); return d && d.zone === 'village' && !d.travelling && d.bound; });
      await p.waitForTimeout(1200);
      await p.evaluate(() => { const c = document.querySelector('#toast-container'); const el = document.createElement('div'); el.className = 'toast-notification toast--success'; el.textContent = 'Bought Leaf Lettuce Seeds.'; c.appendChild(el); requestAnimationFrame(() => el.classList.add('is-visible')); });
      await p.waitForTimeout(600);
      await capture(p, vp, '01-village-hud');
      await p.evaluate(() => document.querySelectorAll('#toast-container > *').forEach((e) => e.remove()));
      const target = await p.evaluate(() => window.gardenOS.village.getInteractables().find((t) => t.id === 'shop_stand'));
      await p.evaluate(([x, z]) => window.gardenOS.village.walkTo(x, z), [target.position.x, target.position.z]);
      await waitFor(() => window.gardenOS.village.getDebugState().activeTrigger === 'shop_stand', null, 90000);
      await p.waitForTimeout(600);
      await p.keyboard.press('e');
      await p.locator('#shop-panel').waitFor({ state: 'visible' }); await p.waitForTimeout(800);
      await capture(p, vp, '07-shop');
      const focusIn = (sel) => p.evaluate((s) => { const m = document.querySelector(s); return Boolean(m && m.contains(document.activeElement)); }, sel);
      const kb = report.keyboard[vp.tag] = {};
      kb.shopFocusOnOpen = await focusIn('#shop-panel');
      for (let i = 0; i < 14; i++) await p.keyboard.press('Tab');
      kb.shopFocusAfter14Tabs = await focusIn('#shop-panel');
      kb.shopEscCloses = await p.keyboard.press('Escape').then(() => p.waitForTimeout(600)).then(() => p.locator('#shop-panel').count().then((n) => n === 0));
      if (!kb.shopEscCloses) { await p.locator('#shop-dismiss').click(); await p.waitForTimeout(600); }
      const pauseOpen = () => p.evaluate(() => document.querySelector('#pause-menu')?.getAttribute('aria-hidden') === 'false');
      // Before the fix, Esc in the shop fell through and opened pause underneath.
      kb.escOpenedPauseUnderShop = await pauseOpen();
      if (!kb.escOpenedPauseUnderShop) { await p.locator('#hud-pause').click().catch(async () => { await p.keyboard.press('Escape'); }); }
      await p.waitForTimeout(1000);
      await capture(p, vp, '08-pause-menu');
      kb.pauseFocusOnOpen = await focusIn('#pause-menu');
      for (let i = 0; i < 25; i++) await p.keyboard.press('Tab');
      kb.pauseFocusAfter25Tabs = await focusIn('#pause-menu');
      await p.locator('#pause-map').click(); await p.waitForTimeout(1500);
      await capture(p, vp, '09-world-map');
      kb.mapFocusOnOpen = await focusIn('#world-map-panel');
      for (let i = 0; i < 12; i++) await p.keyboard.press('Tab');
      kb.mapFocusAfter12Tabs = await focusIn('#world-map-panel');
      if (vp.phone && !vp.landscape) {
        await p.keyboard.press('Escape'); await p.waitForTimeout(800);
        if (await p.locator('#pause-menu.is-open, #pause-menu[aria-hidden="false"]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(800); }
        await p.setViewportSize({ width: vp.height, height: vp.width }); await p.waitForTimeout(2000);
        await capture(p, { ...vp, tag: `${vp.height}x${vp.width}` }, '10-landscape-village');
      }
    } catch (e) { if (e.message === 'QUICK') { await ctx.close(); continue; } report.errors.push(`${vp.tag} freeplay ${e.message.split('\n')[0]}`); await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-ERR.png` }).catch(() => {}); }
    await ctx.close();
  }
}
await b.close();
const totals = {}; for (const s of Object.values(report.states)) for (const [k, v] of Object.entries(s.axe?.byImpact || {})) totals[k] = (totals[k] || 0) + v;
report.totals = totals;
writeFileSync(`${OUT}/report-${LABEL}.json`, JSON.stringify(report, null, 2));
console.log('TOTALS', JSON.stringify(totals), 'errors', JSON.stringify(report.errors, null, 1));

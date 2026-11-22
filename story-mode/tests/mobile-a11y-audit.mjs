// Mobile accessibility audit (manual, not a CI gate).
// Walks title -> story dialogue -> quest card/log -> Free Play yard -> village
// -> shop -> pause -> world map (+ phone landscape) at phone and iPad sizes,
// running axe-core (WCAG 2.x A/AA + best-practice) plus a 44px tap-target,
// font-size and off-screen-control probe and a keyboard/focus check.
//
//   npm run dev -- --port 5311 &
//   GOS_URL=http://localhost:5311/garden-os/story-mode/ GOS_OUT=/tmp/a11y npm run a11y:mobile
//
// Writes <GOS_OUT>/<LABEL>-<viewport>-<state>.png and report-<LABEL>.json.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const URL = process.env.GOS_URL || 'http://localhost:5173/garden-os/story-mode/';
const LABEL = process.env.LABEL || 'audit';
const OUT = process.env.GOS_OUT || process.env.OUT || 'mobile-a11y-audit';
mkdirSync(OUT, { recursive: true });
const VPS = (process.env.VPS || '390x844,360x800,1024x706').split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { width: w, height: h, tag: s, phone: w < 600 }; });
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
  const meta = document.querySelector('meta[name=viewport]')?.content;
  return { small, tinyCount: tiny.length, tiny: tiny.slice(0, 60), under12: tiny.filter((t) => parseFloat(t.split(" ").at(-1)) < 12 - 0.01).length, offscreen, meta };
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
  console.log('state', key, JSON.stringify(axe?.byImpact), 'small', pr.small?.length, 'tiny', pr.tinyCount, 'off', pr.offscreen?.length);
}

const mkctx = (vp) => b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.phone, hasTouch: true, deviceScaleFactor: vp.phone ? 2 : 1 });
for (const vp of VPS) {
  if (!process.env.SKIP_STORY) {
    const ctx = await mkctx(vp); const p = await ctx.newPage();
    p.on('pageerror', (e) => report.errors.push(`${vp.tag} pageerror ${e.message}`));
    try {
      await p.goto(URL); await p.waitForTimeout(2500);
      await capture(p, vp, '00-title');
      await p.locator('button:has-text("New Game")').first().click(); await p.waitForTimeout(800);
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
    } catch (e) { report.errors.push(`${vp.tag} story ${e.message.split('\n')[0]}`); }
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
      if (vp.phone) {
        await p.keyboard.press('Escape'); await p.waitForTimeout(800);
        if (await p.locator('#pause-menu.is-open, #pause-menu[aria-hidden="false"]').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(800); }
        await p.setViewportSize({ width: vp.height, height: vp.width }); await p.waitForTimeout(2000);
        await capture(p, { ...vp, tag: `${vp.height}x${vp.width}` }, '10-landscape-village');
      }
    } catch (e) { report.errors.push(`${vp.tag} freeplay ${e.message.split('\n')[0]}`); await p.screenshot({ path: `${OUT}/${LABEL}-${vp.tag}-ERR.png` }).catch(() => {}); }
    await ctx.close();
  }
}
await b.close();
const totals = {}; for (const s of Object.values(report.states)) for (const [k, v] of Object.entries(s.axe?.byImpact || {})) totals[k] = (totals[k] || 0) + v;
report.totals = totals;
writeFileSync(`${OUT}/report-${LABEL}.json`, JSON.stringify(report, null, 2));
console.log('TOTALS', JSON.stringify(totals), 'errors', JSON.stringify(report.errors, null, 1));

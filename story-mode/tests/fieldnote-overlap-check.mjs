// Field Note / Skip vs dialogue-text layout check.
// Opens Chapter 1 Story Mode and asserts that the FIELD NOTE stamp and the
// Skip button never cover #dp-text, and that a visible Start Season button
// (#fab-advance) is not tucked under the card (and is tappable when enabled).
//
//   npx vite --port 5391 --strictPort --host 127.0.0.1 &
//   GOS_URL=http://127.0.0.1:5391/garden-os/story-mode/ GOS_OUT=../shots LABEL=after \
//     node tests/fieldnote-overlap-check.mjs
//
// Env: VPS=768x1024,820x1180,715x1024,390x844,844x390,320x568,1280x800
//      LABEL=after  NO_FAIL=1 (report only)  GOS_OUT=...
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GOS_URL || 'http://127.0.0.1:5391/garden-os/story-mode/';
const OUT = process.env.GOS_OUT || '';
const LABEL = process.env.LABEL || 'check';
const NO_FAIL = process.env.NO_FAIL === '1';
if (OUT) mkdirSync(OUT, { recursive: true });

const DEFAULT_VPS = '768x1024,820x1180,715x1024,390x844,844x390,320x568,1280x800';
const VPS = (process.env.VPS || DEFAULT_VPS).split(',').map((s) => {
  const [width, height] = s.split('x').map(Number);
  const phone = Math.min(width, height) < 600;
  const desktop = width >= 1100 && height >= 700;
  return {
    tag: s,
    width,
    height,
    phone,
    desktop,
    hasTouch: !desktop,
    isMobile: phone,
    dpr: desktop ? 1 : phone ? 3 : 2,
  };
});

const measure = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return null;
    return {
      left: r.left, top: r.top, right: r.right, bottom: r.bottom,
      width: r.width, height: r.height,
    };
  };
  const overlaps = (a, b) => Boolean(
    a && b
    && a.left < b.right - 0.5
    && a.right > b.left + 0.5
    && a.top < b.bottom - 0.5
    && a.bottom > b.top + 0.5,
  );
  const panel = document.querySelector('#dp-panel');
  const text = document.querySelector('#dp-text');
  const skip = document.querySelector('#dp-skip-btn');
  const note = document.querySelector('.dp-field-note');
  const fab = document.querySelector('#fab-advance');
  let noteBox = box(note);
  if (!noteBox && panel) {
    const before = getComputedStyle(panel, '::before');
    const content = before?.content?.replace(/^["']|["']$/g, '');
    if (content && content !== 'none' && content !== '') {
      const top = Number.parseFloat(before.top) || 0;
      const right = Number.parseFloat(before.right) || 0;
      const fontSize = Number.parseFloat(before.fontSize) || 9;
      const padX = (Number.parseFloat(before.paddingLeft) || 0) + (Number.parseFloat(before.paddingRight) || 0);
      const padY = (Number.parseFloat(before.paddingTop) || 0) + (Number.parseFloat(before.paddingBottom) || 0);
      const letter = Number.parseFloat(before.letterSpacing) || 0;
      const width = content.length * fontSize * 0.62 + letter * Math.max(content.length - 1, 0) + padX;
      const height = fontSize + padY + 2;
      const pr = panel.getBoundingClientRect();
      const left = pr.right - right - width;
      const t = pr.top + top;
      noteBox = { left, top: t, right: left + width, bottom: t + height, width, height, estimated: true };
    }
  }
  const textBox = box(text);
  const skipBox = skip && getComputedStyle(skip).display !== 'none' ? box(skip) : null;
  const panelBox = box(panel);
  const fabBox = box(fab);
  let fabHit = null;
  if (fabBox && fab && !fab.disabled && getComputedStyle(fab).pointerEvents !== 'none') {
    const el = document.elementFromPoint(fabBox.left + fabBox.width / 2, fabBox.top + fabBox.height / 2);
    fabHit = Boolean(el && fab.contains(el));
  }
  return {
    text: textBox,
    skip: skipBox,
    note: noteBox,
    panel: panelBox,
    fab: fabBox,
    fabDisabled: Boolean(fab?.disabled),
    fabVisibleClass: Boolean(fab?.classList.contains('is-visible')),
    fabHit,
    dialogue: text?.textContent?.trim() ?? '',
    speaker: document.querySelector('#dp-speaker-badge')?.textContent?.trim() ?? '',
    noteVsText: overlaps(noteBox, textBox),
    skipVsText: overlaps(skipBox, textBox),
    fabVsPanel: overlaps(fabBox, panelBox),
  };
};

async function openStory(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#title-screen', { state: 'visible', timeout: 60000 });
  const newGame = page.locator('button:has-text("New Game")').first();
  await newGame.waitFor({ state: 'visible', timeout: 30000 });
  await newGame.click();
  const start = page.locator('button:has-text("Start Story")');
  await start.waitFor({ state: 'visible', timeout: 30000 });
  await start.click();
  await page.waitForFunction(() => document.body.dataset.storyScreen === 'play', null, { timeout: 120000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('#dp-panel');
    return panel?.classList.contains('dp-panel--visible')
      && parseFloat(getComputedStyle(panel).opacity) > 0.99
      && (document.querySelector('#dp-text')?.textContent?.trim().length ?? 0) > 20;
  }, null, { timeout: 90000 });
  await page.waitForTimeout(600);
}

function failuresFor(tag, layout) {
  const fails = [];
  if (!layout.text) fails.push(`${tag}: dialogue text is not visible`);
  if (layout.noteVsText) fails.push(`${tag}: Field Note label overlaps the dialogue text`);
  if (layout.skipVsText) fails.push(`${tag}: Skip button overlaps the dialogue text`);
  if (layout.fab && layout.fabVsPanel) fails.push(`${tag}: Start Season is tucked under the Field Note card`);
  if (layout.fab && layout.fabHit === false) fails.push(`${tag}: Start Season is visible and enabled but not tappable (hit-test missed)`);
  return fails;
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const report = { results: [], failures: [] };
const touchVps = VPS.filter((vp) => vp.hasTouch);
const deskVps = VPS.filter((vp) => !vp.hasTouch);

async function runGroup(list, hasTouch) {
  if (!list.length) return;
  const first = list[0];
  const ctx = await browser.newContext({
    viewport: { width: first.width, height: first.height },
    isMobile: first.isMobile,
    hasTouch,
    deviceScaleFactor: first.dpr,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.failures.push(`pageerror ${e.message.split('\n')[0]}`));
  await openStory(page);
  for (const [index, vp] of list.entries()) {
    if (index > 0) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);
    }
    if (OUT) {
      await page.screenshot({ path: join(OUT, `${LABEL}-${vp.tag}.png`), fullPage: false });
    }
    const layout = await page.evaluate(measure);
    const fails = failuresFor(vp.tag, layout);
    report.results.push({ tag: vp.tag, fails, layout });
    report.failures.push(...fails);
    console.log(JSON.stringify({ tag: vp.tag, fails, noteVsText: layout.noteVsText, skipVsText: layout.skipVsText, fabVsPanel: layout.fabVsPanel, fabHit: layout.fabHit, fab: layout.fab, note: layout.note, skip: layout.skip, text: layout.text, speaker: layout.speaker, dialogue: layout.dialogue }));
  }
  await ctx.close();
}

try {
  await runGroup(touchVps, true);
  await runGroup(deskVps, false);
} finally {
  await browser.close();
}

if (OUT) writeFileSync(join(OUT, `${LABEL}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.failures.length === 0, failureCount: report.failures.length, failures: report.failures }, null, 2));
if (report.failures.length && !NO_FAIL) process.exit(1);

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const SIM_KEY = 'garden_os_v4_state';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkPlanner(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${BASE_URL}/garden-planner-v4.html`, { waitUntil: 'networkidle' });
  await page.click('#autoFillBtn');
  await page.waitForTimeout(250);

  const result = await page.evaluate(() => {
    const reasoningTitle = document.querySelector('#rpane-reasoning .ichdr')?.textContent?.trim() || '';
    const issueSummary = document.getElementById('issueSummaryStrip')?.textContent?.trim() || '';
    const reasoningText = document.getElementById('rpane-reasoning')?.textContent?.trim() || '';
    return { reasoningTitle, issueSummary, reasoningText };
  });

  assert(result.reasoningTitle === 'Reasoning surface', 'Planner reasoning surface title missing');
  assert(result.issueSummary.length > 0, 'Planner issue summary strip is empty');
  assert(/Score direction|Top risk|Next move/.test(result.reasoningText), 'Planner reasoning surface is incomplete');

  await page.close();
  return result;
}

async function checkLegacyReviewMigration(browser, chapter, expectedPhase) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`${BASE_URL}/garden-league-simulator-v4.html`, { waitUntil: 'networkidle' });
  await page.evaluate(({ key, ch }) => {
    const state = window.gardenOS.getState();
    state.chapter = ch;
    state.phase = 'REVIEW';
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: SIM_KEY, ch: chapter });
  await page.reload({ waitUntil: 'networkidle' });

  const result = await page.evaluate(({ key }) => {
    const runtimePhase = window.gardenOS.getState()?.phase || null;
    const storedPhase = JSON.parse(localStorage.getItem(key) || 'null')?.phase || null;
    return { runtimePhase, storedPhase };
  }, { key: SIM_KEY });

  assert(result.runtimePhase === expectedPhase, `Runtime phase mismatch for chapter ${chapter}: expected ${expectedPhase}, got ${result.runtimePhase}`);
  assert(result.storedPhase === expectedPhase, `Stored phase mismatch for chapter ${chapter}: expected ${expectedPhase}, got ${result.storedPhase}`);

  await page.close();
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const planner = await checkPlanner(browser);
    const harvestReview = await checkLegacyReviewMigration(browser, 3, 'HARVEST_REVIEW');
    const winterReview = await checkLegacyReviewMigration(browser, 4, 'WINTER_REVIEW');
    const output = {
      baseUrl: BASE_URL,
      planner,
      chapter3: harvestReview,
      chapter4: winterReview
    };
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});

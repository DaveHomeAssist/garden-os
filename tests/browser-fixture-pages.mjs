import { pathToFileURL } from 'node:url';
import { chromiumLaunchOptions } from './playwright-launch-options.mjs';

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : 'playwright';
const { chromium } = await import(playwrightSpecifier);

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

const pages = [
  {
    path: '/tests/crop_reconciliation_tests.html',
    name: 'crop reconciliation fixture tests',
    readResult: async (page) => {
      await page.waitForFunction(() => window.__TEST_RESULTS__?.total > 0, null, { timeout: 30000 });
      return page.evaluate(() => window.__TEST_RESULTS__);
    },
  },
  {
    path: '/tests/today.test.html',
    name: 'today engine fixture tests',
    readResult: readSummaryResult,
  },
  {
    path: '/tests/weather.test.html',
    name: 'weather module fixture tests',
    readResult: readSummaryResult,
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readSummaryResult(page) {
  await page.waitForFunction(() => {
    const summary = document.getElementById('summary');
    return summary && /failed/i.test(summary.textContent || '');
  }, null, { timeout: 30000 });

  const summary = await page.locator('#summary').innerText();
  const match = summary.match(/(\d+)\s+passed,\s+(\d+)\s+failed/i);
  assert(match, `Unexpected summary text: ${summary}`);
  return {
    total: Number(match[1]) + Number(match[2]),
    pass: Number(match[1]),
    fail: Number(match[2]),
    skip: 0,
  };
}

const browser = await chromium.launch(chromiumLaunchOptions({ headless: process.env.HEADLESS !== '0' }));
const failures = [];

try {
  for (const fixturePage of pages) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`);
    });

    await page.goto(`${BASE_URL}${fixturePage.path}`, { waitUntil: 'networkidle' });
    const result = await fixturePage.readResult(page);
    await page.close();

    if (pageErrors.length || result.fail > 0) {
      failures.push(`${fixturePage.name}: ${result.pass}/${result.total} passed; ${pageErrors.join('; ')}`);
      continue;
    }

    console.log(`${fixturePage.name}: ${result.pass}/${result.total} passed`);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

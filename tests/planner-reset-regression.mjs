import { pathToFileURL } from "node:url";
import { chromiumLaunchOptions } from "./playwright-launch-options.mjs";

const playwrightSpecifier = process.env.PLAYWRIGHT_IMPORT_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_IMPORT_PATH).href
  : "playwright";
const { chromium } = await import(playwrightSpecifier);

const defaultUrl = "http://127.0.0.1:4173/garden-planner-v4.html";
const url = process.env.PLANNER_URL || process.argv[2] || defaultUrl;

async function run() {
  const browser = await chromium.launch(chromiumLaunchOptions({ headless: true }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];

  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  await page.goto(url, { waitUntil: "networkidle" });

  const before = await page.evaluate(() => ({
    bedW: document.getElementById("bedW")?.value,
    bedH: document.getElementById("bedH")?.value,
  }));

  await page.click("#openManagePanel");
  await page.click("#menuResetBed");
  await page.waitForTimeout(250);

  const after = await page.evaluate(() => ({
    bedW: document.getElementById("bedW")?.value,
    bedH: document.getElementById("bedH")?.value,
    cellCount: document.querySelectorAll(".bc[data-cell-id]").length,
  }));

  await browser.close();

  if (errors.length) {
    throw new Error(`Browser errors detected:\n${errors.join("\n")}`);
  }

  if (before.bedW !== "8" || before.bedH !== "4") {
    throw new Error(`Unexpected starting bed size: ${before.bedW}x${before.bedH}`);
  }

  if (after.bedW !== "4" || after.bedH !== "8") {
    throw new Error(`Reset did not restore 4x8: ${after.bedW}x${after.bedH}`);
  }

  if (after.cellCount !== 32) {
    throw new Error(`Unexpected grid cell count after reset: ${after.cellCount}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        before,
        after,
      },
      null,
      2,
    ),
  );
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

// Live-site smoke test for the five Garden OS user-track pages.
// Runs via Playwright through the CCR agent proxy, trusting the proxy's
// CA certs by SPKI hash rather than disabling TLS verification broadly.
//
// Usage: node scripts/smoke-live.cjs
// Exit 0 = all pages 200, no console errors. Exit 1 = any failure.
//
// Requires: playwright installed globally at /opt/node22 (pre-installed in
// CCR remote execution environments). Chromium binary at /opt/pw-browsers/chromium.

const { chromium } = require('playwright');

const BASE = 'https://davehomeassist.github.io/garden-os';
const PAGES = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'how-it-thinks-v5.html',
];

// SPKI hashes for Anthropic CCR proxy CA certs (from /root/.ccr/ca-bundle.crt).
// Targets trust to these known Anthropic CAs only -- not a broad TLS bypass.
// Refresh this list if proxy CA rotation produces new SPKI hashes.
const PROXY_SPKI = [
  'KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=', // CCR Upstream Proxy CA staging
  'PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0=', // CCR agent-proxy interception CA production 2026-08
  'gBdItbWylHhTkoJDRwIiMuweY/qX4F0bJmLNs5wosUQ=', // sandbox-egress-gateway-production
  '4FUmu5xjLNSCwT6mnoJy7LpsouczK4qrlGg3VquK6ZE=', // sandbox-egress-gateway-staging
  'L+/CZomxifpzjiAVG11S0bTbaTopj+c49s0rBjjSC6A=', // sandbox-egress-production TLS Inspection
  '0KMCVL0z7YGtHqARRnTAzBN88j1iAyUWpWormDdohIY=', // sandbox-egress-staging TLS Inspection
];

const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:41599';
const CHROMIUM = process.env.CHROMIUM_EXECUTABLE || '/opt/pw-browsers/chromium';

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: [
      '--proxy-server=' + PROXY,
      '--ignore-certificate-errors-spki-list=' + PROXY_SPKI.join(','),
      '--no-sandbox',
    ],
  });

  const results = [];
  for (const page of PAGES) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    p.on('pageerror', err => errors.push(err.message));
    let status = 0;
    try {
      const resp = await p.goto(BASE + '/' + page, { waitUntil: 'networkidle', timeout: 25000 });
      status = resp ? resp.status() : 0;
      await p.waitForTimeout(1500);
    } catch (e) {
      errors.push('LOAD_ERROR: ' + e.message);
    }
    results.push({ page, status, errors });
    await ctx.close();
  }
  await browser.close();

  let allPass = true;
  for (const r of results) {
    const pass = r.status === 200 && r.errors.length === 0;
    if (!pass) allPass = false;
    console.log((pass ? 'PASS' : 'FAIL') + ' ' + r.page + ' status=' + r.status + ' errors=' + r.errors.length);
    if (r.errors.length) r.errors.slice(0, 3).forEach(e => console.log('  ERR: ' + e));
  }
  process.exit(allPass ? 0 : 1);
})().catch(e => {
  console.error('FATAL: ' + e.message);
  process.exit(1);
});

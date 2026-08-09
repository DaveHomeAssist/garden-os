import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = new URL('../', import.meta.url);
const fixtureDir = await mkdtemp(join(tmpdir(), 'garden-os-black-shot-'));
const manifestPath = join(fixtureDir, 'manifest.json');
const blackPngPath = join(fixtureDir, 'black.png');

// Valid 1x1 opaque black PNG. It satisfies file/dimension checks but must fail
// the decoded visual-content gate.
await writeFile(
  blackPngPath,
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
);
await writeFile(manifestPath, JSON.stringify({
  storeShotCount: 0,
  budgets: { defaultMaxBytes: 100000, totalMaxBytes: 100000 },
  shots: [{
    id: 'black-fixture',
    file: 'black.png',
    caption: 'Black fixture',
    trailerBeat: 'regression',
    mustReadAs: 'must be rejected',
    minWidth: 1,
    minHeight: 1,
  }],
}));

const result = spawnSync(
  process.execPath,
  ['scripts/verify-story-mode-marketing-shots.mjs', fixtureDir],
  {
    cwd: repoRoot,
    env: { ...process.env, GOS_MARKETING_SHOT_MANIFEST: manifestPath },
    encoding: 'utf8',
  },
);

assert.notEqual(result.status, 0, 'an opaque black screenshot must fail the visual-content gate');
assert.match(
  `${result.stdout}\n${result.stderr}`,
  /visually blank|almost entirely black frame|too little visual content/,
  'failure should identify missing visual content',
);

console.log(JSON.stringify({ ok: true, rejected: 'opaque black PNG' }, null, 2));

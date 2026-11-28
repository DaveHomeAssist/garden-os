#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const storyModeDir = `${repoRoot}story-mode`;

// On Windows npm is npm.cmd, and .cmd shims can only be spawned through a
// shell (scripts/verify-all.mjs does the same); everywhere else keep shell:false.
const result = spawnSync(
  'npm',
  ['test', '--', 'src/game/open-world-phases.test.js'],
  {
    cwd: storyModeDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  console.error(`Open world phases smoke could not start npm: ${result.error.message}`);
}
process.exit(result.status ?? 1);

#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const storyModeDir = `${repoRoot}story-mode`;

const result = spawnSync(
  'npm',
  ['test', '--', 'src/game/open-world-phases.test.js'],
  {
    cwd: storyModeDir,
    stdio: 'inherit',
    shell: false,
  },
);

process.exit(result.status ?? 1);

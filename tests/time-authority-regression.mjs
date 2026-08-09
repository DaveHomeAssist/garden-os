#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const timeSource = await readFile(join(repoRoot, 'gos-time.js'), 'utf8');
const context = vm.createContext({ Date, console });
vm.runInContext(timeSource, context, { filename: 'gos-time.js' });
const GosTime = context.GosTime;

assert.ok(GosTime, 'gos-time.js must expose the shared GosTime authority');

const cases = [
  [new Date(2026, 0, 15, 12), 'winter', 'winter'],
  [new Date(2026, 2, 15, 12), 'spring', 'early-spring'],
  [new Date(2026, 4, 15, 12), 'spring', 'late-spring'],
  [new Date(2026, 7, 9, 12), 'summer', 'summer'],
  [new Date(2026, 9, 1, 12), 'fall', 'fall'],
];

for (const [date, season, doctorSeason] of cases) {
  const current = GosTime.currentContext(date);
  assert.equal(current.season, season, `${date.toDateString()} product season`);
  assert.equal(current.doctorSeason, doctorSeason, `${date.toDateString()} doctor season`);
}

const augustNinth = GosTime.currentContext(new Date(2026, 7, 9, 12));
assert.equal(augustNinth.week, 32, 'August 9, 2026 must be ISO week 32');
assert.equal(augustNinth.seasonYear, '2026');
assert.equal(augustNinth.dayOfYear, 221, 'day-of-year must not drift at DST boundaries');
assert.equal(augustNinth.weekRangeLabel, 'Aug 3 - Aug 9');

const activePages = [
  'index-v5.html',
  'garden-painting.html',
  'garden-planner-v5.html',
  'garden-doctor-v5.html',
  'journal.html',
];

for (const file of activePages) {
  const source = await readFile(join(repoRoot, file), 'utf8');
  const timeIndex = source.indexOf('<script src="gos-time.js"></script>');
  const bedIndex = source.indexOf('<script src="gos-bed.js"></script>');
  assert.ok(timeIndex >= 0, `${file} must load gos-time.js`);
  assert.ok(bedIndex < 0 || timeIndex < bedIndex, `${file} must load GosTime before GosBed`);
  assert.doesNotMatch(source, /APR 20(?:\s*[–-]\s*26)?/i, `${file} must not ship a mock April date`);
}

const homeSource = await readFile(join(repoRoot, 'index-v5.html'), 'utf8');
assert.match(homeSource, /const CURRENT_TIME = GosTime\.currentContext\(\)/);
assert.match(homeSource, /current date verified locally/i);

const plannerSource = await readFile(join(repoRoot, 'garden-planner-v5.html'), 'utf8');
assert.match(plannerSource, /const current = GosTime\.currentContext\(date\)/);
assert.doesNotMatch(plannerSource, /new Date\(2026,\s*3,\s*20\)/);

const doctorSource = await readFile(join(repoRoot, 'garden-doctor-v5.html'), 'utf8');
assert.match(doctorSource, /GosTime\.currentContext\(\)\.doctorSeason/);
assert.match(doctorSource, /\['winter',\s*'Winter'\]/);

console.log('Shared date and seasonal authority regression passed.');

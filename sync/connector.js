#!/usr/bin/env node
/**
 * Garden OS → Notion Sync Connector v1
 *
 * Reads a planner sync snapshot JSON, diffs against current Notion rows,
 * and upserts changes (create / update / archive).
 *
 * Usage:
 *   node connector.js <snapshot.json> [--apply] [--verbose]
 *
 * Environment:
 *   NOTION_TOKEN         — Notion integration token (required)
 *   NOTION_OUTDOOR_DB_ID — Outdoor Plant Beds Tracker DB ID (required)
 *   NOTION_PLANTS_DB_ID  — DB | Plants DB ID (required for Plant relation)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');
const { guardSchema } = require('./schema-guard');
const mapping = require('./mapping.json');

// ═══ CONFIG ═══
const RATE_LIMIT_MS = 340; // ~3 req/sec
const STATUS_MAP = mapping.statusMap.plannerToNotion;
const EVENT_LABELS = {
  seed_started: '\u{1F331} Seed', transplanted: '\u{1F504} Transplant', direct_sown: '\u{1F33F} Direct sow',
  germinated: '\u{1F331} Germ', thinned: '\u2702 Thin', trellised: '\u{1FAB4} Trellis',
  fertilized: '\u{1F9EA} Fert', pest_issue: '\u{1F41B} Pest', disease_issue: '\u{1F9A0} Disease',
  harvested: '\u{1F33E} Harvest', removed: '\u{1F5D1} Remove', note: '\u{1F4DD} Note',
};

// ═══ HELPERS ═══
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function flattenEvents(events, notes) {
  const lines = (events || []).map(e => {
    const date = (e.date || '').split('T')[0];
    const label = EVENT_LABELS[e.type] || e.type;
    return `[${date}] ${label}${e.note ? ': ' + e.note : ''}`;
  });
  const eventBlock = lines.join('\n');
  if (eventBlock && notes) return eventBlock + '\n\n---\n' + notes;
  return eventBlock || notes || '';
}

function formatPosition(row, col) {
  return `Row ${row + 1}, Col ${col + 1}`;
}

function mapStatus(plannerStatus) {
  return STATUS_MAP[plannerStatus] || 'Planned';
}

function capitalizeseason(season) {
  if (!season) return null;
  const cap = season.charAt(0).toUpperCase() + season.slice(1);
  // Match existing Notion options: "Spring 2026", "Summer 2026", "Fall 2025"
  const year = new Date().getFullYear();
  return `${cap} ${year}`;
}

// ═══ NOTION OPERATIONS ═══
async function fetchAllNotionRows(notion, dbId) {
  const rows = [];
  let cursor = undefined;
  do {
    const resp = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
    if (cursor) await sleep(RATE_LIMIT_MS);
  } while (cursor);
  return rows;
}

function getPlantingId(page) {
  const prop = page.properties['Planting ID'];
  if (!prop || prop.type !== 'rich_text') return null;
  return prop.rich_text.map(t => t.plain_text).join('').trim() || null;
}

function getPageTitle(page) {
  const prop = page.properties['Planting'];
  if (!prop || prop.type !== 'title') return '';
  return prop.title.map(t => t.plain_text).join('').trim();
}

async function fetchPlantLookup(notion, plantsDbId) {
  const lookup = {};
  const rows = await fetchAllNotionRows(notion, plantsDbId);
  for (const row of rows) {
    const nameProp = row.properties['Common Name'];
    if (nameProp && nameProp.type === 'title') {
      const name = nameProp.title.map(t => t.plain_text).join('').trim();
      if (name) lookup[name.toLowerCase()] = row.id;
    }
  }
  return lookup;
}

// ═══ DIFF ═══
function buildNotionProperties(planting, plantLookup) {
  const props = {
    'Planting': { title: [{ text: { content: `${planting.cropName} \u2014 ${planting.bedName}` } }] },
    'Planting ID': { rich_text: [{ text: { content: planting.plantingId } }] },
    'Bed ID': { rich_text: [{ text: { content: planting.bedId || '' } }] },
    'Bed': { select: { name: planting.bedName || 'Raised Bed' } },
    'Status': { select: { name: mapStatus(planting.status) } },
    'Bed Location': { rich_text: [{ text: { content: formatPosition(planting.row, planting.col) } }] },
    'Notes': { rich_text: [{ text: { content: flattenEvents(planting.events, planting.notes).slice(0, 2000) } }] },
  };

  if (planting.plantedAt) {
    props['Planted On'] = { date: { start: planting.plantedAt.split('T')[0] } };
  }

  if (planting.season) {
    props['Season'] = { select: { name: capitalizeseason(planting.season) } };
  }

  // Resolve Plant relation
  const plantId = plantLookup[(planting.cropName || '').toLowerCase()];
  if (plantId) {
    props['Plant'] = { relation: [{ id: plantId }] };
  }

  return props;
}

function buildDiff(plantings, notionRows) {
  const notionByPlantingId = {};
  for (const row of notionRows) {
    const pid = getPlantingId(row);
    if (pid) notionByPlantingId[pid] = row;
  }

  const plannerIds = new Set(plantings.map(p => p.plantingId));
  const toCreate = [];
  const toUpdate = [];
  const toArchive = [];

  for (const planting of plantings) {
    const existing = notionByPlantingId[planting.plantingId];
    if (!existing) {
      toCreate.push(planting);
    } else {
      // Compare key fields to decide if update is needed
      const curStatus = existing.properties['Status']?.select?.name || '';
      const newStatus = mapStatus(planting.status);
      const curNotes = (existing.properties['Notes']?.rich_text || []).map(t => t.plain_text).join('');
      const newNotes = flattenEvents(planting.events, planting.notes).slice(0, 2000);

      if (curStatus !== newStatus || curNotes !== newNotes) {
        toUpdate.push({ planting, pageId: existing.id });
      }
    }
  }

  for (const [pid, row] of Object.entries(notionByPlantingId)) {
    if (!plannerIds.has(pid)) {
      toArchive.push({ plantingId: pid, pageId: row.id, title: getPageTitle(row) });
    }
  }

  return { toCreate, toUpdate, toArchive };
}

// ═══ APPLY ═══
async function applyDiff(notion, dbId, diff, plantLookup, verbose) {
  const results = { created: 0, updated: 0, archived: 0, errors: [] };

  for (const planting of diff.toCreate) {
    try {
      const props = buildNotionProperties(planting, plantLookup);
      await notion.pages.create({ parent: { database_id: dbId }, properties: props });
      results.created++;
      if (verbose) console.log(`  + Created: ${planting.cropName} (${planting.plantingId})`);
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      results.errors.push({ op: 'create', plantingId: planting.plantingId, error: err.message });
      if (verbose) console.error(`  ! Create failed: ${planting.plantingId} — ${err.message}`);
    }
  }

  for (const { planting, pageId } of diff.toUpdate) {
    try {
      const props = buildNotionProperties(planting, plantLookup);
      await notion.pages.update({ page_id: pageId, properties: props });
      results.updated++;
      if (verbose) console.log(`  ~ Updated: ${planting.cropName} (${planting.plantingId})`);
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      results.errors.push({ op: 'update', plantingId: planting.plantingId, error: err.message });
      if (verbose) console.error(`  ! Update failed: ${planting.plantingId} — ${err.message}`);
    }
  }

  for (const item of diff.toArchive) {
    try {
      await notion.pages.update({
        page_id: item.pageId,
        properties: { 'Status': { select: { name: 'Done' } } },
      });
      results.archived++;
      if (verbose) console.log(`  - Archived: ${item.title} (${item.plantingId})`);
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      results.errors.push({ op: 'archive', plantingId: item.plantingId, error: err.message });
    }
  }

  return results;
}

// ═══ REPORT ═══
function printReport(diff, results, dryRun) {
  console.log('\n' + (dryRun ? '=== DRY RUN ===' : '=== SYNC COMPLETE ==='));
  console.log(`  Create: ${diff.toCreate.length}${results ? ` (done: ${results.created})` : ''}`);
  console.log(`  Update: ${diff.toUpdate.length}${results ? ` (done: ${results.updated})` : ''}`);
  console.log(`  Archive: ${diff.toArchive.length}${results ? ` (done: ${results.archived})` : ''}`);
  console.log(`  Skip: ${results ? (diff.toCreate.length + diff.toUpdate.length + diff.toArchive.length) - (results.created + results.updated + results.archived) : 0}`);
  if (results && results.errors.length) {
    console.log(`  Errors: ${results.errors.length}`);
    results.errors.forEach(e => console.log(`    ${e.op} ${e.plantingId}: ${e.error}`));
  }
  if (dryRun) {
    if (diff.toCreate.length) {
      console.log('\n  Would create:');
      diff.toCreate.forEach(p => console.log(`    + ${p.cropName} in ${p.bedName} (${p.plantingId})`));
    }
    if (diff.toUpdate.length) {
      console.log('\n  Would update:');
      diff.toUpdate.forEach(u => console.log(`    ~ ${u.planting.cropName} (${u.planting.plantingId})`));
    }
    if (diff.toArchive.length) {
      console.log('\n  Would archive:');
      diff.toArchive.forEach(a => console.log(`    - ${a.title} (${a.plantingId})`));
    }
  }
}

// ═══ MAIN ═══
async function main() {
  const args = process.argv.slice(2);
  const snapshotPath = args.find(a => !a.startsWith('-'));
  const applyMode = args.includes('--apply');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const dryRun = !applyMode;

  if (!snapshotPath) {
    console.error('Usage: node connector.js <snapshot.json> [--apply] [--verbose]');
    console.error('  Default is dry-run. Pass --apply to write to Notion.');
    process.exit(1);
  }

  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_OUTDOOR_DB_ID || process.env.NOTION_DB_ID;
  const plantsDbId = process.env.NOTION_PLANTS_DB_ID;

  if (!token) { console.error('NOTION_TOKEN not set'); process.exit(1); }
  if (!dbId) { console.error('NOTION_OUTDOOR_DB_ID not set'); process.exit(1); }
  if (!plantsDbId) { console.error('NOTION_PLANTS_DB_ID not set'); process.exit(1); }

  // Load snapshot
  console.log(`Loading snapshot: ${snapshotPath}`);
  const raw = fs.readFileSync(path.resolve(snapshotPath), 'utf8');
  const snapshot = JSON.parse(raw);
  if (!snapshot.plantings || !Array.isArray(snapshot.plantings)) {
    console.error('Invalid snapshot: missing plantings array');
    process.exit(1);
  }
  console.log(`  ${snapshot.plantings.length} plantings in snapshot`);
  console.log(`  Exported at: ${snapshot.meta?.exportedAt || 'unknown'}`);

  const notion = new Client({ auth: token });

  // Schema guard
  console.log('\nRunning schema guard...');
  const guard = await guardSchema(notion, dbId);
  if (!guard.ok) {
    console.error('Schema guard FAILED:');
    guard.errors.forEach(e => console.error('  ✗', e));
    process.exit(1);
  }
  console.log('  Schema guard: PASS');

  // Fetch current Notion rows
  console.log('\nFetching current Notion rows...');
  const notionRows = await fetchAllNotionRows(notion, dbId);
  console.log(`  ${notionRows.length} existing rows`);

  // Fetch plant lookup
  console.log('Fetching plant lookup...');
  const plantLookup = await fetchPlantLookup(notion, plantsDbId);
  console.log(`  ${Object.keys(plantLookup).length} plants indexed`);

  // Compute diff
  console.log('\nComputing diff...');
  const diff = buildDiff(snapshot.plantings, notionRows);

  if (dryRun) {
    printReport(diff, null, true);
    console.log('\nDry run complete. Pass --apply to write changes.');
    process.exit(0);
  }

  // Apply
  console.log('\nApplying changes...');
  const results = await applyDiff(notion, dbId, diff, plantLookup, verbose);
  printReport(diff, results, false);

  process.exit(results.errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Connector error:', err.message);
  process.exit(1);
});

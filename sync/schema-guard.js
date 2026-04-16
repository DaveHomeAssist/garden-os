/**
 * Schema Guard — validates Notion DB has expected properties before sync writes.
 * Run standalone: NOTION_TOKEN=xxx NOTION_DB_ID=xxx node schema-guard.js
 */
'use strict';
const { Client } = require('@notionhq/client');
const mapping = require('./mapping.json');

const REQUIRED_PROPERTIES = {
  'Planting':    'title',
  'Planting ID': 'rich_text',
  'Bed ID':      'rich_text',
  'Plant':       'relation',
  'Bed':         'select',
  'Status':      'select',
  'Planted On':  'date',
  'Season':      'select',
  'Bed Location':'rich_text',
  'Notes':       'rich_text',
};

async function guardSchema(notion, dbId) {
  const db = await notion.databases.retrieve({ database_id: dbId });
  const props = db.properties;
  const errors = [];

  for (const [name, expectedType] of Object.entries(REQUIRED_PROPERTIES)) {
    if (!props[name]) {
      errors.push(`Missing property: "${name}"`);
    } else if (props[name].type !== expectedType) {
      errors.push(`Property "${name}" is ${props[name].type}, expected ${expectedType}`);
    }
  }

  // Check status options include our mapped values
  const statusProp = props['Status'];
  if (statusProp && statusProp.type === 'select') {
    const notionStatuses = (statusProp.select.options || []).map(o => o.name);
    const requiredStatuses = Object.values(mapping.statusMap.plannerToNotion);
    const uniqueRequired = [...new Set(requiredStatuses)];
    for (const s of uniqueRequired) {
      if (!notionStatuses.includes(s)) {
        errors.push(`Status option missing: "${s}" (have: ${notionStatuses.join(', ')})`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

// CLI entry point
if (require.main === module) {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID || process.env.NOTION_OUTDOOR_DB_ID;
  if (!token || !dbId) {
    console.error('Usage: NOTION_TOKEN=xxx NOTION_DB_ID=xxx node schema-guard.js');
    process.exit(1);
  }
  const notion = new Client({ auth: token });
  guardSchema(notion, dbId).then(result => {
    if (result.ok) {
      console.log('Schema guard: PASS — all expected properties found.');
    } else {
      console.error('Schema guard: FAIL');
      result.errors.forEach(e => console.error('  ✗', e));
      process.exit(1);
    }
  }).catch(err => {
    console.error('Schema guard error:', err.message);
    process.exit(1);
  });
}

module.exports = { guardSchema, REQUIRED_PROPERTIES };

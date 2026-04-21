# Garden OS Family Recipe Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first bridge between `recipe-tracker` and Garden OS so the planner can import a normalized family recipe snapshot and show which recipes are fully supported by the current planted crop plan.

**Architecture:** Implement the bridge as a two-repo contract. `recipe-tracker` exports a deterministic `garden-recipes.json` snapshot from existing family recipes using a pure ingredient-to-token normalizer. Garden OS imports that snapshot into its own localStorage key, resolves recipe tokens against canonical crop IDs inline inside `garden-planner-v4.html`, and renders a new planner insight section plus a Manage action for refresh.

**Tech Stack:** Vanilla JavaScript, single-file HTML in `garden-planner-v4.html`, localStorage, JSON contract file, Node planner harness (`test-planner-v4.js`), Playwright regression scripts, Vitest + Playwright in `recipe-tracker`

---

## Scope Check

This feature spans two repos, but it is still one bridge feature rather than two unrelated subsystems:

- `recipe-tracker` owns snapshot production
- `garden-os` owns snapshot import, matching, and planner UI

The plan stays single because both sides must agree on one shared contract and one user flow.

## Preconditions

- Garden OS local repo: `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os`
- Expected sibling checkout for `recipe-tracker`: `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\recipe-tracker`
- If `recipe-tracker` is not checked out locally, clone it before Task 1:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist
git clone https://github.com/DaveHomeAssist/recipe-tracker.git
cd recipe-tracker
npm ci
```

## Locked Implementation Decisions

- Keep the family recipe snapshot out of `.gos.json` for v1.
- Store the imported snapshot in its own localStorage key: `gardenOS_familyRecipes_v1`.
- Keep Garden OS runtime logic inline in `garden-planner-v4.html` to respect the single-file root-tool constraint.
- Allow a canonical contract file in `garden-os/sync/` for documentation and fixtures, but do not fetch that file at runtime.
- Show only full recipe matches in the primary UI. Partial matches may exist in matcher output but are not a success state in v1.

## Planned File Map

### `recipe-tracker`

- Create: `src/garden-export.js`
- Modify: `index.html`
- Modify: `README.md`
- Test: `tests/unit/garden-export.test.js`
- Test: `tests/e2e/recipes.spec.js`

### `garden-os`

- Create: `sync/family-recipes-schema.json`
- Create: `tests/family-recipes-regression.mjs`
- Modify: `garden-planner-v4.html`
- Modify: `test-planner-v4.js`
- Modify: `README.md`
- Modify: `docs/HANDOFF.md`

### Responsibility Boundaries

- `recipe-tracker/src/garden-export.js`
  - parse newline ingredient strings
  - normalize family-recipe ingredients into deterministic garden tokens
  - build the snapshot payload
- `garden-os/garden-planner-v4.html`
  - validate imported snapshot
  - store and load snapshot from localStorage
  - map tokens to crop IDs
  - compute full recipe matches from planted crops
  - render the planner UI
- `garden-os/sync/family-recipes-schema.json`
  - document the expected snapshot contract for tests and future tooling

### Task 1: Build the Snapshot Contract in `recipe-tracker`

**Repo:** `recipe-tracker`

**Files:**
- Create: `src/garden-export.js`
- Test: `tests/unit/garden-export.test.js`

- [ ] **Step 1: Write the failing unit test for token normalization and snapshot shape**

```js
import { describe, it, expect } from 'vitest';
import {
  buildGardenRecipeSnapshot,
  normalizeGardenIngredientTokens,
} from '../../src/garden-export.js';

describe('normalizeGardenIngredientTokens', () => {
  it('maps common garden ingredients and drops pantry staples', () => {
    expect(
      normalizeGardenIngredientTokens('2 lb tomatoes\n1 bunch basil\n2 tbsp olive oil\nsalt')
    ).toEqual(['tomato', 'basil']);
  });

  it('dedupes repeated tomato lines into one stable token', () => {
    expect(
      normalizeGardenIngredientTokens('roma tomatoes\ncherry tomatoes\nbasil')
    ).toEqual(['tomato', 'basil']);
  });
});

describe('buildGardenRecipeSnapshot', () => {
  it('returns the Garden OS bridge contract', () => {
    const snapshot = buildGardenRecipeSnapshot(
      [
        {
          id: 'family-moms-sauce',
          name: "Mom's Sunday Sauce",
          url: 'https://example.com/recipes/family-moms-sauce',
          ingredients: 'tomatoes\nbasil\nonion\nolive oil\nsalt',
          tags: ['family', 'dinner'],
        },
      ],
      '2026-04-20T12:00:00.000Z',
    );

    expect(snapshot).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-04-20T12:00:00.000Z',
      recipes: [
        {
          id: 'family-moms-sauce',
          name: "Mom's Sunday Sauce",
          url: 'https://example.com/recipes/family-moms-sauce',
          ingredients_raw: ['tomatoes', 'basil', 'onion', 'olive oil', 'salt'],
          garden_ingredient_tokens: ['tomato', 'basil', 'onion'],
          tags: ['family', 'dinner'],
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/garden-export.test.js`

Expected: FAIL with `Cannot find module '../../src/garden-export.js'` or missing exports.

- [ ] **Step 3: Write the minimal pure exporter implementation**

```js
const SNAPSHOT_SCHEMA_VERSION = 1;

const GARDEN_TOKEN_RULES = [
  { token: 'tomato', patterns: [/\btomato(es)?\b/, /\broma tomato(es)?\b/, /\bcherry tomato(es)?\b/] },
  { token: 'basil', patterns: [/\bbasil\b/] },
  { token: 'onion', patterns: [/\bonion(s)?\b/, /\bgreen onion(s)?\b/, /\bscallion(s)?\b/] },
  { token: 'carrot', patterns: [/\bcarrot(s)?\b/] },
  { token: 'lettuce', patterns: [/\blettuce\b/, /\bhead lettuce\b/] },
  { token: 'radish', patterns: [/\bradish(es)?\b/] },
  { token: 'chive', patterns: [/\bchive(s)?\b/] },
  { token: 'cilantro', patterns: [/\bcilantro\b/] },
  { token: 'pepper', patterns: [/\bpepper(s)?\b/, /\bhot pepper(s)?\b/, /\bchili pepper(s)?\b/] },
];

const PANTRY_PATTERNS = [
  /\bsalt\b/,
  /\bpeppercorn\b/,
  /\bolive oil\b/,
  /\bvinegar\b/,
  /\bbutter\b/,
  /\bsugar\b/,
  /\bflour\b/,
  /\bpasta\b/,
  /\blime juice\b/,
];

const splitIngredientLines = (raw) =>
  String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeIngredientLine = (line) =>
  line
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^\s*[\d/.\-]+\s*/, '')
    .replace(/\b(cup|cups|tbsp|tsp|teaspoon|teaspoons|tablespoon|tablespoons|lb|lbs|oz|ounce|ounces|bunch|bunches|clove|cloves)\b/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const normalizeGardenIngredientTokens = (rawIngredients = '') => {
  const seen = new Set();
  const tokens = [];

  for (const line of splitIngredientLines(rawIngredients)) {
    const normalized = normalizeIngredientLine(line);
    if (!normalized) continue;
    if (PANTRY_PATTERNS.some((pattern) => pattern.test(normalized))) continue;

    const rule = GARDEN_TOKEN_RULES.find((entry) =>
      entry.patterns.some((pattern) => pattern.test(normalized)),
    );
    if (!rule || seen.has(rule.token)) continue;

    seen.add(rule.token);
    tokens.push(rule.token);
  }

  return tokens;
};

export const buildGardenRecipeSnapshot = (recipes, exportedAt = new Date().toISOString()) => ({
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  exportedAt,
  recipes: (Array.isArray(recipes) ? recipes : []).map((recipe) => ({
    id: String(recipe.id || ''),
    name: String(recipe.name || ''),
    url: String(recipe.url || ''),
    ingredients_raw: splitIngredientLines(recipe.ingredients),
    garden_ingredient_tokens: normalizeGardenIngredientTokens(recipe.ingredients),
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
  })),
});
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npx vitest run tests/unit/garden-export.test.js`

Expected: PASS with all tests green.

- [ ] **Step 5: Commit the pure exporter**

```bash
git add src/garden-export.js tests/unit/garden-export.test.js
git commit -m "feat: add Garden OS recipe snapshot exporter"
```

### Task 2: Wire the Snapshot Export into `recipe-tracker` UI

**Repo:** `recipe-tracker`

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Test: `tests/e2e/recipes.spec.js`

- [ ] **Step 1: Write the failing browser test for exporting `garden-recipes.json`**

```js
import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('exports a Garden OS snapshot with normalized tokens', async ({ page }) => {
  await freshPage(page);

  await page.evaluate(() => {
    localStorage.setItem('recipe_journal_v3', JSON.stringify({
      recipes: [
        {
          id: 'family-moms-sauce',
          name: "Mom's Sunday Sauce",
          ingredients: 'tomatoes\nbasil\nolive oil\nsalt',
          url: 'https://example.com/recipes/family-moms-sauce',
          tags: ['family', 'dinner'],
        },
      ],
      tagRegistry: {},
    }));
  });

  await page.reload();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportGardenSnapshotBtn').click(),
  ]);

  expect(download.suggestedFilename()).toBe('garden-recipes.json');

  const payload = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(payload.schemaVersion).toBe(1);
  expect(payload.recipes[0].garden_ingredient_tokens).toEqual(['tomato', 'basil']);
});
```

- [ ] **Step 2: Run the browser test to verify it fails**

Run: `npx playwright test tests/e2e/recipes.spec.js -g "exports a Garden OS snapshot with normalized tokens"`

Expected: FAIL because `#exportGardenSnapshotBtn` does not exist yet.

- [ ] **Step 3: Add the export button and download handler**

```html
<div class="toolbar-actions">
  <button class="btn-toolbar" id="exportBtn" type="button">⇩ Export</button>
  <button class="btn-toolbar" id="exportGardenSnapshotBtn" type="button">Garden OS Snapshot</button>
  <button class="btn-toolbar" id="importBtn" type="button">⇧ Import</button>
  <button class="btn-toolbar" id="syncToNotionBtn" type="button" hidden>Sync to Notion</button>
</div>
```

```js
import { buildGardenRecipeSnapshot } from './src/garden-export.js';

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

document.getElementById('exportGardenSnapshotBtn').addEventListener('click', () => {
  const snapshot = buildGardenRecipeSnapshot(recipes);
  downloadJson('garden-recipes.json', snapshot);
  showToast('Garden OS snapshot exported', 'success');
});
```

```md
### Garden OS snapshot export

Use the `Garden OS Snapshot` toolbar button to download `garden-recipes.json`.
The file contains only fields Garden OS needs:

- `id`
- `name`
- `url`
- `ingredients_raw`
- `garden_ingredient_tokens`
- `tags`
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
npx vitest run tests/unit/garden-export.test.js
npx playwright test tests/e2e/recipes.spec.js -g "exports a Garden OS snapshot with normalized tokens"
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit the UI export flow**

```bash
git add index.html README.md tests/e2e/recipes.spec.js
git commit -m "feat: add Garden OS snapshot export button"
```

### Task 3: Add Snapshot Validation, Storage, and Matching Logic to Garden OS

**Repo:** `garden-os`

**Files:**
- Create: `sync/family-recipes-schema.json`
- Modify: `garden-planner-v4.html`
- Modify: `test-planner-v4.js`

- [ ] **Step 1: Extend the planner harness with failing tests for snapshot validation and matching**

```js
suite('28. Family recipe bridge');

assertType(T.validateFamilyRecipeSnapshot, 'function', 'validateFamilyRecipeSnapshot is exposed');
assertType(T.matchFamilyRecipes, 'function', 'matchFamilyRecipes is exposed');

{
  const valid = T.validateFamilyRecipeSnapshot({
    schemaVersion: 1,
    exportedAt: '2026-04-20T12:00:00.000Z',
    recipes: [
      {
        id: 'family-moms-sauce',
        name: "Mom's Sunday Sauce",
        url: 'https://example.com/recipes/family-moms-sauce',
        ingredients_raw: ['tomatoes', 'basil', 'salt'],
        garden_ingredient_tokens: ['tomato', 'basil'],
        tags: ['family'],
      },
    ],
  });
  assert(valid.ok, 'valid family recipe snapshot accepted');
}

{
  const invalid = T.validateFamilyRecipeSnapshot({ schemaVersion: 99, recipes: [] });
  assert(!invalid.ok, 'unsupported schema version rejected');
}

{
  const ws = makeTestWorkspace({ crops: ['cherry_tom', 'basil', 'onion'] });
  setupRuntime(ws);
  const result = T.matchFamilyRecipes(T.getBed(), {
    schemaVersion: 1,
    exportedAt: '2026-04-20T12:00:00.000Z',
    recipes: [
      {
        id: 'family-moms-sauce',
        name: "Mom's Sunday Sauce",
        url: 'https://example.com/recipes/family-moms-sauce',
        ingredients_raw: ['tomatoes', 'basil', 'salt'],
        garden_ingredient_tokens: ['tomato', 'basil'],
        tags: ['family'],
      },
      {
        id: 'family-salsa',
        name: 'Fresh Garden Salsa',
        url: 'https://example.com/recipes/family-salsa',
        ingredients_raw: ['tomatoes', 'cilantro', 'hot pepper'],
        garden_ingredient_tokens: ['tomato', 'cilantro', 'pepper'],
        tags: ['family'],
      },
    ],
  });

  assertEq(result.fullMatches.length, 1, 'one full family recipe match found');
  assertEq(result.fullMatches[0].id, 'family-moms-sauce', 'matching recipe ID preserved');
}
```

- [ ] **Step 2: Run the planner harness to verify it fails**

Run: `node test-planner-v4.js`

Expected: FAIL because the new bridge functions are missing from the planner and the harness export map.

- [ ] **Step 3: Add the snapshot contract file and inline bridge logic**

```json
{
  "schemaVersion": 1,
  "type": "garden-os-family-recipes-snapshot",
  "required": ["schemaVersion", "exportedAt", "recipes"],
  "recipeRequired": ["id", "name", "url", "ingredients_raw", "garden_ingredient_tokens"]
}
```

```js
const FAMILY_RECIPE_SCHEMA_VERSION = 1;
const LS_KEY_FAMILY_RECIPES = 'gardenOS_familyRecipes_v1';
const FAMILY_RECIPE_ALIAS_MAP = {
  tomato: ['cherry_tom', 'compact_tomato'],
  basil: ['basil'],
  onion: ['onion', 'scallion', 'prairie_onion'],
  carrot: ['carrot'],
  lettuce: ['lettuce', 'head_lettuce'],
  radish: ['radish'],
  chive: ['chives'],
  cilantro: ['cilantro'],
  pepper: ['pepper', 'ghost_pepper'],
};

function validateFamilyRecipeSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Expected a family recipe snapshot object.' };
  }
  if (Number(raw.schemaVersion) !== FAMILY_RECIPE_SCHEMA_VERSION) {
    return { ok: false, error: `Unsupported family recipe snapshot version: ${raw.schemaVersion}` };
  }
  if (!Array.isArray(raw.recipes)) {
    return { ok: false, error: 'Family recipe snapshot must include a recipes array.' };
  }

  const warnings = [];
  const recipes = raw.recipes.flatMap((recipe, index) => {
    const hasRequiredFields =
      recipe &&
      typeof recipe.id === 'string' &&
      typeof recipe.name === 'string' &&
      typeof recipe.url === 'string' &&
      Array.isArray(recipe.ingredients_raw) &&
      Array.isArray(recipe.garden_ingredient_tokens);

    if (!hasRequiredFields) {
      warnings.push(`Skipped malformed recipe at index ${index}.`);
      return [];
    }

    return [{
      id: recipe.id,
      name: recipe.name,
      url: recipe.url,
      ingredients_raw: recipe.ingredients_raw.map((item) => String(item)),
      garden_ingredient_tokens: recipe.garden_ingredient_tokens.map((item) => String(item)),
      tags: Array.isArray(recipe.tags) ? recipe.tags.map((item) => String(item)) : [],
    }];
  });

  return {
    ok: true,
    warnings,
    snapshot: {
      schemaVersion: FAMILY_RECIPE_SCHEMA_VERSION,
      exportedAt: String(raw.exportedAt || ''),
      recipes,
    },
  };
}

function loadFamilyRecipeSnapshot() {
  try {
    const raw = localStorage.getItem(LS_KEY_FAMILY_RECIPES);
    if (!raw) return { ok: false, error: 'No family recipe snapshot loaded yet.' };
    return validateFamilyRecipeSnapshot(JSON.parse(raw));
  } catch (error) {
    return { ok: false, error: 'Stored family recipe snapshot is invalid JSON.' };
  }
}

function saveFamilyRecipeSnapshot(snapshot) {
  try {
    localStorage.setItem(LS_KEY_FAMILY_RECIPES, JSON.stringify(snapshot));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: 'Unable to store the family recipe snapshot locally.' };
  }
}

function getPlantedCropKeys(runtimeBed) {
  return [...new Set((runtimeBed || []).map((cell) => cell && cell.crop).filter(Boolean))];
}

function getSatisfiedGardenTokens(plantedCropKeys) {
  const planted = new Set(plantedCropKeys || []);
  return new Set(
    Object.entries(FAMILY_RECIPE_ALIAS_MAP)
      .filter(([, cropKeys]) => cropKeys.some((cropKey) => planted.has(cropKey)))
      .map(([token]) => token)
  );
}

function matchFamilyRecipes(runtimeBed, snapshot) {
  const plantedCropKeys = getPlantedCropKeys(runtimeBed);
  const satisfiedTokens = getSatisfiedGardenTokens(plantedCropKeys);

  const fullMatches = [];
  const partialMatches = [];

  (snapshot && Array.isArray(snapshot.recipes) ? snapshot.recipes : []).forEach((recipe) => {
    const missingTokens = recipe.garden_ingredient_tokens.filter((token) => !satisfiedTokens.has(token));
    const matchedCropIds = plantedCropKeys.filter((cropKey) =>
      recipe.garden_ingredient_tokens.some((token) => (FAMILY_RECIPE_ALIAS_MAP[token] || []).includes(cropKey))
    );

    const record = {
      id: recipe.id,
      name: recipe.name,
      url: recipe.url,
      tags: recipe.tags || [],
      matchedCropIds,
      matchedTokens: recipe.garden_ingredient_tokens.filter((token) => satisfiedTokens.has(token)),
      missingTokens,
    };

    if (!missingTokens.length) fullMatches.push(record);
    else partialMatches.push(record);
  });

  return { fullMatches, partialMatches };
}
```

```js
__test_exports.validateFamilyRecipeSnapshot = typeof validateFamilyRecipeSnapshot !== 'undefined' ? validateFamilyRecipeSnapshot : null;
__test_exports.loadFamilyRecipeSnapshot = typeof loadFamilyRecipeSnapshot !== 'undefined' ? loadFamilyRecipeSnapshot : null;
__test_exports.saveFamilyRecipeSnapshot = typeof saveFamilyRecipeSnapshot !== 'undefined' ? saveFamilyRecipeSnapshot : null;
__test_exports.matchFamilyRecipes = typeof matchFamilyRecipes !== 'undefined' ? matchFamilyRecipes : null;
```

- [ ] **Step 4: Run the planner harness again**

Run: `node test-planner-v4.js`

Expected: PASS with the new family-recipe suites green and no regressions in existing planner suites.

- [ ] **Step 5: Commit the bridge contract and matcher**

```bash
git add sync/family-recipes-schema.json garden-planner-v4.html test-planner-v4.js
git commit -m "feat: add family recipe snapshot matcher"
```

### Task 4: Add the Garden OS Manage Import and Planner Insight UI

**Repo:** `garden-os`

**Files:**
- Create: `tests/family-recipes-regression.mjs`
- Modify: `garden-planner-v4.html`

- [ ] **Step 1: Write the failing browser regression for import and rendering**

```js
import { chromium } from 'playwright';

const url = process.env.PLANNER_URL || process.argv[2] || 'http://127.0.0.1:4173/garden-planner-v4.html';

const snapshot = {
  schemaVersion: 1,
  exportedAt: '2026-04-20T12:00:00.000Z',
  recipes: [
    {
      id: 'family-moms-sauce',
      name: "Mom's Sunday Sauce",
      url: 'https://example.com/recipes/family-moms-sauce',
      ingredients_raw: ['tomatoes', 'basil', 'salt'],
      garden_ingredient_tokens: ['tomato', 'basil'],
      tags: ['family', 'dinner'],
    },
  ],
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.goto(url, { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const workspace = JSON.parse(localStorage.getItem('gardenOS_workspace'));
    workspace.beds[0].plannerState.cells[0] = {
      crop: 'cherry_tom',
      plantingId: 'pl-1',
      plantedAt: '2026-04-20T12:00:00.000Z',
      status: 'planned',
      events: [],
      notes: '',
    };
    workspace.beds[0].plannerState.cells[1] = {
      crop: 'basil',
      plantingId: 'pl-2',
      plantedAt: '2026-04-20T12:00:00.000Z',
      status: 'planned',
      events: [],
      notes: '',
    };
    localStorage.setItem('gardenOS_workspace', JSON.stringify(workspace));
  });

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#openManagePanel').click();
  await page.locator('#importFamilyRecipesInput').setInputFiles({
    name: 'garden-recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });

  await page.locator('#insightFamilyRecipes .insight-header').click();
  await page.waitForSelector('#rpaneFamilyRecipes');

  const panelText = await page.locator('#rpaneFamilyRecipes').innerText();
  if (!panelText.includes("Mom's Sunday Sauce")) {
    throw new Error(`Expected recipe match to render, got: ${panelText}`);
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the browser regression to verify it fails**

Run:

```bash
python -m http.server 4173
node tests/family-recipes-regression.mjs http://127.0.0.1:4173/garden-planner-v4.html
```

Expected: FAIL because the new Manage action, file input, and insight section do not exist yet.

- [ ] **Step 3: Add the Manage import action, insight section, and render function**

```html
<button class="menu-row" id="menuImportFamilyRecipes">
  <span class="menu-row-icon" style="background:#eaf3de"></span>
  <span>Load family recipes</span>
  <span class="menu-row-sub">json</span>
</button>
<input id="importFamilyRecipesInput" type="file" accept=".json,application/json" hidden>
```

```html
<section class="insight-block" id="insightFamilyRecipes">
  <button class="insight-header" type="button" aria-expanded="false">
    <span>Family Recipes</span>
  </button>
  <div class="insight-content" hidden>
    <div id="rpaneFamilyRecipes"></div>
  </div>
</section>
```

```js
const INSIGHT_SECTION_MAP = {
  score: 'insightSummary',
  dashboard: 'insightDashboard',
  inspect: 'insightInspect',
  companions: 'insightInspect',
  calendar: 'insightCalendar',
  harvest: 'insightHarvest',
  experiment: 'insightExperiment',
  retrospective: 'insightRetrospective',
  notes: 'insightNotes',
  today: 'insightToday',
  recipes: 'insightFamilyRecipes',
};

function renderFamilyRecipesTab() {
  const pane = document.getElementById('rpaneFamilyRecipes');
  if (!pane) return;

  const loaded = loadFamilyRecipeSnapshot();
  if (!loaded.ok) {
    pane.innerHTML = `
      <div class="icard">
        <div class="ichdr">Family Recipes</div>
        <div class="icbody">
          <p>No family recipe library loaded yet.</p>
          <p>Import or refresh a recipe snapshot from the Manage panel to see recipe matches from this plan.</p>
        </div>
      </div>`;
    return;
  }

  const matches = matchFamilyRecipes(bed, loaded.snapshot);
  if (!matches.fullMatches.length) {
    pane.innerHTML = `
      <div class="icard">
        <div class="ichdr">Family Recipes</div>
        <div class="icbody">
          <p>No full family recipe matches yet.</p>
          <p>Try planting crops that satisfy more garden ingredient tokens.</p>
        </div>
      </div>`;
    return;
  }

  pane.innerHTML = `
    <div class="icard">
      <div class="ichdr">Family Recipes</div>
      <div class="icbody">
        <p>You can make ${matches.fullMatches.length} family recipe${matches.fullMatches.length === 1 ? '' : 's'} from this plan.</p>
        <div class="family-recipe-list">
          ${matches.fullMatches.map((recipe) => `
            <article class="family-recipe-card">
              <h4>${escapeHtml(recipe.name)}</h4>
              <div class="family-recipe-meta">Contributing crops: ${escapeHtml(recipe.matchedCropIds.map((cropKey) => CROPS[cropKey] ? CROPS[cropKey].name : cropKey).join(', '))}</div>
              <a href="${escapeHtml(recipe.url)}" target="_blank" rel="noopener noreferrer">Open recipe</a>
            </article>`).join('')}
        </div>
      </div>
    </div>`;
}

async function handleFamilyRecipeImport(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    setPlannerNotice('error', 'Family recipe import failed', 'The selected file is not valid JSON.');
    return;
  }

  const check = validateFamilyRecipeSnapshot(parsed);
  if (!check.ok) {
    setPlannerNotice('error', 'Family recipe import failed', check.error);
    return;
  }

  const stored = saveFamilyRecipeSnapshot(check.snapshot);
  if (!stored.ok) {
    setPlannerNotice('error', 'Family recipe import failed', stored.error);
    return;
  }
  renderFamilyRecipesTab();
  switchRTab('recipes');
  setPlannerNotice('complete', 'Family recipes imported', 'The planner can now compare planted crops against your family recipe library.');
}

document.getElementById('menuImportFamilyRecipes').addEventListener('click', function () {
  closeMenu(false);
  document.getElementById('importFamilyRecipesInput').click();
});

document.getElementById('importFamilyRecipesInput').addEventListener('change', async function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  await handleFamilyRecipeImport(file);
  event.target.value = '';
});

function switchRTab(t, persist = true) {
  ui.rTab = t;
  if (persist && _workspace) {
    _workspace.workspaceSettings = _workspace.workspaceSettings || {};
    _workspace.workspaceSettings.rightTab = t;
    saveWorkspace(_workspace);
  }
  const sectionId = INSIGHT_SECTION_MAP[t];
  if (sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      syncInsightRail(sectionId);
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    syncInsightRail();
  }
  if (t === 'recipes') renderFamilyRecipesTab();
}

function renderRight(inputs, issues, scoreTotal) {
  // existing planner rendering
  renderFamilyRecipesTab();
}
```

- [ ] **Step 4: Run focused Garden OS verification**

Run:

```bash
node test-planner-v4.js
node tests/family-recipes-regression.mjs http://127.0.0.1:4173/garden-planner-v4.html
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit the planner UI**

```bash
git add garden-planner-v4.html tests/family-recipes-regression.mjs
git commit -m "feat: add family recipe planner panel"
```

### Task 5: Document the Bridge and Run Final Cross-Repo Verification

**Repo:** `garden-os` and `recipe-tracker`

**Files:**
- Modify: `garden-os/README.md`
- Modify: `garden-os/docs/HANDOFF.md`
- Modify: `recipe-tracker/README.md`

- [ ] **Step 1: Update Garden OS docs with the new bridge behavior**

```md
## Family recipe bridge

Garden OS can import a `garden-recipes.json` snapshot exported from `recipe-tracker`.
The planner stores that snapshot locally and shows only full family recipe matches for the current planted crop set.

This snapshot is cached in localStorage under `gardenOS_familyRecipes_v1`.
It is not part of `.gos.json` workspace export in v1.
```

```md
### Family recipe bridge

- Snapshot source: `recipe-tracker`
- Snapshot storage: `gardenOS_familyRecipes_v1`
- Runtime matching: inline in `garden-planner-v4.html`
- Planner UI: `insightFamilyRecipes`
- Deliberate v1 limit: full matches only, no pantry or quantity tracking
```

- [ ] **Step 2: Update `recipe-tracker` docs with the export workflow**

```md
### Export for Garden OS

Use the `Garden OS Snapshot` button to download `garden-recipes.json`.
Garden OS imports that file locally and uses `garden_ingredient_tokens` to match planted crops to real family recipes.
```

- [ ] **Step 3: Run full verification in `recipe-tracker`**

Run:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\recipe-tracker
npx vitest run tests/unit/garden-export.test.js tests/unit/schema.test.js tests/integration/render.test.js
npx playwright test tests/e2e/recipes.spec.js -g "exports a Garden OS snapshot with normalized tokens"
```

Expected: PASS for all listed tests.

- [ ] **Step 4: Run full verification in `garden-os`**

Run:

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os
node test-planner-v4.js
python -m http.server 4173
node tests/family-recipes-regression.mjs http://127.0.0.1:4173/garden-planner-v4.html
```

Expected: PASS for the planner harness and the browser regression.

- [ ] **Step 5: Commit the final documentation pass**

```bash
cd C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os
git add README.md docs/HANDOFF.md
git commit -m "docs: document family recipe bridge"
```

## Spec Coverage Check

- Snapshot export from `recipe-tracker`
  - Covered by Tasks 1 and 2
- Deterministic garden ingredient token model
  - Covered by Task 1
- Deterministic alias map from tokens to crop IDs
  - Covered by Task 3
- Compute recipe matches from planted crops
  - Covered by Task 3
- Planner-facing Family Recipes panel
  - Covered by Task 4
- Local import and local cache
  - Covered by Tasks 3 and 4
- Validation and safe failure behavior
  - Covered by Task 3
- Docs and handoff updates
  - Covered by Task 5

## Placeholder Scan

- No `TODO`
- No `TBD`
- No undefined task references
- No unresolved schema decision left open

## Type Consistency Check

- Snapshot field names stay consistent across both repos:
  - `schemaVersion`
  - `exportedAt`
  - `recipes`
  - `ingredients_raw`
  - `garden_ingredient_tokens`
- Garden OS matcher function names stay consistent:
  - `validateFamilyRecipeSnapshot`
  - `loadFamilyRecipeSnapshot`
  - `saveFamilyRecipeSnapshot`
  - `matchFamilyRecipes`

## Execution Notes

- Keep Garden OS runtime logic inline in `garden-planner-v4.html`
- Do not add runtime imports or modules to the root planner
- Do not change `gos-schema.json` in v1
- Append the session log row to `today.csv` after each meaningful implementation session

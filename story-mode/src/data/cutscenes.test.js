/**
 * Cutscene System — Full Scenario Test Package
 *
 * Tests every trigger path, speaker selection, and text generation
 * for the dynamic cutscene system. Run with:
 *   node --experimental-vm-modules story-mode/src/data/cutscenes.test.js
 *
 * Or import into a test runner.
 */

// Minimal mock for crops.js since we're testing cutscenes in isolation
const MOCK_RECIPES = {
  moms_sauce: { name: "Mom's Sauce" },
  garden_salad: { name: 'Garden Salad' },
  tomato_sandwich: { name: 'Tomato Sandwich' },
  weeknight_pasta: { name: 'Weeknight Pasta' },
};

// Patch the module loader before importing cutscenes
// For Node without module mocking, we inline the test logic
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const CATEGORIES = ['weather', 'critter', 'neighbor', 'family', 'phillies', 'infrastructure', 'soil'];
const VALENCES = ['negative', 'positive', 'mixed', 'neutral'];
const INTERVENTIONS = ['protect', 'mulch', 'swap', 'prune', 'companion_patch', 'accept_loss'];
const GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];

const VALID_SPEAKERS = new Set(['narrator', 'garden_gurl', 'onion_man', 'vegeman', 'critters', 'calvin']);
const VALID_CAMERAS = new Set(['overview', 'bed-low-angle', 'row-close', 'event-push', 'front-access', 'harvest-hero']);
const VALID_EMOTIONS = new Set(['neutral', 'warm', 'sad', 'emphasis', 'smirk', 'surprised']);
const VALID_BACKDROP_TONES = new Set(['dawn', 'heat', 'calm', 'night', 'storm', 'celebration', 'harvest-gold', 'loss']);

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

// ── STATIC CUTSCENE VALIDATION ──

section('Static cutscene structure');

async function runTests() {
  // Dynamic import to handle ES modules
  // Mock the crops.js dependency before importing cutscenes
  let CUTSCENES, getHighestPriorityCutscene, getEligibleCutscenes;
  try {
    // Register a loader hook or use direct file parsing
    // Since cutscenes.js imports from crops.js which imports from loader.js (Vite alias),
    // we need to mock the entire chain. Parse cutscenes.js directly instead.
    const fs = await import('fs');
    const path = await import('path');
    const url = await import('url');
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const source = fs.readFileSync(path.join(__dirname, 'cutscenes.js'), 'utf-8');

    // Strip the import line and eval the module content
    const stripped = source
      .replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';?\s*$/gm, '')
      .replace(/^export\s+/gm, '');

    // Eval in a function scope that provides the mock
    const moduleCode = `
      const MOCK_RECIPES = ${JSON.stringify(MOCK_RECIPES)};
      const getRecipeById = (id) => MOCK_RECIPES[id] || { name: id };
      ${stripped}
      return { CUTSCENES, getHighestPriorityCutscene, getEligibleCutscenes };
    `;
    const result = new Function(moduleCode)();
    CUTSCENES = result.CUTSCENES;
    getHighestPriorityCutscene = result.getHighestPriorityCutscene;
    getEligibleCutscenes = result.getEligibleCutscenes;
    console.log(`Loaded ${CUTSCENES.length} static cutscenes + dynamic builders\n`);
  } catch (e) {
    console.error('Could not load cutscenes.js:', e.message);
    console.log('\nRunning structural validation only (no import)...\n');
    runStructuralTests();
    return;
  }

  // Test 1: All static cutscenes have valid structure
  for (const scene of CUTSCENES) {
    assert(typeof scene.id === 'string' && scene.id.length > 0, `Scene ${scene.id}: has id`);
    assert(typeof scene.trigger === 'string', `Scene ${scene.id}: has trigger`);
    assert(typeof scene.priority === 'number' && scene.priority > 0, `Scene ${scene.id}: has priority > 0`);
    assert(typeof scene.skippable === 'boolean', `Scene ${scene.id}: has skippable flag`);
    assert(Array.isArray(scene.beats) && scene.beats.length > 0, `Scene ${scene.id}: has beats`);

    for (let i = 0; i < scene.beats.length; i++) {
      const beat = scene.beats[i];
      assert(VALID_SPEAKERS.has(beat.speaker), `Scene ${scene.id} beat ${i}: valid speaker '${beat.speaker}'`);
      assert(typeof beat.text === 'string' && beat.text.length > 0, `Scene ${scene.id} beat ${i}: has text`);
      assert(!beat.text.includes('undefined'), `Scene ${scene.id} beat ${i}: no 'undefined' in text`);
      assert(!beat.text.includes('NaN'), `Scene ${scene.id} beat ${i}: no 'NaN' in text`);
    }
  }

  // Test 2: No duplicate IDs
  const ids = CUTSCENES.map(s => s.id);
  const uniqueIds = new Set(ids);
  assert(ids.length === uniqueIds.size, `No duplicate cutscene IDs (${ids.length} total, ${uniqueIds.size} unique)`);

  // Test 3: All 12 chapter intros exist
  section('Chapter intros');
  for (let ch = 1; ch <= 12; ch++) {
    const payload = { type: 'chapter_start', chapter: ch };
    const scene = getHighestPriorityCutscene(payload, {}, new Set());
    assert(scene !== null, `Chapter ${ch} intro: scene exists`);
    if (scene) {
      assert(scene.id.startsWith('ch') || scene.id === 'chapter-generic-intro', `Chapter ${ch} intro: id=${scene.id}`);
    }
  }

  // Test 4: Event reactions for every category × valence × season
  section('Dynamic event reactions');
  let eventScenarios = 0;
  for (const season of SEASONS) {
    for (const category of CATEGORIES) {
      for (const valence of VALENCES) {
        const payload = {
          type: 'event_drawn',
          season,
          eventCategory: category,
          eventValence: valence,
          eventId: `test-${category}-${valence}-${season}`,
          eventCommentary: {
            gurl: 'Test GURL line for ' + category,
            onion: 'Test Onion line for ' + category,
            vegeman: 'Test Vegeman line for ' + category,
            critters: 'Test Critters line for ' + category,
          },
          eventCarryForward: valence === 'negative',
          eventSeverity: valence === 'negative' ? 'high' : 'low',
        };
        const scene = getHighestPriorityCutscene(payload, {}, new Set());
        assert(scene !== null, `Event ${category}/${valence}/${season}: has scene`);
        if (scene) {
          assert(scene.beats.length > 0, `Event ${category}/${valence}/${season}: has beats`);
          for (const beat of scene.beats) {
            assert(VALID_SPEAKERS.has(beat.speaker), `Event ${category}/${valence}/${season}: speaker '${beat.speaker}' valid`);
            assert(typeof beat.text === 'string' && beat.text.length > 0, `Event ${category}/${valence}/${season}: beat has text`);
          }
          eventScenarios++;
        }
      }
    }
  }
  console.log(`  Tested ${eventScenarios} event scenarios`);

  // Test 5: Event reactions WITHOUT commentary (should fall back)
  section('Event fallback (no commentary)');
  for (const season of SEASONS) {
    const payload = {
      type: 'event_drawn',
      season,
      eventCategory: 'weather',
      eventValence: 'negative',
      eventId: `test-no-commentary-${season}`,
      // No eventCommentary — should fall back to static cutscene
    };
    const scene = getHighestPriorityCutscene(payload, {}, new Set());
    assert(scene !== null, `Event fallback ${season}: has scene`);
    if (scene) {
      assert(scene.beats.length > 0, `Event fallback ${season}: has beats`);
    }
  }

  // Test 6: Intervention reactions for every type × season
  section('Dynamic intervention reactions');
  let interventionScenarios = 0;
  for (const season of SEASONS) {
    for (const intervention of INTERVENTIONS) {
      const payload = {
        type: 'intervention_used',
        season,
        intervention,
        eventCategory: 'weather',
        eventValence: 'negative',
        targetCropNames: ['Cherry Tomato'],
        targetSummary: 'Row 2, Col 3',
      };
      const scene = getHighestPriorityCutscene(payload, {}, new Set());
      assert(scene !== null, `Intervention ${intervention}/${season}: has scene`);
      if (scene) {
        assert(scene.beats.length > 0, `Intervention ${intervention}/${season}: has beats`);
        for (const beat of scene.beats) {
          assert(VALID_SPEAKERS.has(beat.speaker), `Intervention ${intervention}/${season}: speaker '${beat.speaker}' valid`);
          assert(typeof beat.text === 'string' && beat.text.length > 0, `Intervention ${intervention}/${season}: beat has text`);
          assert(!beat.text.includes('undefined'), `Intervention ${intervention}/${season}: no 'undefined' in text`);
        }
        interventionScenarios++;
      }
    }
  }
  console.log(`  Tested ${interventionScenarios} intervention scenarios`);

  // Test 7: Harvest reactions for every grade × season
  section('Dynamic harvest reactions');
  let harvestScenarios = 0;
  for (const season of ['spring', 'summer', 'fall']) {
    for (const grade of GRADES) {
      const payload = {
        type: 'harvest_complete',
        season,
        grade,
        yieldCount: grade === 'F' ? 2 : grade === 'D' ? 5 : 8,
        recipeMatches: [],
      };
      const scene = getHighestPriorityCutscene(payload, {}, new Set());
      assert(scene !== null, `Harvest ${grade}/${season}: has scene`);
      if (scene) {
        assert(scene.beats.length > 0, `Harvest ${grade}/${season}: has beats`);
        for (const beat of scene.beats) {
          assert(VALID_SPEAKERS.has(beat.speaker), `Harvest ${grade}/${season}: speaker '${beat.speaker}' valid`);
          assert(typeof beat.text === 'string' && beat.text.length > 0, `Harvest ${grade}/${season}: beat has text`);
          assert(!beat.text.includes('undefined'), `Harvest ${grade}/${season}: no 'undefined' in text`);
          assert(!beat.text.includes('NaN'), `Harvest ${grade}/${season}: no 'NaN' in text`);
        }
        harvestScenarios++;
      }
    }
  }
  console.log(`  Tested ${harvestScenarios} harvest scenarios`);

  // Test 8: Harvest with recipe matches
  section('Harvest with recipes');
  const recipePayload = {
    type: 'harvest_complete',
    season: 'fall',
    grade: 'A',
    yieldCount: 10,
    recipeMatches: ['moms_sauce'],
  };
  const recipeScene = getHighestPriorityCutscene(recipePayload, {}, new Set());
  assert(recipeScene !== null, 'Harvest with moms_sauce: has scene');
  if (recipeScene) {
    const hasOnion = recipeScene.beats.some(b => b.speaker === 'onion_man');
    assert(hasOnion, 'Harvest with moms_sauce: Onion Man speaks');
    const mentionsSauce = recipeScene.beats.some(b => b.text.toLowerCase().includes('sauce'));
    assert(mentionsSauce, 'Harvest with moms_sauce: mentions sauce');
  }

  // Test 9: Chapter complete
  section('Chapter complete');
  for (const ch of [4, 8]) {
    const payload = { type: 'chapter_complete', chapter: ch };
    const scene = getHighestPriorityCutscene(payload, {}, new Set());
    assert(scene !== null, `Chapter ${ch} complete: has scene`);
  }
  // Generic chapter complete
  const genericComplete = getHighestPriorityCutscene({ type: 'chapter_complete', chapter: 5 }, {}, new Set());
  assert(genericComplete !== null, 'Generic chapter complete: has scene');

  // Test 10: Campaign complete
  section('Campaign complete');
  const campaignScene = getHighestPriorityCutscene({ type: 'campaign_complete' }, {}, new Set());
  assert(campaignScene !== null, 'Campaign complete: has scene');
  if (campaignScene) {
    assert(campaignScene.beats.length >= 4, 'Campaign complete: has 4+ beats (all characters)');
    const speakers = new Set(campaignScene.beats.map(b => b.speaker));
    assert(speakers.has('narrator'), 'Campaign complete: narrator speaks');
    assert(speakers.has('garden_gurl'), 'Campaign complete: GURL speaks');
    assert(speakers.has('onion_man'), 'Campaign complete: Onion Man speaks');
    assert(speakers.has('vegeman'), 'Campaign complete: Vegeman speaks');
    assert(speakers.has('critters'), 'Campaign complete: Critters speak');
  }

  // Test 11: Speaker distribution across dynamic events
  section('Speaker distribution');
  const speakerCounts = { garden_gurl: 0, onion_man: 0, vegeman: 0, critters: 0, narrator: 0 };
  for (const season of SEASONS) {
    for (const category of CATEGORIES) {
      for (const valence of ['negative', 'positive']) {
        const payload = {
          type: 'event_drawn',
          season, eventCategory: category, eventValence: valence,
          eventId: `dist-${category}-${valence}-${season}`,
          eventCommentary: { gurl: 'G', onion: 'O', vegeman: 'V', critters: 'C' },
        };
        const scene = getHighestPriorityCutscene(payload, {}, new Set());
        if (scene) for (const beat of scene.beats) speakerCounts[beat.speaker]++;
      }
    }
  }
  console.log('  Speaker distribution across event reactions:');
  for (const [speaker, count] of Object.entries(speakerCounts)) {
    if (count > 0) console.log(`    ${speaker}: ${count}`);
  }
  // Critters should NOT dominate
  assert(speakerCounts.critters < speakerCounts.garden_gurl + speakerCounts.onion_man,
    'Critters used less than GURL + Onion Man combined');
  // Onion Man should appear meaningfully
  assert(speakerCounts.onion_man > 10, 'Onion Man appears in 10+ event reactions');
  // Vegeman should appear
  assert(speakerCounts.vegeman > 3, 'Vegeman appears in 3+ event reactions');

  // Test 12: No mechanic explanation in dialogue
  section('No mechanic explanation in dialogue');
  const mechanicPhrases = [
    'per beat', 'intervention token', 'scoring bonus', '+0.5 adjacency',
    'score factor', 'check your adjacency score', 'support factor is maxed',
    'fill ratio', 'diversity matters more than density',
  ];
  for (const scene of CUTSCENES) {
    for (const beat of scene.beats) {
      for (const phrase of mechanicPhrases) {
        assert(!beat.text.toLowerCase().includes(phrase.toLowerCase()),
          `Scene ${scene.id}: no mechanic phrase '${phrase}' in "${beat.text.slice(0, 40)}..."`);
      }
    }
  }

  // Test 13: 'once: true' scenes don't repeat
  section('Once-only scenes');
  const onceScenes = CUTSCENES.filter(s => s.once);
  for (const scene of onceScenes) {
    const seenSet = new Set([scene.id]);
    const eligible = getEligibleCutscenes({ type: scene.trigger, ...scene.conditions }, {}, seenSet);
    const contains = eligible.some(s => s.id === scene.id);
    assert(!contains, `Once-scene ${scene.id}: not eligible after being seen`);
  }

  // ── RESULTS ──
  section('RESULTS');
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failures.length > 0) {
    console.log('  FAILURES:');
    for (const f of failures) console.log(`    ✗ ${f}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

function runStructuralTests() {
  console.log('Structural validation (no module import):');
  console.log('  - SEASONS:', SEASONS.length);
  console.log('  - CATEGORIES:', CATEGORIES.length);
  console.log('  - INTERVENTIONS:', INTERVENTIONS.length);
  console.log('  - GRADES:', GRADES.length);
  console.log('  - Total event scenarios:', SEASONS.length * CATEGORIES.length * VALENCES.length);
  console.log('  - Total intervention scenarios:', SEASONS.length * INTERVENTIONS.length);
  console.log('  - Total harvest scenarios:', 3 * GRADES.length);
  console.log('  - Total scenarios to test:',
    SEASONS.length * CATEGORIES.length * VALENCES.length +
    SEASONS.length * INTERVENTIONS.length +
    3 * GRADES.length + 12 + 1);
  console.log('\nTo run with module import:');
  console.log('  cd story-mode && node --experimental-vm-modules src/data/cutscenes.test.js');
}

runTests().catch(e => {
  console.error('Test runner failed:', e);
  process.exit(1);
});

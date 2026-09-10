import { describe, expect, it } from 'vitest';

import recipeSpecData from 'specs/CRAFTING_RECIPES.json';

import authorityWorker from '../../../gos-authority-worker.js';
import { REPAIR_COSTS } from '../game/intervention.js';
import {
  AUTHORITY_CRAFTING_RECIPES,
  AUTHORITY_REPAIR_COSTS,
} from './authority-service.js';

// The two server runtimes (Node service behind Vercel, fetch worker) each keep
// a hand-mirrored copy of the crafting recipe and repair cost tables because
// they must stay free of the browser spec alias. The reward tables already
// have a drift test; these tables did not, so a spec edit could silently
// leave one or both server copies validating against stale costs. Fail the
// build the moment any mirror disagrees with its canonical source.

function normalizeMaterials(materials) {
  return (materials ?? []).map((material) => ({
    count: material.count,
    itemId: material.itemId,
  }));
}

function normalizeOutput(output) {
  return {
    count: output?.count ?? 1,
    durability: output?.durability ?? null,
    itemId: output?.itemId,
  };
}

function specRecipesById() {
  const byId = {};
  for (const recipe of recipeSpecData.recipes ?? []) {
    byId[recipe.id] = recipe;
  }
  return byId;
}

function expectRecipesMirrorSpec(mirror) {
  const spec = specRecipesById();
  expect(Object.keys(mirror).sort()).toEqual(Object.keys(spec).sort());
  for (const [recipeId, recipe] of Object.entries(spec)) {
    expect(normalizeMaterials(mirror[recipeId].materials)).toEqual(normalizeMaterials(recipe.materials));
    expect(normalizeOutput(mirror[recipeId].output)).toEqual(normalizeOutput(recipe.output));
  }
}

function expectRepairCostsMirrorClient(mirror) {
  expect(Object.keys(mirror).sort()).toEqual(Object.keys(REPAIR_COSTS).sort());
  for (const [itemId, materials] of Object.entries(REPAIR_COSTS)) {
    expect(normalizeMaterials(mirror[itemId])).toEqual(normalizeMaterials(materials));
  }
}

describe('authority crafting and repair tables mirror their canonical sources', () => {
  it('Node authority service crafting recipes mirror specs/CRAFTING_RECIPES.json', () => {
    expectRecipesMirrorSpec(AUTHORITY_CRAFTING_RECIPES);
  });

  it('fetch authority worker crafting recipes mirror specs/CRAFTING_RECIPES.json', () => {
    expectRecipesMirrorSpec(authorityWorker.__test.AUTHORITY_CRAFTING_RECIPES);
  });

  it('Node authority service repair costs mirror the client intervention table', () => {
    expectRepairCostsMirrorClient(AUTHORITY_REPAIR_COSTS);
  });

  it('fetch authority worker repair costs mirror the client intervention table', () => {
    expectRepairCostsMirrorClient(authorityWorker.__test.AUTHORITY_REPAIR_COSTS);
  });
});

/**
 * Test/debug fixture: a Free Play save with extra coins and compost scraps,
 * so the village seed stand (buying) and compost bin (depositing) can be
 * exercised without playing seasons first. Not imported by the game; used by
 * tests/village-e2e.mjs and handy from the dev console:
 *   const m = await import('./src/debug/village-fixture.js'); await m.seedVillageFixture();
 *   then reload and press Continue Free Play.
 */
import { createSandboxState } from '../game/state.js';
import { addItemToInventoryState } from '../game/inventory.js';

export const VILLAGE_FIXTURE_DEFAULTS = Object.freeze({
  // Coins in currency.balance (the shops and the market share it). Named
  // `tokens` for older callers.
  tokens: 200,
  driedLeaves: 4,
  plantMatter: 2,
  displayName: 'Village fixture',
});

export function createVillageFixtureState(options = {}) {
  const { tokens, driedLeaves, plantMatter, displayName } = { ...VILLAGE_FIXTURE_DEFAULTS, ...options };
  const state = createSandboxState();
  state.campaign.playerProfile.displayName = displayName;
  state.campaign.currency = { ...state.campaign.currency, balance: tokens };
  let inventory = state.campaign.inventory;
  if (driedLeaves > 0) inventory = addItemToInventoryState(inventory, 'dried_leaves', driedLeaves).inventory;
  if (plantMatter > 0) inventory = addItemToInventoryState(inventory, 'plant_matter', plantMatter).inventory;
  state.campaign.inventory = inventory;
  return state;
}

/** Write the fixture to the Free Play slot through the real persistence path. */
export async function seedVillageFixture(options = {}) {
  const { initGame, waitForSessionFlush } = await import('../game/game-init.js');
  const state = createVillageFixtureState(options);
  const session = initGame(state, { slot: 'freeplay' });
  await session.persistGameState();
  session.cleanup();
  await waitForSessionFlush();
  return state;
}

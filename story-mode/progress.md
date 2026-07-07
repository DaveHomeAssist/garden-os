Update 2026-07-07 Story Mode item addition authority pass:
- Routed `ADD_ITEM` through the Node authority service, fetch-compatible authority worker, and IndexedDB authority cache so inventory awards now enter the signed action ledger instead of staying purely local.
- Server authority now owns canonical item addition totals, rejects client-submitted inventory/slot state, rejects malformed item ids/counts, rejects inventory-full additions, and emits signed `lastItemAddition` ack metadata with the server-owned total count.
- Client reconciliation maps signed `lastItemAddition` acks back into local `ADD_ITEM` only when optimistic local inventory is behind the server total, so duplicate idempotency-key retries do not double-add items.
- Validation: focused authority/cache Vitest passed 59 tests; direct authority worker security test passed 33 tests; full Story Mode Vitest passed 35 files / 441 tests; `npm run build`, `npm audit --audit-level=high` with 0 vulnerabilities, `git diff --check`, and `node scripts/verify-all.mjs` passed all requested Garden OS gates.
- Deferred:
  - Tool repair authority remains deferred; repair material spend plus tool restoration still need one atomic server transaction.
  - Crafting remains partially local; material spends and crafted-item recipe validation are not yet server-owned even though item additions now route through authority.
  - Quest/festival/harvest reward rules remain local until reward derivation itself is server-owned.
  - Expanded-grid and multi-bed authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode water durability atomic authority pass:
- Routed live watering through one `APPLY_TOOL_INTERVENTION` authority transaction so water bonus, `lastWateredAt`, cooldown, and watering-can durability land together.
- Server authority and the fetch-compatible authority worker now validate water tool slot, item id, and durability cost against server-owned inventory before mutating canonical grid, cooldown, and tool durability.
- Signed `lastToolIntervention` ack metadata now includes water durability fields, and client reconciliation applies or skips the optimistic update only when cell, cooldown, and tool durability state match.
- Validation: focused authority/cache/intervention Vitest passed 68 tests; direct authority worker security test passed 31 tests; full Story Mode Vitest passed 35 files / 438 tests; `npm run build`, `npm audit --audit-level=high` with 0 vulnerabilities, isolated screenshot regression passed 16 screenshots, `git diff --check`, and `node scripts/verify-all.mjs` passed all requested Garden OS gates.
- Deferred:
  - Tool repair authority remains deferred; material awards and spend still need an authority-owned source before repair can be safely moved server-side.
  - Crafting/reward inventory mutations remain local until item awards, recipes, and crafting outputs are authority-owned.
  - Expanded-grid and multi-bed authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode atomic intervention authority pass:
- Routed protect/mulch tool interventions through one `APPLY_TOOL_INTERVENTION` authority action instead of separate local cell, consumable, and cooldown actions.
- Server authority and the fetch-compatible authority worker now validate starter-grid cell/tool/item/cooldown payloads, reject client-owned grid/inventory/intervention totals, spend the server-owned `pest_spray`/`mulch_bag` consumable once, update canonical cell/cooldown state, and emit signed `lastToolIntervention` ack metadata.
- Client reconciliation maps signed `lastToolIntervention` acks back into local `APPLY_TOOL_INTERVENTION` only when the optimistic state differs, so duplicate idempotency-key retries do not double-spend consumables.
- Validation: focused authority/cache Vitest passed 54 tests; direct authority worker security test passed 30 tests; full Story Mode Vitest passed 35 files / 436 tests; `npm run build`, `npm audit --audit-level=high` with 0 vulnerabilities, `git diff --check`, and `node scripts/verify-all.mjs` passed all requested Garden OS gates.
- Deferred:
  - Water tool use is still split between `WATER_CELL` and `SET_COOLDOWN`; this pass only makes protect/mulch atomic.
  - Tool repair authority remains deferred; repair material spend and repaired existing saves may need a fresh authority session before durable server-side repair is complete.
  - Crafting/reward inventory mutations remain local until item awards, recipes, and crafting outputs are authority-owned.
  - Expanded-grid and multi-bed authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode consumable spend authority pass:
- Routed starter consumable inventory spend (`REMOVE_ITEM` for `fertilizer_bag`, `pest_spray`, and `mulch_bag`) through the Node authority service, fetch-compatible authority worker, and IndexedDB authority cache.
- Server authority now owns canonical starter consumable counts, rejects client-submitted inventory/slots, rejects malformed item ids/counts, rejects insufficient server-owned inventory, and emits signed `lastItemRemoval` ack metadata with the server-owned remaining count.
- Client reconciliation maps signed `lastItemRemoval` acks back into local `REMOVE_ITEM` only when optimistic local inventory is above the server remaining count, so offline replay and duplicate idempotency-key retries do not double-spend.
- Kept repair/crafting materials local by routing only starter consumables; this avoids pretending the still-deferred repair/crafting systems are server-authoritative.
- Validation: focused authority/cache Vitest passed 51 tests; direct authority worker security test passed 27 tests; full Story Mode Vitest passed 35 files / 433 tests; `npm run build`, `npm audit --audit-level=high` with 0 vulnerabilities, and `node scripts/verify-all.mjs` passed all requested Garden OS gates.
- Deferred:
  - Tool repair authority remains deferred; repair material spend and repaired existing saves may need a fresh authority session before durable server-side repair is complete.
  - Crafting/reward inventory mutations remain local until item awards, recipes, and crafting outputs are authority-owned.
  - Atomic intervention transactions remain deferred: mulch/protect/water still span separate routed actions instead of one server transaction.
  - Expanded-grid and multi-bed authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Vercel authority runtime crash fix:
- Fixed the production Vercel authority crash that happened before CORS/preflight could respond: `api/session` imported `authority-service`, which imported `game/inventory`, which pulled browser/build-time `specs/*` aliases unavailable in the Vercel function runtime.
- Made the server authority inventory path self-contained for starter tools/materials, normalization, and tool durability mutation so API entrypoints no longer depend on the browser Story Mode inventory module.
- Added a Node-level `tests/vercel-authority-api-import.test.mjs` regression and wired it into `node scripts/verify-all.mjs`, so API entrypoints must import under plain Node without Vite/browser aliases.
- Validation: Vercel API imports passed under plain Node; focused Vercel authority/server/inventory/tool tests passed 46 tests; `vercel build` passed; full Story Mode Vitest passed 35 files / 430 tests; `npm run build`, `npm audit --audit-level=high`, `git diff --check`, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Production authority storage remains unconfigured until `GOS_AUTHORITY_HMAC_SECRET` and Upstash Redis REST URL/token envs are set in Vercel.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked by those missing envs; this pass fixes the runtime crash/CORS failure path.

Update 2026-07-07 Story Mode authority proof hardening pass:
- Added explicit engine replay proof that the same seed plus the same action ledger replays to the same checksum across fresh authority states, while a different seed produces a different checksum.
- Added IndexedDB persistence proof that an offline outbound queue survives a simulated app restart, drains once after reconnect, stores the ack, and does not resend after a second restart.
- Validation: focused authority proof Vitest passed 29 tests; full Story Mode Vitest passed 35 files / 430 tests; `npm audit --audit-level=high` found 0 vulnerabilities; `npm run build`, `git diff --check`, Story Mode screenshot regression, and `node scripts/verify-all.mjs` passed all requested Garden OS gates.
- Deferred:
  - Consumable inventory spend (`REMOVE_ITEM`) remains local until item awards/repairs/crafting are authority-owned.
  - Tool repair authority remains deferred; repaired existing saves may need a fresh authority session before durable server-side tool use is complete.
  - Atomic intervention transactions remain deferred: mulch/protect/water still span separate local actions.
  - Expanded-grid and multi-bed authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode fence removal and tool durability authority pass:
- Removed the remaining fence-read geometry from the live Story Mode bed by deleting per-crop support stake/cross-tie rendering; support crops and scoring logic remain intact, but the garden no longer draws fence-like posts through planted cells.
- Trimmed July heat-haze scenery so pale shimmer stays under the compact house face instead of continuing to the right where the house ends.
- Routed `USE_TOOL` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the first inventory side-effect authority mutation.
- Server authority now owns starter inventory tool durability for default tools and emits signed `lastToolUse` ack metadata.
- Added payload validation rejecting client-submitted inventory/slots, invalid slot indexes, non-tool slots, item mismatches, bad durability costs, and broken tools before mutation.
- Client reconciliation maps signed `lastToolUse` acks back into `USE_TOOL` only when local durability is higher, so optimistic tool use does not double-decrement.
- Visual proof: before/after default, house-edge, opposite, low, zoom, and mobile captures checked under `/var/folders/kc/_0fsy0wx01j8jqysccxyc9100000gn/T/garden-os-fence-angle-recheck-1783400038284` and `/var/folders/kc/_0fsy0wx01j8jqysccxyc9100000gn/T/garden-os-fence-angle-after-1783400223883`; standard screenshot regression proof saved under `/tmp/garden-os-story-screens-fence-tool-authority`.
- Validation: worker authority passed 25 tests; focused authority/cache Vitest passed 47 tests; full Story Mode Vitest passed 35 files / 428 tests; `npm audit --audit-level=high` found 0 vulnerabilities; `npm run build`, `git diff --check`, `node tests/story-mode-screenshot-regression.mjs`, `node scripts/verify-all.mjs`, and the develop-web-game client smoke passed. The web-game client reached the live Story Mode loop and captured `/tmp/garden-os-web-game-fence-tool-authority/shot-0.png`; it still reported the known static 404 and unprovisioned authority 503 console errors.
- Deferred:
  - Consumable inventory spend (`REMOVE_ITEM`) remains local until item awards/repairs/crafting are authority-owned.
  - Tool repair authority remains deferred; repaired existing saves may need a fresh authority session before durable server-side tool use is complete.
  - Richer non-fence support visuals for climbers are deferred; current fix intentionally removes the visible support structure.
  - Atomic intervention transactions remain deferred: mulch/protect/water still span separate local actions.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode fence angle follow-up:
- Rechecked default, right house-edge, low right edge, opposite, zoom, and mobile Story Mode views after user feedback that the fence still appeared where the house ends.
- Confirmed support geometry and July vertical heat panels remained absent (`supportMeshCount=0`, `summerHeatHaze.verticalPanelCount=0`) in each fresh angle capture.
- Found the remaining post-like read was from non-gameplay guide/particle visuals: Story row label markers were still partially visible, and summer butterfly billboard planes rendered as small square chips through/around the bed.
- Hid bed row markers outside Planner presentation and changed summer butterfly particles from square planes to rounded circle geometry while keeping the summer butterfly layer active.
- Visual proof: local after-captures saved under `/tmp/garden-os-fence-user-angles-after-butterfly-round-20260707`.
- Deferred:
  - Live GitHub Pages deploy/smoke after commit and push.
  - Any richer house re-model remains deferred; this pass only removes remaining fence/post reads from current Story visuals.

Update 2026-07-07 Story Mode cell condition authority pass:
- Routed `SET_DAMAGE`, `UPDATE_SOIL`, and `CARRY_FORWARD` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache.
- Server authority now owns canonical starter-grid `damageState`, `soilFatigue`, `carryForwardType`, and `mulched` fields, with signed `lastDamage`, `lastSoil`, and `lastCarryForward` ack metadata.
- Added fail-closed payload validation for malformed damage strings, out-of-range soil fatigue, non-boolean mulch flags, missing carry-forward payloads, and invalid starter-grid cell indexes before mutation.
- Client reconciliation maps signed condition acks back into local store actions only when optimistic local state differs, so offline replay does not mutate the same condition twice.
- Validation: focused authority/cache Vitest passed 44 tests; worker authority passed 23 tests; full Story Mode Vitest passed 35 files / 425 tests; `npm audit --audit-level=high` found 0 vulnerabilities; `npm run build`, `git diff --check`, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Atomic intervention transactions remain deferred: mulch still spends inventory, sets cooldown, and applies water bonus through separate client-side actions.
  - Event engine generation of damage, soil fatigue, and carry-forward effects is still local until event resolution authority is pulled server-side.
  - Expanded-grid and multi-bed condition authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode house-edge fence cut:
- Rechecked the live Story Mode scene from fresh default, right house-edge, opposite house-edge, low, and zoomed canvas captures after user feedback that the fence still started where the house ended.
- Found the remaining fence read was the blank grey house backdrop continuing past the door/porch like a long panel, plus the expanded second-floor/roof/gutter block and repeated siding texture.
- Cut the backdrop down to a compact flat house face, removed the repeated siding texture, removed the expanded second-floor/roof/gutter/chimney geometry, and trimmed the shrub/flower line so no straight wall continues past the house into the garden.
- Raised summer ambient/fill lighting after the existing screenshot readability gate correctly caught the removed wall reducing scene brightness.
- Visual proof: fresh local canvas captures checked default, house-edge, opposite, low, and zoom under `/tmp/garden-os-fence-user-report-after-compact-house`; screenshot regression proof saved under `/var/folders/kc/_0fsy0wx01j8jqysccxyc9100000gn/T/garden-os-story-screens-1783397878865`.
- Validation: focused scene tests passed 7 tests; full Story Mode Vitest passed 35 files / 422 tests; `npm run build`, `npm audit --audit-level=high`, `git diff --check`, and `node tests/story-mode-screenshot-regression.mjs` passed. The stock develop-web-game client reached the animated title screen but its fixed 5s selector click timed out on the New Game button; custom Playwright canvas captures were used for the actual multi-angle visual proof.
- Deferred:
  - Re-run live GitHub Pages smoke after commit/push/deploy.
  - The compact house remains a flat backdrop; richer house modeling is deferred until it can be added without any fence-read geometry.
  - `/Users/daverobertson/Desktop/Code/95-docs-personal/today.csv` is still absent, so no personal session CSV append was made.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode protection authority pass:
- Routed `SET_PROTECTION` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the next starter-grid protection mutation.
- Server authority now stores canonical cell `protected` state, rejects malformed non-boolean protection payloads, and rejects protect-true requests for empty starter-grid cells.
- Client reconciliation maps signed `lastProtection` acks back into `SET_PROTECTION` only when local protected state differs, so optimistic protect actions do not replay duplicate mutation.
- Validation: focused authority/cache Vitest passed 41 tests; worker authority passed 21 tests; full Story Mode Vitest passed 35 files / 422 tests; `npm run build`, `npm audit --audit-level=high`, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Inventory spend for pest spray remains client-side; this pass owns only canonical cell protection state.
  - Server-derived protection duration/cooldown/economy rules are still deferred; existing `SET_COOLDOWN` handles cooldown persistence separately.
  - Inventory spend, interventions as atomic transactions, quests, currency, market transactions, phase transitions, expanded-grid, and multi-bed authority are still deferred.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode remove crop authority pass:
- Routed `REMOVE_CROP` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the next starter-grid mutation.
- Server authority now validates valid planted cells, rejects optional crop-id mismatches, clears canonical `cropId`/`damageState`, and emits signed `lastRemoval` metadata with server-owned `cropId`.
- Client reconciliation maps signed `lastRemoval` acks back into `REMOVE_CROP` only when the matching crop is still present locally, so optimistic removal does not replay duplicate mutation.
- Validation: focused authority/cache Vitest passed 38 tests; worker authority passed 19 tests; full Story Mode Vitest passed 35 files / 419 tests; `npm run build`, `npm audit --audit-level=high`, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Inventory spend, interventions, quests, currency, market transactions, phase transitions, expanded-grid, and multi-bed authority are still deferred.
  - Server-derived remove timing and richer removal reasons are deferred; this pass authorizes the existing grid removal contract.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode fence recheck from side-angle feedback:
- Found a remaining fence-read artifact that was not a fence mesh: the finite grass plane exposed a hard straight back edge when orbiting past the house wall, so it appeared to start where the house ended.
- Enlarged the Story Mode ground plane from 40x40 to 360x360 and expanded the camera far plane plus sky dome so reachable side/low camera angles no longer expose a straight terrain/sky boundary.
- Removed the remaining straight house-base foundation rail and distant right-side block silhouettes because they still looked like fence/side-yard geometry in house-edge captures and are not gameplay-critical.
- Raised summer ambient/fill slightly after screenshot regression caught the larger terrain as below the readability gate.
- Verification: local default, house-edge, low, zoom, and mobile captures checked under `/var/folders/kc/_0fsy0wx01j8jqysccxyc9100000gn/T/garden-os-fence-final-1783394534064`; develop-web-game smoke captured `/tmp/garden-os-web-game-fence-fix/shot-0.png`; `npm test`, `npm run build`, `node tests/story-mode-screenshot-regression.mjs`, and `node scripts/verify-all.mjs` passed.

Update 2026-07-07 Story Mode fence edge correction:
- Removed the remaining fence-read house-edge scenery from Story Mode: right-side rain barrel, AC unit, trash cans, blue crate, brick patch, utility tag, mortar scars, left neighbor wall/roof/foundation cluster, alley strip, distant side blocks, repeated July crack/weed rails, and the straight mulch strip under the shrubs.
- Removed the bottom-right `#app::after` repeating-linear-gradient overlay that survived as a fence-like striped rectangle over the gameplay canvas.
- Changed the procedural grass texture from line strokes to soft seeded mottling, removed lawn bump mapping, and changed grass tuft placement from modular rows to seeded scatter so ground detail does not form repeated rail bands at oblique camera angles.
- Kept the backdrop to the house wall, stoop, shrubs, non-linear July stains, heat shimmer, bed, and core gameplay props.
- Added screenshot regression assertions that the removed house-edge/fence-read cues and the bottom-right striped CSS overlay stay absent while `rowhouse-siding`, `phillies-pennant`, and `july-ground-stain` remain available as place cues.
- Raised summer ambient/fill lighting just enough to keep the post-cut scene above the existing screenshot readability gate.
- Visual proof: local seeded summer captures checked default, both house-edge orbits, low/zoom angles, and mobile under `/tmp/garden-os-fence-angles-20260707-css-fix`; screenshot regression proof saved under `/tmp/garden-os-story-screens-fence-css-fix-pass`.
- Final validation: Story Mode screenshot regression passed, `npm test` passed 35 files / 416 tests, and `npm run build` passed after the CSS stripe removal. Earlier in this correction pass, `npm audit --audit-level=high` found 0 vulnerabilities, `node scripts/verify-all.mjs` passed all requested Garden OS gates, and the develop-web-game client reached gameplay with only the known static 404 and unprovisioned authority 503 console errors.
- Deferred:
  - Live GitHub Pages deployment verification after commit/push.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode cooldown authority pass:
- Routed `SET_COOLDOWN` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the first tool-state authority mutation.
- Server authority now stores canonical `toolCooldowns` and emits `lastCooldown` ack metadata with normalized `key`, `toolId`, `cellIndex`, and `until`.
- Added cooldown payload validation so clients must submit a `tool_cell` key and a finite non-negative expiry timestamp before mutation.
- Validation: focused authority/cache Vitest passed 35 tests; worker authority passed 17 tests; full Story Mode Vitest passed 35 files / 416 tests; `npm run build`, `npm audit --audit-level=high`, screenshot regression, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Server-derived cooldown duration rules are still deferred; this pass authorizes persistence/replay of the existing cooldown payload contract.
  - Tool durability, inventory spend, interventions, quests, currency, market transactions, phase transitions, expanded-grid, and multi-bed authority are still deferred.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-07 Story Mode fence recheck from user screenshot feedback:
- Re-ran local Story Mode with new default, side-orbit, zoomed house-edge, low house-edge, and mobile screenshots under `/tmp/garden-os-fence-user-recheck-20260707-local`.
- Found the remaining fence read was coming from unnamed scenery: repeated pale pebble rows around the bed, porch support posts/awning pieces, a right-edge neighbor wall/roof cluster, the utility pole/wire, and a bright alley strip.
- Removed those linear/repeated scenery forms plus the remaining house-edge downspout, and kept the backdrop to the house wall, compact stoop, shrubs, and non-linear yard props.
- Added a screenshot-regression-only WebGL readback flag so the harness can preserve the drawing buffer for pixel checks without changing normal gameplay renderer behavior.
- Raised summer ambient/fill lighting slightly so the bed remains readable after removing the bright fence-like pebble rows.
- Deferred until deploy smoke: live GitHub Pages verification after commit/push.

Update 2026-07-06 Story Mode harvest authority pass:
- Routed `HARVEST_CELL` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the third real gameplay grid mutation.
- Server authority now clears the starter-grid cell from canonical state and emits `lastHarvesting` ack metadata with server-owned `cropId`, `harvestedAt`, and `yieldCount: 1`.
- Added harvest payload validation so clients can harvest only a valid planted starter-grid cell, crop ids must match server-owned state, and client-submitted `yield`, `yieldCount`, inventory, pantry, currency, recipes, or harvest-result totals are rejected before mutation.
- Duplicate idempotency-key lookups now happen before action-specific validation in both authority runtimes, so a valid first harvest retry does not get rejected against the already-empty canonical cell.
- Client reconciliation now maps authoritative `lastHarvesting` acks back into `HARVEST_CELL` only when the matching crop is still present locally, preventing duplicate optimistic inventory/pantry credit.
- Visual fix: removed the remaining fence-reading scenery from Story Mode's garden view, including house-wall board strips, porch rail/balusters, the freestanding porch screen-frame, broad gravel/concrete path strips, the alternate player-plot fence perimeter, lingering fence/gate comments, the unused `env-fence` sprite registration, and the unreferenced fence texture.
- Browser smoke: local Vite Story Mode rendered clean default, side, opposite-side, and zoomed house-edge views with no fence-like geometry across the garden at `/tmp/garden-os-fence-recheck-20260706-v5` and `/tmp/garden-os-fence-recheck-20260706-v5-default`.
- Validation: full Story Mode Vitest passed 35 files / 413 tests; worker authority passed 15 tests; `npm run build`, `npm audit --audit-level=high`, and `node scripts/verify-all.mjs` passed.
- Deferred:
  - Full inventory, pantry, recipe, currency, tool durability, cooldown, intervention, quest, and phase-transition authority are still deferred; this pass owns harvest grid occupancy and canonical single-yield metadata only.
  - Existing local saves with pre-authority planted cells can still need fresh authority replay before harvest acks succeed server-side.
  - Expanded-grid and multi-bed harvest authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-06 Story Mode water authority pass:
- Routed `WATER_CELL` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the second real gameplay grid mutation.
- Extended server-owned starter-grid authority cells with `interventionBonus` and `lastWateredAt`, plus canonical `lastWatering` ack metadata.
- Added payload validation so water actions require a valid starter-grid cell, an already-planted crop in server authority state, a finite 0..1 bonus, and a finite/null `wateredAt`.
- Client reconciliation now maps authoritative `lastWatering` acks back into `WATER_CELL` and skips duplicate local replay when the optimistic water state already matches the signed ack.
- Visual follow-up: removed the bed trellis/front guard, trellis snow caps, old trellis bird perch, and the stray cross-yard back fence at the garden bed line.
- Validation: focused authority Vitest passed 4 files / 38 tests; worker authority passed 12 tests; full Story Mode Vitest passed 35 files / 409 tests; `npm run build`, `npm audit --audit-level=high`, and `node scripts/verify-all.mjs` passed.
- Browser smoke: local Vite Story Mode launched into the live loop, rendered one canvas, exposed `render_game_to_text()`, and captured a planning/cutscene frame at `/tmp/garden-os-web-game-water-authority-20260706/direct-smoke.png`. Expected console error remains `503` from the unprovisioned live authority API.
- Deferred:
  - Tool durability, cooldown, inventory cost, harvest, interventions, currency, quest, and phase transitions are still not routed through authority.
  - Existing local saves with pre-authority planted cells can still need fresh authority replay before water acks succeed server-side.
  - Expanded-grid and multi-bed watering authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-06 Story Mode plant authority pass:
- Routed `PLANT_CROP` through the Node/Vercel authority service, fetch-compatible authority worker, and IndexedDB authority cache as the first real gameplay grid mutation.
- Added server-owned starter-grid authority state plus payload validation so clients can submit only `{ cellIndex, cropId }`; out-of-range cells or missing crop ids are rejected before mutation.
- Client reconciliation now maps authoritative `lastPlanting` acks back into `PLANT_CROP` and skips duplicate local replay when the optimistic cell already matches the signed ack.
- Validation: focused authority Vitest passed 4 files / 35 tests; worker authority passed 10 tests; full Story Mode Vitest passed 35 files / 406 tests; `npm run build`, `npm audit --audit-level=high`, and `node scripts/verify-all.mjs` passed.
- Browser smoke: local Vite Story Mode launched into the live loop, rendered one canvas, exposed `render_game_to_text()`, and reported 0 / 32 planted in chapter 1 planning. Expected console error remains `503` from the unprovisioned live authority API.
- Deferred:
  - Expanded-grid and multi-bed planting authority are still deferred; current authority grid matches the starter 8x4 Story Mode bed.
  - Harvest, water, interventions, inventory, currency, quest, and phase transitions are still not routed through authority.
  - Live signed `/session` -> `/action` -> `/ack/verify` remains blocked until Vercel HMAC and Redis REST envs are provisioned.

Update 2026-07-06 Story Mode zone authority pass:
- Added `actionType` to server acks so client reconciliation no longer guesses from full authority patches.
- Routed `ZONE_CHANGED` through the Vercel/Node authority service and the fetch-compatible authority worker, with canonical `currentZone`, `visitedZones`, and `lastSpawnPoint` in authority state.
- Updated the IndexedDB authority cache so live `ZONE_CHANGED` actions queue like selected crop/tool actions and duplicate server zone acks do not replay zone-transition side effects.
- Fixed Vercel authority CORS preflight so the API returns `204` for `OPTIONS` before requiring storage env, while still failing closed for real requests when env is missing.
- Validation:
  - `npm test -- src/engine/authoritative-engine.test.js src/engine/authority-cache.test.js src/server/authority-service.test.js src/server/vercel-authority.test.js` passed with 32 tests.
  - `node --test tests/authority-worker.test.mjs` passed with 8 tests.
  - `npm test` passed with 35 files / 403 tests.
- Deferred:
  - Vercel production authority remains blocked until `GOS_AUTHORITY_HMAC_SECRET` and Redis REST URL/token are provisioned.
  - Gameplay mutation families beyond selected crop, active tool, and zone travel are still intentionally not routed through authority.
  - Live `/session` -> `/action` -> signed ack proof still requires the Vercel env fix and redeploy.

Update 2026-07-06 Story Mode authority live wiring pass:
- Wired the live crop palette and Let It Grow tool HUD through the existing authority-routed store actions instead of keeping them as UI-only state.
- Added client `/session` bootstrap before draining queued `/action` envelopes when an authority URL is configured.
- Added the deployed Vercel authority API URL to `index.html` as the static `garden-os-authority-url` meta config so GitHub Pages can exercise the authority path without operator localStorage setup.
- Validation:
  - `npm test -- src/engine/authority-cache.test.js src/ui/tool-hud.test.js` passed with 16 tests.
  - `npm test` passed with 35 files / 400 tests.
- Deferred:
  - Vercel production authority remains blocked until `GOS_AUTHORITY_HMAC_SECRET` and Redis REST URL/token are provisioned.
  - Gameplay mutation families beyond `SET_SELECTED_CROP` and `SET_ACTIVE_TOOL` are still intentionally not routed through authority.
  - End-to-end live `/session` -> `/action` -> signed ack proof still requires the Vercel env fix and redeploy.

Original prompt: Build the Garden OS Story Mode cutscene and character animation layer with chapter intros, event reveals, harvest result scenes, animated 2D portraits, camera choreography, and mobile-friendly dialogue flow. Keep the game engine responsible for facts and the narrative layer responsible for presentation.

- Added Phase 2 engine work earlier: chapter rollover, real event draws, harvest journaling, crop growth stages.
- Current pass is replacing prototype narrative UI with the cutscene-machine + render-only dialogue panel architecture.
- Existing secondary UI like `event-card.js` and `harvest-reveal.js` may remain for intervention choice and score breakdown after cutscene playback.
- Playwright/browser automation is still unreliable in this environment due Chrome sandbox/GPU failure; use `npx vite build` as the hard gate and do local manual smoke tests in browser.
- Be careful with saved campaigns: only campaign data is persisted, so `main.js` must rebuild a fresh `SeasonState` from saved campaign chapter/season on continue.

Update 2026-03-21:
- Added `src/data/speakers.js`, `src/data/portraits.js`, `src/data/cutscenes.js`, and `src/game/cutscene-machine.js`.
- Replaced the old phase-specific dialogue helper with a render-only `createDialoguePanel()` implementation.
- `phase-machine.advance()` now returns structured result objects with narrative triggers instead of just mutating season state silently.
- `garden-scene` now exposes camera preset and mood APIs for cutscene playback.
- `main.js` now wires cutscene triggers, input gating, skip/advance/fast-forward, and uses chapter start cutscenes instead of the previous hardcoded intro overlay.
- Build verification passed: `npx vite build`.
- Remaining follow-up: local manual smoke test for queue interruption rules and mood persistence, since headless browser validation is still blocked in this environment.

Update 2026-03-21 keepsakes pass:
- Added canonical keepsake registry in `src/data/keepsakes.js`.
- Campaign state now persists `keepsakes`, and season state now stores the last resolved event plus newly earned keepsakes for the current chapter flow.
- Harvest scoring now exposes `yieldList` and `recipeMatches`, which are used to update pantry/recipes and evaluate keepsake triggers after harvest.
- `main.js` now awards canonical keepsakes for the first save, first crop in the first cell, chapter 8 review, Mom's Sauce in chapter 11+, block-party recipe completion, frost damage, and the Phillies failure approximation from the live event deck.
- `harvest-reveal.js` now shows recipe matches and newly earned keepsakes so unlocks are visible in the results flow.
- Note: some keepsake triggers are approximate against the current event deck wording. `first_frost_marker` keys off frost-themed events plus negative affected cells, and `onion_mans_scorecard` keys off a Phillies-themed non-positive event plus poor row performance.

Update 2026-03-21 intervention targeting pass:
- Intervention choice is no longer auto-targeted/random. `protect`, `mulch`, `companion_patch`, and `prune` now require an explicit cell click, while `swap` is a two-step pick flow.
- Added `getTargetableCells()` to `src/game/intervention.js` so the UI can request valid targets before applying an intervention.
- `garden-scene` now exposes persistent target highlighting via `setTargetableCells()` / `clearTargeting()` and keeps hover visuals constrained to valid target cells during targeting.
- `main.js` now owns an `interventionTargetState`, shows a dedicated targeting prompt sheet, blocks unrelated panel toggles during targeting, and only persists state after the target is confirmed and the event effect is resolved.
- `event-card.js` now explicitly tells the player that choosing an intervention type may require a follow-up cell pick.
- Validation: `npx vite build` passed after the targeting changes. The `develop-web-game` Playwright client also produced screenshots successfully, but full browser-tool validation is still blocked in this environment by the same Chrome sandbox / GPU crash when opening an interactive Playwright page.

Update 2026-03-21 mobile pass:
- Relaxed the global touch policy so sheets can scroll again: `html/body` now use `touch-action: manipulation`, while `#viewport` keeps `touch-action: none`.
- Bottom sheets now use touch scrolling (`-webkit-overflow-scrolling`, `overscroll-behavior`, `touch-action: pan-y`) so event cards, backpack, and bug reports behave better on phones.
- Enlarged touch targets for dismiss buttons, crop cards, intervention cards, and the mobile FAB cluster.
- Added mobile-specific layout rules for the HUD, toasts, pause menu, bug panel, and panel heights at <= 640px / 420px / 380px.
- Event cards now use reusable intervention-button classes and explicit “tap a card, then tap the highlighted bed cell” chips.
- Intervention targeting prompt now shows valid-target count, step count for swap, and touch-oriented copy rather than desktop-flavored instructions.
- Validation: `npx vite build` passed, and the `develop-web-game` screenshot capture still renders the HUD / cutscene / FAB layout cleanly after the responsive changes.

Update 2026-03-21 review-flow cleanup:
- Fixed a dead-feeling season-end path in `src/main.js`: after the harvest reveal closes, story mode now auto-consumes the passive `REVIEW` hop and goes straight into the season-complete transition trigger.
- This removes the extra Enter/Next presses that previously walked `HARVEST -> REVIEW -> TRANSITION` even though `REVIEW` had no dedicated screen of its own.
- Confirmed the current winter screenshot confusion is not crop carry-over: `story-mode` creates a fresh grid on rollover. Visible plants are always from the current season grid; the pale/gray look comes from the winter scene treatment and the specific crop mesh being rendered.
- Validation: `npx vite build` passed after the phase-flow patch.

Update 2026-03-21 winter readability pass:
- `garden-scene.js` now renders occupied winter plots as clearly dormant: frosted soil tint, desaturated crop tint, and reduced growth scale so they stop reading like active summer herbs under a dark filter.
- Winter occupied cells now intentionally look pale/frosted against the darker empty soil, which makes “occupied but dormant” legible at a glance.
- `main.js` phase helper copy now explicitly tells the player that pale plots in winter are dormant occupied cells.
- Validation: `npx vite build` passed after the winter visual pass.

Update 2026-03-21 commit phase removal:
- Removed the passive `COMMIT` phase from `story-mode` entirely. `Commit Plan` now advances directly from `PLANNING` into `EARLY_SEASON`.
- Updated phase order, phase labels, calendar/HUD logic, helper copy, and top-rail action labels to match the simplified flow.
- The top HUD still exposes an explicit action button, but the misleading `CONFIRM PLAN` phase label is gone.
- Validation: `npx vite build` passed after removing the commit phase.

Update 2026-03-21 dialogue/storyflow planning:
- Added an implementation-ready narrative rework spec at `docs/garden-os-writers-room/STORY_MODE_DIALOGUE_REWORK_SPEC.md`.
- The spec diagnoses the current repetition problem in `story-mode` reactive dialogue, especially the overuse of generic `Garden GURL <-> Critters` event exchanges.
- It defines speaker-role rules, seasonal voice distribution, event-family routing, authoring rules, and a 3-pass implementation plan.
- Recommended next content step: restructure `story-mode/src/data/cutscenes.js` before doing any prose-only polish.

Update 2026-03-21 dialogue structure pass:
- `phase-machine` event triggers now carry richer event context into the cutscene layer, including category, valence, severity, carry-forward effect, and raw deck commentary.
- `src/data/cutscenes.js` now builds dynamic `event_drawn` cutscenes from the live event deck commentary instead of always falling back to the same small set of generic event reaction scenes.
- Speaker selection is now routed by event family + season + valence, so weather / critter / neighbor / family / infrastructure beats stop defaulting to the same `Garden GURL <-> Critters` pairing every season.
- Static event scenes remain as fallback coverage, but dynamic event commentary now takes priority whenever the deck supplies character-specific lines.
- Validation: `npx vite build` passed. A Playwright smoke run still booted the chapter intro / planning scene and captured a clean screenshot after the refactor, though the client emitted one `ERR_CONNECTION_REFUSED` console artifact while running against the local preview server.

Update 2026-03-21 reactive dialogue cleanup:
- Trimmed the large static `event_drawn`, `intervention_used`, and `harvest_complete` scene banks down to lightweight fallbacks. The reactive variety now lives in dynamic builders instead of many overlapping static cutscenes.
- `main.js` now emits real `intervention_used` narrative triggers with intervention id, related event context, target summary, and target crop names, so intervention dialogue can finally vary at runtime instead of being dead data.
- `phase-machine` harvest triggers now include `yieldCount`, `yieldList`, and `recipeMatches`, allowing harvest scenes to react to recipe progress and not just letter grade.
- `cutscenes.js` now dynamically builds intervention reactions from the action + season + event family, and harvest reactions from grade + season + recipe progress, including a dedicated Mom's Sauce branch.
- Validation: `npx vite build` passed after the trigger/runtime changes. Playwright smoke still boots the game and captures the intro/planning scene without breaking the dialogue panel.

Update 2026-03-21 Calvin opener visibility fix:
- Chapter 1's `sheepdog-run` cue now uses a bed-to-access diagonal path that stays in the visible middle of the `chapter-intro` frame instead of running along the lower edge under the dialogue box.
- After the first opener capture still missed him, moved Calvin's cue start even farther into the center-left soil area and increased the sheepdog scale again so the very first intro frame already contains him.
- Reworked the chapter 1 opener into two explicit Calvin cues: `sheepdog-bed` on the narrator beat so Calvin is visibly sitting in the bed, then `sheepdog-run` on GURL's line so she is yelling at an actual on-screen dog instead of an off-screen reference.
- Added a floating Calvin thought bubble to the `sheepdog-bed` hold cue so the opener still reads clearly even in the wide chapter-intro camera where the dog model alone can get visually lost against the bed.
- Extended the opener cue duration so Calvin remains on screen through the first line exchange instead of vanishing before GURL calls him out.
- `garden-scene.playSceneCue()` now fully resets Calvin's mesh opacity, dust puff pool, tongue visibility, and fade state before every run, so a prior fade-out cannot leave him effectively invisible on the next trigger.
- Slightly increased the sheepdog scale for readability in the wide intro framing.

Update 2026-03-21 scenery refinement from real-bed reference:
- Tuned `src/scene/scenery.js` toward the real garden silhouette instead of the earlier generic yard backdrop.
- Replaced the chunkier fake porch/wall mass with a flatter house-wall backdrop and siding treatment so the background reads more like the real bed reference and less like a blocking foreground object.
- Kept the gravel work area / house-presence direction from the earlier scene pass, but reduced the amount of geometry fighting the camera.
- Validation: `npx vite build` passed after the scenery refinement. Browser smoke in this environment remains noisy, so build stayed the hard gate.

Update 2026-03-21 front-of-bed camera rebuild:
- Reoriented `story-mode` so the default camera and all narrative camera presets begin from the front/access side of the bed looking back toward the house wall, matching the real garden layout instead of starting from behind the trellis.
- Updated `src/scene/camera-controller.js` to use front-facing orbit defaults too, so touch/mouse camera control no longer snaps the player back to the old rear view on boot.
- Simplified `src/scene/scenery.js` by removing the extra generic rowhouse block and keeping the flatter house wall / porch / neighbor composition behind the bed as the actual backdrop.
- Validation: `npx vite build` passed, and a fresh Playwright screenshot at `story-mode/output/web-game/shot-0.png` confirmed the opening frame now shows the front guard in the foreground and the house behind the garden.

Update 2026-03-21 scene-orientation correction:
- The first front-yard pass still read wrong in play because the house wall mass sat too close to the frame and still looked like it belonged on the access side during cutscenes.
- Pushed the house wall, porch, and neighbor structures farther back behind the trellis plane in `src/scene/scenery.js`, and tightened the cutscene/default camera presets in `src/scene/garden-scene.js` so the bed stays centered and the wall reads unmistakably as the back side of the garden.
- Validation: `npx vite build` passed again, and the refreshed screenshot in `story-mode/output/web-game/shot-0.png` now shows the wall running behind the trellis rather than beside the access path.

Update 2026-03-21 season-opening sheepdog animation:
- Added `sceneCue: 'sheepdog-run'` to season-opening intro beats in `src/data/cutscenes.js` and surfaced `sceneCue` through the cutscene machine UI state.
- Added a visible sheepdog run overlay to `src/ui/dialogue-panel.js` / `assets/css/theme.css` so the intro beat gets a readable cross-screen motion pass even when 3D scene animation is subtle.
- Kept a matching in-scene sheepdog cue path in `src/scene/garden-scene.js`, but the dialogue-layer animation is now the reliable presentation layer for the opening-season beat.
- Validation: `npx vite build` passed, and a fresh screenshot at `story-mode/output/web-game/shot-0.png` now shows the sheepdog crossing during the opening narration.

Update 2026-03-21 in-scene sheepdog rebuild:
- Removed the dialogue-layer sheepdog overlay entirely from `src/ui/dialogue-panel.js` and `assets/css/theme.css`. The season-opening dog beat is now scene-only.
- Rebuilt the sheepdog in `src/scene/garden-scene.js` as an articulated world actor with a shadow blob, torso/head/tail pivots, and four two-segment legs animated procedurally during the run.
- Season-opening narrator beats now use a dedicated `chapter-intro` camera preset so the dog reads in the opening frame without covering the bed UI.
- Validation: `npx vite build` passed, and Playwright capture against the preview build shows the real in-scene sheepdog in `story-mode/output/web-game/shot-0.png`.

Update 2026-03-21 winter review usability pass:
- `story-mode` already had the winter review port in place, but the overlay behaved like another dead screen on laptop-height viewports because the action row could fall below the fold.

Update 2026-03-27 Phase 0 baseline check:
- Verified `story-mode` production build passes from the current working tree with `npm run build`.
- Verified `node --check src/ui/ui-binder.js` passes, so the earlier duplicate `zoneManager` parse blocker is no longer present in the current tree.
- Confirmed `src/game/save.test.js` already contains the intended localStorage teardown ordering fix (`clear()` before `vi.unstubAllGlobals()`), so the code side of the save-harness repair appears to be landed.
- Full `vitest` runs did not return usable output in this shell, so suite-level verification is still outstanding and should be rerun in a cleaner test shell before declaring Phase 0 fully complete.
- Did not edit the root docs because `CLAUDE.md`, `IMPLEMENTATION_PLAN.md`, and `STATUS_CHECK.md` were already dirty in the repo; treat those as in-progress user-owned changes and align them only after confirming the intended working copy.

Update 2026-04-02 shared-theme + live-preview consolidation:
- Linked `story-mode/index.html` to the repo-level `garden-os-theme.css` and moved Story Mode toward shared alias tokens instead of maintaining a fully separate surface vocabulary.
- Added shared artifact/kicker/stamp helper classes plus alias variables in `garden-os-theme.css` so planner and Story Mode can converge on the same paper/journal primitives.
- Patched `scripts/local-dist-transform-server.mjs` to serve both `/garden-os/story-mode-live/...` and Vite's emitted `/garden-os/story-mode/...` asset paths from the same `dist/` tree, which fixes the prior local-preview 404 mismatch after builds.
- Validation:
  - `npm run build` passed on 2026-04-02 after the shared-theme import and preview-server patch.
  - `curl -I http://127.0.0.1:4174/garden-os/story-mode-live/` returned `200`.
  - `curl -I http://127.0.0.1:4174/garden-os/story-mode/` returned `200`.
  - `curl -I` against emitted JS assets under `/garden-os/story-mode/assets/...` returned `200`, confirming dynamic-import/base-path compatibility on the local preview server.
- Remaining blockers:
  - Full `vitest` still needs a deterministic shell; Phase 0 test closure is still open.
  - Browser-tool visual QA is still limited by the current Playwright MCP environment, so final headed/manual sign-off remains outstanding.
  - Shared visual tokens now exist, but planner and Story Mode still carry large local CSS blocks; a true token cleanup pass is still a separate refactor, not done by this patch.

TODO / next-agent suggestions:
- Re-run `npx vitest run src/game/save.test.js` and full `npx vitest run` in a shell that produces deterministic output; capture exact pass/fail counts.
- Once tests are confirmed, update the already-dirty root docs to reflect the now-green build baseline and the `story-mode/` toolchain reality.
- After Phase 0 is explicitly closed, take only one new feature slice next: planner What-If / Simulate mode.

Update 2026-06-24 open-world QA patch pass:
- Patched verified P1/P2 open-world findings from the live story-mode audit: starter neighborhood forage progression, skipped opening cutscene resume persistence, hidden controls focus state, market doctrine copy, missing sprite references, route drift to `/story-mode/`, and corrupt save handling.
- Added store-backed `MARK_CUTSCENE_SEEN` persistence and changed chapter-start fallback selection so a seen specific chapter intro does not replay through `chapter-generic-intro`.
- Updated `docs/UI_ISSUES_TABLE.html` with resolved open-world rows 046-052 and `data-last-verified="2026-06-24"`.
- Validation: `node src/data/cutscenes.test.js` passed 1828/1828; full `npm test` passed 29 files / 353 tests; `npm run build` passed; `node scripts/verify-all.mjs` passed all requested Garden OS gates; local Playwright smoke verified title focus, cutscene skip persistence, reload/continue no replay, missing asset cleanliness, and corrupt save warning UI.
- Local browser screenshot artifacts: `story-mode/output/web-game/open-world-qa/title.png`, `opening-cutscene.png`, `after-skip-play.png`, and `corrupt-save.png`.
- Closeout dependency at patch time: commit and push to `main`, wait for GitHub Pages workflow, then run live Story Mode smoke before closing Status Runs `RUN-20260624-1830` green.

Update 2026-03-22 scene/UI polish pass from live screenshot baseline:
- Removed the clothesline wire + hanging towel from `src/scene/scenery.js` while keeping the poles. In the current camera framing they were reading as stray debug geometry across the yard.
- Reworked row labels in `src/scene/bed-model.js` into darker pill-backed sprites with brighter text and stronger opacity so `Back (Wall)` / `Front (Access)` remain readable against the soil and gravel.
- Softened the crop accent sticker layer in `src/scene/garden-scene.js` by reducing opacity/scale/lift and re-enabling depth testing, so the procedural crop meshes carry more of the scene and the sprite cards stop dominating mid-season beds.
- Slimmed the backpack rail in `src/ui/backpack-panel.js` and `index.html` by narrowing the desktop panel container and shrinking inventory slot tiles.
- Validation:
  - `node --check` passed for `src/scene/bed-model.js`, `src/scene/scenery.js`, `src/scene/garden-scene.js`, and `src/ui/backpack-panel.js`.
  - `git diff --check` passed for the touched files.
  - `npm run build` was started under Node 22 and reached `vite build`, but remained silent/stalled in this shell before completion, so local manual smoke is still the practical next check.

Update 2026-03-22 gameplay guide layout port:
- Rebuilt `src/ui/gameplay-guide.js` around the stronger standalone guide mock instead of the older stacked-card sheet.
- The live overlay now uses a left-nav + section-content shell with richer section styles: overview status table, story loop steps, scoring factors + grade grid, intervention carry-forward table, scene-style cards, tool matrix, and controls tables.
- Kept the guide grounded in the actual current build contract: Story Mode live, Planner Mode not yet a menu path, Let It Grow tool layer gated/experimental, and the new planner/story/celebration scene preset framing.
- Extended `index.html` with dedicated gameplay-guide nav/table/callout/grade/tool styles and widened the sheet shell so the guide reads like a real in-game manual rather than a dev note stack.
- Validation:
  - `node --check` should be run for `src/ui/gameplay-guide.js`.
  - `git diff --check` should be run for the guide files.
  - Manual smoke next: open title screen -> `How To Play`, click each left-nav section, confirm section switching and mobile collapse behavior.

Update 2026-03-22 follow-up 3D cleanup after guide port:
- Removed the remaining clothesline poles from `src/scene/scenery.js`; the lane was still reading as a stray diagonal guide in the active camera framing.
- Removed the right-side neighbor-wall / roof plane from `src/scene/scenery.js`; it was reading like a floating panel more than a believable backdrop.
- Pulled row markers and label sprites inward in `src/scene/bed-model.js` so the left labels are less likely to clip off-screen.
- Increased sprite accent scale in `src/scene/garden-scene.js` so planted cells read a bit more clearly from the default camera without bringing back the old card-overlay problem.
- Tightened `src/ui/winter-review.js` into a bounded review panel with an internal scroll region, persistent explanatory footer copy, and a pinned action row so `Open Backpack` / `Continue` stay visible while the review content scrolls.
- The winter review now reads like an actual tool: year recap, soil + carry-forward map, last harvest summary, recipes/keepsakes, strongest/weakest cells, next-spring hints, and a visible exit into the next chapter.
- Validation: `npx vite build` passed. Forced-winter Playwright fixtures confirmed both the review screen layout (`output/web-game/winter-review-direct-oneshot/shot-0.png`) and the follow-through into the season-complete transition (`output/web-game/winter-review-continue/shot-0.png`).

Update 2026-03-21 Calvin intro/talk bubble pass:
- Calvin is now a real speaker in the portrait system instead of dead data in `src/data/speakers.js`. Added `calvin` to `src/data/portraits.js`, surfaced `thoughtBubble` through `src/game/cutscene-machine.js`, and gave `src/ui/dialogue-panel.js` / `assets/css/theme.css` a dedicated thought-bubble presentation so Calvin reads as instinctive inner monologue rather than a normal narrator badge.
- Re-timed the Chapter 1 intro in `src/data/cutscenes.js` so the sheepdog run starts on the opening narrator beat and persists into Garden GURL's callout. The GURL yell now stays on the wider intro framing instead of triggering the run too late on a tighter shot.
- Updated `src/data/cutscenes.test.js` to recognize Calvin as a valid authored speaker.
- Validation: `npx vite build` passed and `node --experimental-vm-modules src/data/cutscenes.test.js` passed (`1827 passed, 0 failed`).
- Automation note: the Playwright client still captured the updated opening frame (`output/web-game/shot-0.png`), but this environment remained flaky for deterministic mid-cutscene advancement, so the narrator-opener screenshot is verified while the exact Calvin callout frame still needs one quick headed/manual smoke check next pass.

Update 2026-03-21 scoped 3D polish pass:
- Tightened the front-facing 3D framing in `src/scene/garden-scene.js` and `src/scene/camera-controller.js` so the bed fills more of the frame, cutscene presets sit lower/closer, and free orbit no longer drifts back into the older high generic overview.
- Rebalanced seasonal lighting in `src/scene/garden-scene.js`: brighter front-biased sun/fill, lighter fog, and slightly hotter exposure so the bed, trellis, and side props read cleanly in the opening planning scene instead of sinking into the darker backdrop.
- Refined `src/scene/scenery.js` for background depth and readability: added a foundation strip + mulch border + hedge planting bed behind the wall, porch rail/steps, a rain barrel by the downspout, and retuned seasonal accent color updates for shrubs/flowers.
- Moved several work-zone props inward so they stop clipping against the lower frame edges, pushed the clothesline / telephone pole / distant rooftops farther out of the main composition, and rebuilt the porch screen door as an actual frame instead of a dark slab.
- Reduced the sheepdog scale and shifted its default run line farther down the access path so it reads as scene action without blocking the bed as aggressively during chapter intros.
- Validation: `npx vite build` passed. Playwright capture at `output/web-game/polish-pass/shot-0.png` confirmed the new framing and prop placement, but one limitation remains: the environment here is still noisy for repeated interactive browser checks, so the final visual sign-off is based on that static capture plus the clean build.

Update 2026-03-22 visible Let It Grow surfacing pass:
- Added a fourth `Crafting` tab to `src/ui/backpack-panel.js` with recipe cards, output badges, craftability state, material shortfall rows, and live `Craft` actions.
- Extended `src/ui/ui-binder.js` backpack payloads with recipe output defs and crafting-skill progress so the backpack can show a real workbench surface instead of just inventory/pantry.
- Surfaced Let It Grow world-state summaries in planning HUD copy and `window.render_game_to_text()`: current zone, available paths, and current foraging availability.
- Registered zone exits and foraging spots as proximity interactables in `src/ui/ui-binder.js` using `evaluateZoneAccess(...)`, so the active scene can now produce travel/gate feedback and forage prompts in the same interaction lane as bed cells.
- Validation:
  - `node --check` passed for `src/ui/backpack-panel.js`, `src/ui/ui-binder.js`, and `src/scene/zone-manager.js`.
  - `git diff --check -- src/ui/backpack-panel.js src/ui/ui-binder.js src/scene/zone-manager.js` passed.
  - Skill Playwright client ran against `http://127.0.0.1:4174/garden-os/story-mode-live/?mode=let-it-grow` and captured the title screen at `/tmp/garden-os-visible-pass/shot-0.png`, but the title-screen click still timed out in automation.
  - Direct Playwright gameplay smoke confirmed the route still boots into Chapter 1 planning/cutscene and wrote `/tmp/garden-os-visible-pass-direct/backpack.png`, `/tmp/garden-os-visible-pass-direct/state.json`, and `/tmp/garden-os-visible-pass-direct/errors.json`.
  - Important boundary: the `4174` route is serving a stale `story-mode/dist` bundle. The smoke state from that route did not include the newly added `currentZone`, `routes`, or `foraging` fields, which confirms the local served build predates this patch.
  - `npm run build` and a clean-port `vite dev` attempt both stalled in this shell before updating/serving the new bundle, so source is correct but local runtime refresh is still blocked by the environment.

Update 2026-03-22 crop billboard transparency fix:
- Diagnosed the gray crop-card artifact as an asset format issue, not a Three.js transparency flag issue: the active `grow-*.png` sheets in `assets/textures/` are plain RGB PNGs with no alpha channel, while the single-crop `crop-*.png` icons are RGBA.
- Patched `src/scene/sprite-loader.js` so `getGrowthTexture(...)` falls back to the RGBA crop icon whenever a `grow-*` sheet is marked `hasAlpha: false`.
- This keeps Story Mode / Let It Grow bed sprites visually readable immediately, while preserving the option to restore real staged growth sheets once transparent assets are regenerated.
- Validation:
  - `node --check src/scene/sprite-loader.js` passed.
  - `git diff --check -- src/scene/sprite-loader.js` passed.

Update 2026-03-22 crop stage readability pass:
- Re-enabled crop accent sprites in `src/scene/garden-scene.js` now that the growth texture loader safely falls back to RGBA crop icons.
- Accent readability is stage-driven instead of art-driven for now:
  - SEED / SPROUT / GROWING / HARVEST change icon opacity, scale, and vertical lift
  - winter cells shift cooler/desaturated
  - damaged cells tint warmer and dim further
- Added `scripts/local-dist-transform-server.mjs` so the local `4174` route can serve `dist` with targeted scene transforms while Vite build/dev remains unreliable in this shell.
- Validation:
  - `node --check src/scene/garden-scene.js` passed.
  - `git diff --check -- story-mode/src/scene/garden-scene.js` passed.
  - The current `dist` bundle now contains the stage-accent logic (`garden-scene-BsadH2ka.js`).
  - The `develop-web-game` Playwright client reaches the title screen cleanly on the refreshed `4174` route.
  - The automated click burst still did not advance into gameplay, so the final in-garden visual check remains a quick manual smoke step.

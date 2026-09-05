# Free Play Feature Implementation Plans

Status: Proposed implementation backlog; no feature in this document is marked shipped.
Source baseline: `ad04ce49741ad673869855760b9bffc028512b07` (`main`), verified against the remote on September 5, 2026.
Scope: the 50 features from the Free Play brainstorm, to implement in Story Mode's sandbox. The older Garden League Simulator is outside this plan.
Owner: Dave Robertson for product decisions; the implementer of each delivery slice owns its code, migration, tests, and release proof.

This is a feature implementation plan, not a replacement for [HANDOFF.md](HANDOFF.md), the canonical specifications, or the active implementation roadmap. All additions below are proposals. References describe source inspected at the pinned baseline; acceptance checks describe work still to perform. Historical workflow completion and runtime behavior were not assumed from the supplied transcript.

## Verified baseline and corrections

| Finding | Current source and consequence |
|---|---|
| Free Play is an 8×8 spring sandbox with all 51 canonical crops unlocked. | [state.js](../story-mode/src/game/state.js), `createSandboxState()`, accepts no options. The original claim that it already accepts dimensions is incorrect. |
| Smaller dimensions cannot simply be passed through. | [store.js](../story-mode/src/game/store.js), `normalizeSeason()`, applies chapter-based expansion; chapter 99 qualifies for 8×8. #8 must fix this before offering smaller beds. |
| Free Play has no supported save slot. | [game-init.js](../story-mode/src/game/game-init.js) launches with slot `-1`; [save.js](../story-mode/src/game/save.js) accepts only 0–2. [authority-cache.js](../story-mode/src/engine/authority-cache.js), `createStoryAuthorityPersistence()`, also disables persistence for negative slots. The pause backup functions reject slot `-1`. #18 is foundational. |
| Shared state logic does not imply a remote dependency for Free Play. | The sandbox uses the shared Store and reducers. Its current negative slot disables remote authority persistence. New local saves must not accidentally activate the existing remote session path. |
| Normal event selection currently produces an empty sandbox pool. | [data/events.js](../story-mode/src/data/events.js) filters by chapter; none of the 40 records in [EVENT_DECK.json](../specs/EVENT_DECK.json) allows chapter 99. #40 must define explicit sandbox eligibility. Existing weighted selection is already deterministic, but has no user-supplied run seed. |
| Season rollover clears planted crops. | [phase-machine.js](../story-mode/src/game/phase-machine.js), `rollCampaignForward()`, stores `previousGrid` and a review, then creates an empty grid with fatigue/infrastructure effects. It does not replant the previous layout. |
| Runtime phase names differ from conceptual design labels. | [state.js](../story-mode/src/game/state.js) uses PLANNING → EARLY_SEASON → MID_SEASON → LATE_SEASON → HARVEST → TRANSITION. Commit and review occur within that flow. New features must not invent COMMIT or REVIEW enum values without a migration. |
| A soil-health slider alone would not implement soil difficulty. | [cell-score.js](../story-mode/src/scoring/cell-score.js) subtracts cell `soilFatigue`; it does not read `campaign.soilHealth`. #11 must reconcile display and mechanical state. |
| The two file contracts are different. | [gos-schema.json](../gos-schema.json) is workspace version 1; campaign state is version 9, with a separate save-backup envelope in [save.js](../story-mode/src/game/save.js). A Story Mode field does not automatically require a workspace schema bump. |
| Cross-tool interchange has concrete limits. | Workspace bed dimensions currently max out at 10×10; workspace season excludes winter and includes `latesummer`. #8/#12/#19/#29 must handle this explicitly, never truncate or silently relabel a garden. |
| Several world systems are instantiated already. | [ui-binder.js](../story-mode/src/ui/ui-binder.js) constructs quests, festivals, crafting, foraging, and day/night systems. Instantiation is not proof of an accessible, complete user flow; #34–#38 include reachability work. |
| Existing packs support four content types. | [pack-loader.js](../story-mode/src/game/pack-loader.js) and [pack-validator.js](../story-mode/src/game/pack-validator.js) support crops, zones, quests, and NPCs. Events and keepsakes require new support; returned pack content does not itself replace the static registries. |
| `companion_patch` is a gardening intervention. | [intervention.js](../story-mode/src/game/intervention.js) adds a cell bonus. It is not a Calvin task system. Calvin's presentation is in [garden-scene.js](../story-mode/src/scene/garden-scene.js). |
| Some design prose needs reconciliation. | [PROGRESSION_SPEC.md](../specs/PROGRESSION_SPEC.md) refers to a 20-crop roster and four-row bed, and disagrees internally about challenge unlock timing. Current crop data has no `heirloom` or botanical `family` field. The modifier descriptions also mention systems not yet represented in the runtime. |

These are source-level findings. This planning pass did not perform an interactive Free Play playthrough, validate current accessibility, or certify the deployed game. Each implementation slice must establish its own current baseline and user-facing proof.

## Shared implementation contract

Keep Free Play browser native and offline capable. Reuse the existing Vite/Three.js runtime inside `story-mode/`; add no backend, account system, root build step, or framework for these features. Preserve the root tools and the two navigation tracks. Keep the six scoring factors and weights canonical. Random-looking content uses deterministic inputs; decorative motion must never influence rewards or scores.

### Components and ownership

The new filenames in this table are **proposed**, not existing APIs. Introduce them when their first consumer ships, rather than building an unused framework.

| Component | Responsibility | Inputs → outputs | Owner and first consumer |
|---|---|---|---|
| Run configuration, proposed `story-mode/src/game/freeplay-config.js` | Validate and freeze a run's rules | Draft setup → normalized configuration or field errors | State/save slice; #18, #8, #3 |
| Run persistence, proposed `story-mode/src/game/freeplay-save.js` | Store complete local gardens separately from story slots | Validated run envelope → durable save or actionable failure | State/save slice; #18 |
| Deterministic content selection, proposed `story-mode/src/game/freeplay-rules.js` | Resolve seed-based event and challenge choices | Run seed, rules version, season index, content IDs → fixed choices | Event slice; #40/#3 |
| Mutation boundary, existing [store.js](../story-mode/src/game/store.js) | Validate one gameplay change and publish its resulting state | Intent + current state → accepted state or reason | Relevant gameplay slice; shared by all mutating features |
| Task executor, proposed `story-mode/src/game/freeplay-task-queue.js` | Sequence walk-and-act intents | Ordered tasks → per-task outcomes | Interaction slice; #22 |
| History capture, proposed `story-mode/src/game/freeplay-history.js` | Capture immutable season-end evidence once | Finalized season → bounded history record | History slice; #15 |
| Workspace adapter, proposed `story-mode/src/game/freeplay-workspace.js` | Translate between two validated contracts | Workspace or sandbox snapshot → preview plus loss report | Interchange slice; #19/#29 |
| Presentation, existing UI/scene modules | Display derived state and collect intent | Current state → accessible controls, explanations, feedback | Each feature slice |

```text
Setup / import
      ↓ validate, preview, choose
Run configuration → new local garden → Store
                                      ↑   ↓ accepted change
UI intent → legality check → task/phase execution → local save
                                      ↓
                             immutable season history
                                      ↓
                    explanations / replay / workspace export

Any validation failure → visible reason + unchanged prior garden
Any storage failure   → unsaved indicator + downloadable recovery
```

### Data and interface decisions

1. **Run identity.** Propose `campaign.freePlay` with a validated `runId`, display name, `rulesVersion`, seed, monotonic `seasonIndex`, and configuration. Keep `sandbox: true` as the compatibility discriminator until every existing consumer is audited. Use the season index for history and schedules, not chapter 99. Timestamps are descriptive metadata; they must not affect deterministic outcomes.
2. **Persistence.** Give local Free Play a distinct namespace and explicit persistence mode. Never turn `-1` into story slot 0. Store the whole validated garden in one envelope, with a revision and recoverable previous snapshot; update any garden list only after its record succeeds. Rebuild the list from valid records if needed. Surface quota, corruption, and revision conflicts. Preserve all three story slots.
3. **Schema ownership.** Add explicit validation/migration for new Free Play envelopes and fields through `state.js`, `store.js`, and save boundaries. Maintain current campaign version compatibility deliberately; bump the relevant version when readers would otherwise misinterpret data. Change `gos-schema.json` only when the cross-tool contract changes, and update every affected consumer in that slice. The older [MIGRATION-CONTRACT.md](MIGRATION-CONTRACT.md) uses field names that differ from the current schema; resolve these against actual validators before implementing #19/#29.
4. **Simulation time.** Persist a Free Play calendar based on season index and beat/month. Map it explicitly into trading, festivals, foraging, quests, and interventions. Keep presentation time and real elapsed tool cooldowns separate. No reward may be rerolled by reopening a panel, changing system time, or refreshing.
5. **Mutation intents.** UI sends validated IDs and quantities, never arbitrary state, reward totals, or executable effects. Batch actions, undo, import, purchases, and crafting need one accepted transaction boundary. Revalidate phase, run, bed, zone, content, resources, and revision at execution. Accepted operations carry stable IDs when retries could duplicate rewards.
6. **Read-only intelligence.** Previews clone only the required state and invoke the canonical scorer. Hover, history, photo mode, exports, and advice cannot modify crops, spend resources, advance the seed, or save speculative state.
7. **Cross-tool losses.** Return `{supported, warnings, blockingReasons, preview}` from the proposed adapter. No winter-to-spring conversion, large-bed cropping, crop substitution, or invented cage dimensions without a visible user choice. A workspace export is a layout transfer, not a full game backup.
8. **Content safety.** Validate objects, IDs, enums, finite numbers, dimensions, array lengths, file size, and nesting depth before allocation or mutation. Render user names and imported text using safe DOM APIs. Reject executable pack content and reserved-key pollution. Local custom content never modifies canonical global registries for other sessions.
9. **Rule changes.** Setup edits are reversible before starting. Challenge and comparison rules lock when the season starts. Switching rules later begins a new comparison category or season; it cannot rewrite an old result's eligibility. UI-only settings may remain adjustable.
10. **Accessibility and lifecycle.** Reuse field-kit styling and focus management. Every pointer feature has a keyboard/touch alternative. Preserve Escape priority, disabled explanations, focus return, sufficient contrast, reduced motion, and usable 320/375/430px layouts. Unsubscribe listeners and dispose scene/audio resources on exit.

### Delivery sequence

Complexity is relative: 1 = localized change; 2 = a few modules; 3 = cross-system integration; 4 = substantial state/UX work; 5 = foundational or content-heavy work. These are planning estimates, not elapsed-time commitments. Shared work is counted once. Dependencies below refer to shipped slices, not to the order of feature numbers.

| Wave | Scope and order | Exit gate |
|---|---|---|
| 0 — Durable runs | #18; shared config/calendar; #40 and #3 together | Resume/export/import one local garden offline; real sandbox event pool; deterministic multi-season replay |
| 1 — Setup | #8, #10, #11, #12, #13, #50, #42 | Validated settings survive reload and rollover without altering story mode |
| 2 — Planning tools | #28, #23, #30, #31, #32, #33; #19 then #29 | Advice matches canonical scores; explicit, loss-aware Planner interchange |
| 3 — Interaction | #27; #22; #21, #25, #26, #24 | No duplicate action, stale-target mutation, resource refund exploit, or input conflict |
| 4 — Challenges | #2 and #41; #1; #5, #6, #4, #7, #44, #45 | Rule combinations work over complete seasons; honest comparable results |
| 5 — History | #15; #16 and #17; #20 | Multiple years remain distinguishable; history is immutable and bounded |
| 6 — Wider garden | #9 then #14; #34, #35, #36, #37, #38, #39, #46, #47 | Complete reachable world loops with exactly-once rewards and independent beds |
| 7 — Extensions | #43, #48, #49 | Custom content restores offline; presentation features preserve state and frame stability |

The first useful release is named gardens plus a reliable sandbox season. Do not wait for all 50 features to ship together. Each feature below is a bounded candidate for a separate review, except #3/#40 and #1/#2 where one implementation should serve both entries.

## Feature index

| # | Feature | Complexity | Wave |
|---|---|---|---|
| 01 | [Challenge Ladder](#feature-01) | 5/5 | 4 |
| 02 | [Stacking matrix enforcement](#feature-02) | 2/5 | 4 |
| 03 | [Seeded runs](#feature-03) | 3/5 | 0 |
| 04 | [Ironman mode](#feature-04) | 3/5 | 4 |
| 05 | [Score contracts](#feature-05) | 2/5 | 4 |
| 06 | [“Survived Modifier” tags](#feature-06) | 2/5 | 4 |
| 07 | [Season sprint](#feature-07) | 4/5 | 4 |
| 08 | [Bed size picker](#feature-08) | 4/5 | 1 |
| 09 | [Multi-bed Free Play](#feature-09) | 5/5 | 6 |
| 10 | [Site config editor](#feature-10) | 4/5 | 1 |
| 11 | [Starting soil sliders](#feature-11) | 3/5 | 1 |
| 12 | [Start in any season](#feature-12) | 2/5 | 1 |
| 13 | [Custom starting pantry](#feature-13) | 3/5 | 1 |
| 14 | [Greenhouse bed](#feature-14) | 4/5 | 6 |
| 15 | [Legacy View](#feature-15) | 4/5 | 5 |
| 16 | [Season replay scrubber](#feature-16) | 3/5 | 5 |
| 17 | [Carry the campaign bed into Free Play](#feature-17) | 3/5 | 5 |
| 18 | [Named Free Play gardens](#feature-18) | 5/5 | 0 |
| 19 | [Export to Planner](#feature-19) | 4/5 | 2 |
| 20 | [Personal bests board](#feature-20) | 3/5 | 5 |
| 21 | [Drag-select cells](#feature-21) | 3/5 | 3 |
| 22 | [Action queue](#feature-22) | 4/5 | 3 |
| 23 | [Examine everything](#feature-23) | 2/5 | 2 |
| 24 | [Swap suggestions](#feature-24) | 3/5 | 3 |
| 25 | [Verb hotkeys](#feature-25) | 2/5 | 3 |
| 26 | [Paint mode](#feature-26) | 3/5 | 3 |
| 27 | [Undo and redo in planning](#feature-27) | 4/5 | 3 |
| 28 | [Hover score preview](#feature-28) | 2/5 | 2 |
| 29 | [Import a Planner layout](#feature-29) | 4/5 | 2 |
| 30 | [Rotation advisor](#feature-30) | 3/5 | 2 |
| 31 | [Adjacency heat overlay](#feature-31) | 2/5 | 2 |
| 32 | [Recipe goal mode](#feature-32) | 2/5 | 2 |
| 33 | [Faction affinity readout](#feature-33) | 1/5 | 2 |
| 34 | [Free Play quest deck](#feature-34) | 4/5 | 6 |
| 35 | [Market runs](#feature-35) | 4/5 | 6 |
| 36 | [Festival entries](#feature-36) | 4/5 | 6 |
| 37 | [Foraging loops](#feature-37) | 3/5 | 6 |
| 38 | [Sauce lab](#feature-38) | 4/5 | 6 |
| 39 | [Tool wear toggle](#feature-39) | 3/5 | 6 |
| 40 | [Seeded event pool](#feature-40) | 4/5 | 0 |
| 41 | [Event deck toggles](#feature-41) | 2/5 | 4 |
| 42 | [Day and night on](#feature-42) | 2/5 | 1 |
| 43 | [Custom content packs](#feature-43) | 5/5 | 7 |
| 44 | [Disaster drills](#feature-44) | 3/5 | 4 |
| 45 | [Free Play dialogue pools](#feature-45) | 3/5 | 4 |
| 46 | [NPC visitors](#feature-46) | 3/5 | 6 |
| 47 | [Calvin companion tasks](#feature-47) | 4/5 | 6 |
| 48 | [Ambience that reacts](#feature-48) | 2/5 | 7 |
| 49 | [Photo mode](#feature-49) | 3/5 | 7 |
| 50 | [Profile-aware labels](#feature-50) | 2/5 | 1 |

## A. Challenge and difficulty

<a id="feature-01"></a>

### 01. Challenge Ladder

**Outcome:** Before starting a season, choose up to two of the seven named modifiers and see exactly what changes.

**Existing anchors:** [PROGRESSION_SPEC.md §6](../specs/PROGRESSION_SPEC.md), [state.js](../story-mode/src/game/state.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [intervention.js](../story-mode/src/game/intervention.js), and [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json).

**Implementation:**
1. Reconcile the spec's Chapter 9 versus post-Chapter 12 unlock conflict. Proposed default: optional challenges are available in Free Play; campaign unlocks remain unchanged. Record the decision before coding.
2. Define versioned modifier IDs and explicit setup, event, intervention, harvest, and carry-forward effects. Drought selects three seeded cells and disables water events; Shade selects a seeded edge and reduces its two columns' light; Community uses a 6×3 controlled grid plus a separate four-cell shared strip.
3. Supply canonical heirloom eligibility for the current roster; implement Heirloom disease weighting and the separately explained yield adjustment. No-Till must operate on the actual soil/fatigue state. Late Start needs a defined calendar/sowing-window model. Apprentice owns the actual front row for the selected dimensions, with persisted learning over three seasons.
4. Add preview, locked-cell explanations, and between-season choices. Challenge yield effects must not silently change the six-factor placement formula. Resolve contradictory Drought cell counts and soil scales in the spec before implementation.

**State/dependencies:** #2, #8, #10, #11, #18, #40, #41; shared calendar. Store selected rules and resolved cell/side/neighbor choices per season. Community and Apprentice cells need ownership flags enforced in every mutation path.

**Acceptance:** Test each modifier alone, all 21 unordered pairs, reload before/after commit, shared-cell mutation rejection, and three-season Apprentice/No-Till behavior. Verify disabled choices by keyboard and touch. Campaign defaults and base scoring snapshots stay unchanged.

**Risk/rollout:** Complexity 5, wave 4. Deliver reconciled rules and individual modifiers in slices; do not label the complete ladder shipped until all seven pass.

<a id="feature-02"></a>

### 02. Stacking matrix enforcement

**Outcome:** Invalid modifier combinations cannot start, and the picker explains the conflict.

**Existing anchors:** [PROGRESSION_SPEC.md](../specs/PROGRESSION_SPEC.md), [store.js](../story-mode/src/game/store.js), [focus-state.js](../story-mode/src/ui/focus-state.js).

**Implementation:** Encode the seven IDs and incompatible unordered pairs as one table shared by UI and validation. Enforce a maximum of two distinct selections, reject unknown IDs, and display pair-specific reasons. Revalidate at season commit and import; never rely only on greyed controls. Removing one selection immediately restores legal alternatives.

**State/dependencies:** Shared run configuration from #18; can precede #1. Store IDs only, derive compatibility. Unsupported imported sets remain in a preview until corrected rather than starting a partly applied challenge.

**Acceptance:** Exhaustively test the matrix in both selection orders, duplicates, three selections, unknown IDs, and edited backups. Keyboard users can discover disabled reasons without activating them. UI and reducer return the same result.

**Risk/rollout:** Complexity 2, wave 4; ship as the validation portion of #1.

<a id="feature-03"></a>

### 03. Seeded runs

**Outcome:** A copyable run code recreates the same initial conditions and event choices under the same rules version.

**Existing anchors:** [data/events.js](../story-mode/src/data/events.js), [authoritative-engine.js](../story-mode/src/engine/authoritative-engine.js), [state.js](../story-mode/src/game/state.js).

**Implementation:** Add a bounded seed input and a generated seed for new runs. Define a versioned run-code envelope containing seed, starting setup, content fingerprint, and rules version. Build independent deterministic streams for events, challenge placement, and world loot so opening UI or taking a photograph cannot affect gameplay. Persist the stream position or derive draws from stable season/beat IDs. Decode into a read-only setup preview before starting.

**State/dependencies:** #18 and #40 ship together. A code reproduces starting conditions; it does not reproduce later player decisions. Do not copy authority session IDs or personal profile details into shared codes.

**Acceptance:** Same code plus same action sequence produces identical logical state across reload and different frame rates. Different seeds vary eligible draws; malformed, oversized, unknown-version, and missing-pack codes fail visibly without changing the active save.

**Risk/rollout:** Complexity 3, wave 0. Existing deterministic helpers may be reused after compatibility checks; do not introduce a second unversioned random algorithm.

<a id="feature-04"></a>

### 04. Ironman mode

**Outcome:** A clearly labeled local run allows normal resume but disables gameplay undo and replacing its history through import.

**Existing anchors:** [save.js](../story-mode/src/game/save.js), [pause-controller.js](../story-mode/src/ui/pause-controller.js), [store.js](../story-mode/src/game/store.js).

**Implementation:** Lock an Ironman flag at creation. Disable #27's command history, mid-run setup edits, and restoring an older backup into the same eligible run. Preserve export and crash recovery; importing a backup creates a separate run marked restored/practice. Record those facts in results. Use one logical garden save with a recovery mechanism, not deliberate loss of the only good copy.

**State/dependencies:** #18, #27, and shared run provenance. Store immutable start rules and restore provenance.

**Acceptance:** Refresh resumes the latest valid state; undo, duplicate imports, cloning, and rule edits cannot preserve original-run eligibility. Storage failure still offers recovery. Story saves are unaffected.

**Risk/rollout:** Complexity 3, wave 4. Describe this as an honor-system local mode: browser storage can be edited, so it is not tamperproof or suitable proof for competitive rewards.

<a id="feature-05"></a>

### 05. Score contracts

**Outcome:** Opt into a measurable target such as “Grade A with at most six occupied cells,” with live progress and a final explanation.

**Existing anchors:** [bed-score.js](../story-mode/src/scoring/bed-score.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [harvest-reveal.js](../story-mode/src/ui/harvest-reveal.js).

**Implementation:** Define a small data-driven contract catalog with allowed operators and fixed predicates. State whether a condition applies throughout a season, at commit, or only at harvest. For persistent constraints, record violations at accepted mutations; for final targets, evaluate the finalized harvest. Surface progress without changing the grade formula. Do not evaluate arbitrary user expressions.

**State/dependencies:** #18/#3 and the rules lock used by #1. Persist contract ID/version and any irreversible violation flags; derive ordinary progress from state.

**Acceptance:** Test the exact threshold, ties, empty bed, late crop removal, repeated harvest display, and reload. A “six crops” contract must explicitly mean occupied cells or distinct varieties; use occupied cells by default.

**Risk/rollout:** Complexity 2, wave 4. Keep first-release rewards journal-only to avoid a new economy dependency.

<a id="feature-06"></a>

### 06. “Survived Modifier” tags

**Outcome:** Completed modifier seasons receive permanent journal tags, including the all-seven milestone.

**Existing anchors:** [PROGRESSION_SPEC.md](../specs/PROGRESSION_SPEC.md), [save.js](../story-mode/src/game/save.js), [phase-machine.js](../story-mode/src/game/phase-machine.js).

**Implementation:** Emit completion once at successful season finalization, keyed by run ID, season index, and modifier ID. Persist the completed set and the exact season evidence. Extend journal serialization deliberately: `pushJournalEntry()` currently copies an explicit set of fields and would drop a new tag field. Derive the all-seven message from unique completions, not total tags.

**State/dependencies:** #1/#18; #15 later supplies the full timeline. Abandoned seasons do not earn tags; low scores still qualify when the spec's survival requirement is met.

**Acceptance:** Reopening harvest or restoring the same final state does not duplicate tags. Stacked modifiers award both; seven distinct completions award the milestone once. No mechanical reward is granted.

**Risk/rollout:** Complexity 2, wave 4. Preserve evidence if future modifier rules change.

<a id="feature-07"></a>

### 07. Season sprint

**Outcome:** Choose a shorter, explicitly labeled season for quick experiments.

**Existing anchors:** [phase-machine.js](../story-mode/src/game/phase-machine.js), [phase-router.js](../story-mode/src/game/phase-router.js), [season-calendar.js](../story-mode/src/ui/season-calendar.js).

**Implementation:** Define a versioned sprint schedule rather than skipping transitions ad hoc. Proposed first preset: one event beat followed by harvest/review. Specify how month-based crops, festivals, intervention tokens, and event eligibility map to that beat. Keep the ordinary schedule unchanged and isolate sprint records from full-season comparisons. Disable systems with no valid sprint mapping with a visible explanation.

**State/dependencies:** #3/#18/#40; shared schedule interface. Persist the chosen schedule and current step, with forward-only advancement.

**Acceptance:** One click advances exactly one step; pending events must resolve before harvest. Reload at every step resumes correctly. Rewards, fatigue, and journal entries finalize once, and calendar labels match the actual schedule.

**Risk/rollout:** Complexity 4, wave 4. This is a rules variant, not merely faster animations; balance it independently.

## B. Bed and world customization

<a id="feature-08"></a>

### 08. Bed size picker

**Outcome:** Set bed dimensions at creation, with reliable small and large layouts.

**Existing anchors:** [state.js](../story-mode/src/game/state.js), [store.js](../story-mode/src/game/store.js), [bed-model.js](../story-mode/src/scene/bed-model.js), [garden-scene.js](../story-mode/src/scene/garden-scene.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Add validated constructor options and exempt sandbox dimensions from story progression expansion. Start with 4×4, 8×4, and 8×8 presets; finish the promised range with integer dimensions through 12×12 after geometry checks. Derive labels, scene bounds, camera fit, raycasts, collision blockers, trellis rows, and reachable action points from dimensions. Replace the fixed bed reach assumptions. Resize only during new-run setup in the first release.

**State/dependencies:** #18. Save explicit dimensions with every grid, soil array, history record, and bed. #19 handles the workspace schema's current 10×10 ceiling.

**Acceptance:** Test 4×4, 6×3 challenge geometry, 8×8, 10×10, and 12×12; include rectangular extremes. Every cell can be selected and acted on by keyboard/touch, metadata survives serialization, and smaller beds stay small after any Store dispatch and rollover.

**Risk/rollout:** Complexity 4, wave 1. Supporting constructor dimensions alone is not completion. Large exports remain blocked until the receiving format supports them.

<a id="feature-09"></a>

### 09. Multi-bed Free Play

**Outcome:** Maintain two or three genuinely independent beds in one garden.

**Existing anchors:** [multi-bed.js](../story-mode/src/game/multi-bed.js), [bed-manager.js](../story-mode/src/game/bed-manager.js), [store.js](../story-mode/src/game/store.js), [zone-manager.js](../story-mode/src/scene/zone-manager.js), [phase-machine.js](../story-mode/src/game/phase-machine.js).

**Implementation:** Make per-bed grid, site, soil, previous grid, and harvest records canonical; retain `season.grid` as a deliberate active-bed projection if needed. Synchronize before switching and after accepted edits. Add bed names/selection, physical placement and collision geometry for multiple beds in the plot, and stable bed IDs in raycasts and queued actions. Apply a shared season to every bed once; aggregate harvest without paying twice. Migrate the existing primary grid into the first bed losslessly.

**State/dependencies:** #8/#18; shared season identity. Cap first release at three beds. Do not infer that the current manager already provides full multi-bed season simulation or rendering.

**Acceptance:** Plant different crops in each bed, switch zones, reload, advance through harvest, and compare independent soil/history. Duplicate bed IDs and stale queued targets fail safely. Scores identify the contributing bed.

**Risk/rollout:** Complexity 5, wave 6. Keep one canonical copy of each bed; stale active-grid aliases are the principal regression risk.

<a id="feature-10"></a>

### 10. Site config editor

**Outcome:** Set light, orientation, support, protection, and water access with visible garden consequences.

**Existing anchors:** [state.js](../story-mode/src/game/state.js), [cell-score.js](../story-mode/src/scoring/cell-score.js), [score-explain.js](../story-mode/src/scoring/score-explain.js), [SCORING_RULES.md](../specs/SCORING_RULES.md).

**Implementation:** First expose currently supported scalar sun hours, wall side/orientation, and trellis settings. Then define per-column light and explicit shade-source extensions in the canonical spec before adding controls. Keep water access as an explainable maintenance constraint unless a reviewed mechanical rule exists; do not invent a seventh scoring factor. Preview rear support, middle protection, and front access zones. Reapply the saved site at season rollover, which currently recreates defaults.

**State/dependencies:** #8/#18; per-bed storage ready for #9. Validate units and finite ranges; use actual bed geometry for arrays.

**Acceptance:** Known site configurations produce the expected six-factor explanations. Unsupported climbers are warned, no-sun inputs are not silently changed by falsy defaults, and saves/next season retain the site. Old default-site score fixtures remain unchanged.

**Risk/rollout:** Complexity 4, wave 1. Per-column light is new model work, not wiring an existing `DEFAULT_SITE_CONFIG` field.

<a id="feature-11"></a>

### 11. Starting soil sliders

**Outcome:** Begin with healthy, tired, or patchy soil that has a stated mechanical effect.

**Existing anchors:** [state.js](../story-mode/src/game/state.js), [cell-score.js](../story-mode/src/scoring/cell-score.js), [phase-machine.js](../story-mode/src/game/phase-machine.js).

**Implementation:** Define the relationship between soil health and per-cell fatigue in a reviewed rules table. Initialize the scoring input and the displayed condition together, without double-counting a penalty. Provide a simple preset plus an optional per-cell editor; patchy presets use the run seed. Show an estimated score effect and practical recovery advice. Make setup reversible until run start.

**State/dependencies:** #8/#18/#3; compatible with #1 No-Till. Persist the initial condition in configuration and current condition in bed state.

**Acceptance:** Healthy defaults preserve baseline scores, tired soil changes them exactly as specified, NaN/out-of-range values are rejected or normalized with feedback, and patchy arrays match grid size through save/load and rollover.

**Risk/rollout:** Complexity 3, wave 1. Do not ship a cosmetic slider that only writes unused `campaign.soilHealth` values.

<a id="feature-12"></a>

### 12. Start in any season

**Outcome:** Start a new garden in spring, summer, fall, or winter.

**Existing anchors:** [state.js](../story-mode/src/game/state.js), [game-init.js](../story-mode/src/game/game-init.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [season-calendar.js](../story-mode/src/ui/season-calendar.js).

**Implementation:** Add a season enum to setup and initialize campaign, season, calendar, scene, and event selection from one value. Define winter's opening action explicitly using the existing winter flow. Preserve normal rotation from the selected start. Explain that a summer start changes planting fit, not the global crop registry.

**State/dependencies:** #18/#40. Store initial season separately from current season and monotonic season index.

**Acceptance:** Each option launches with matching HUD/light/calendar and reaches its next correct season. Reload does not reset to spring. Winter can advance without a missing event or intro deadlock. #19 blocks unsupported winter workspace export instead of converting silently.

**Risk/rollout:** Complexity 2, wave 1. Test the winter branch rather than assuming four identical startup paths.

<a id="feature-13"></a>

### 13. Custom starting pantry

**Outcome:** Choose a practical initial supply of seeds, tools, ingredients, and coin.

**Existing anchors:** [inventory.js](../story-mode/src/game/inventory.js), [state.js](../story-mode/src/game/state.js), [store.js](../story-mode/src/game/store.js), [CRAFTING_RECIPES.json](../specs/CRAFTING_RECIPES.json).

**Implementation:** Offer Standard, Empty, and Custom presets. Keep pantry ingredients, inventory items, unlocked crop access, and currency distinct in the UI and data model. Populate inventory through existing validated inventory helpers, respecting stack and slot capacity. Preview rejected overflow before start. Store the chosen supply rules in run configuration for fair comparisons.

**State/dependencies:** #18; #32/#38 will use the ingredient distinction. No new crop is unlocked merely because an unknown seed ID appears in a file.

**Acceptance:** Empty and full inventories start correctly; invalid IDs, negatives, fractional quantities, huge balances, and invalid tool durability fail safely. Reentering setup does not add supplies twice. Story-mode initial inventory stays unchanged.

**Risk/rollout:** Complexity 3, wave 1. All-crops-unlocked is not the same mechanic as unlimited seed stock; preserve current planting rules until deliberately specified.

<a id="feature-14"></a>

### 14. Greenhouse bed

**Outcome:** Use a sheltered bed with transparent sowing and weather tradeoffs.

**Existing anchors:** [zones/greenhouse.js](../story-mode/src/scene/zones/greenhouse.js), [multi-bed.js](../story-mode/src/game/multi-bed.js), [event-engine.js](../story-mode/src/game/event-engine.js), [cell-score.js](../story-mode/src/scoring/cell-score.js).

**Implementation:** Add a greenhouse bed type with defined protection, light reduction, watering responsibility, and shifted sow windows. A greenhouse scene alone does not implement these effects. Route events per bed type and expose why an event is reduced, unchanged, or inapplicable. Reuse #10's site logic and #9's bed identity; do not force every greenhouse crop to the same ideal season.

**State/dependencies:** #9/#10/#40 and the calendar/sow rules established for #1. Persist bed type and settings, not derived scores.

**Acceptance:** Compare the same crop inside and outside through cold, heat, rain, and drought cases. Switching beds/reloading preserves distinct results; protected status cannot accidentally affect outdoor beds. Access and trellis geometry remain legible.

**Risk/rollout:** Complexity 4, wave 6. Default to modest shelter effects supported by the model, with explicit maintenance tradeoffs.

## C. Legacy, history, and persistence

<a id="feature-15"></a>

### 15. Legacy View

**Outcome:** A local timeline explains how a garden changed over many seasons.

**Existing anchors:** [phase-machine.js](../story-mode/src/game/phase-machine.js), [save.js](../story-mode/src/game/save.js), [winter-review.js](../story-mode/src/ui/winter-review.js), [ui-data-builders.js](../story-mode/src/ui/ui-data-builders.js).

**Implementation:** Capture one immutable record at finalization: run/season/bed IDs, dimensions, final grid, site, rules/content version, score breakdown, best/worst row and cell, events, tags, and player notes. Use a unique season index because chapter 99 repeats. Render a filterable timeline with accessible detail sheets and comparisons. Older saves receive only facts actually present in their summaries; label unavailable layouts rather than reconstructing them.

**State/dependencies:** #18; #6 optional tags, #9 expands per-bed records. Proposed retention: 40 full season snapshots, then explicit export/archive choice; retain compact summaries and never silently delete the only complete history.

**Acceptance:** Two spring seasons remain distinct; revisiting harvest creates no duplicate; saved records do not change after new planting or a rules update. Best/worst ties use a stable rule. Storage quota and 40-season behavior are visible and recoverable.

**Risk/rollout:** Complexity 4, wave 5. History and export size grow together; benchmark before setting the final retention default.

<a id="feature-16"></a>

### 16. Season replay scrubber

**Outcome:** Inspect saved season layouts chronologically without altering the current garden.

**Existing anchors:** [phase-machine.js](../story-mode/src/game/phase-machine.js), [garden-scene.js](../story-mode/src/scene/garden-scene.js), [camera-controller.js](../story-mode/src/scene/camera-controller.js).

**Implementation:** Feed #15's immutable snapshots into a read-only replay view with Previous, Next, and a labeled range control. Freeze current gameplay input while the viewer is open and preserve its camera/selection for return. Display stored historical scores with their rules version. If a current-rules comparison is offered later, label it separately. The first release is a season snapshot viewer, not a reconstruction of unrecorded individual actions.

**State/dependencies:** #15. Viewer position is transient; no gameplay write or seed advancement.

**Acceptance:** Scrubbing empty, old-summary-only, and differently sized beds is safe. Current state hashes match before and after, focus returns on Escape, rapid slider movement does not leak meshes, and mobile buttons provide a usable alternative.

**Risk/rollout:** Complexity 3, wave 5. Missing historical grids remain “not recorded.”

<a id="feature-17"></a>

### 17. Carry the campaign bed into Free Play

**Outcome:** Begin a separate sandbox from a completed campaign's garden and history.

**Existing anchors:** [game-init.js](../story-mode/src/game/game-init.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [save.js](../story-mode/src/game/save.js), [overlay-screens.js](../story-mode/src/ui/overlay-screens.js).

**Implementation:** Add a completion-screen and saved-campaign entry point. Read the best validated campaign snapshot and preview exactly what transfers: dimensions, current/last garden layout, soil, supported infrastructure, pantry, keepsakes, and profile. Deep-copy into a new local run ID, unlock the Free Play roster, clear active quest/festival/authority session state, and set the next season explicitly. Retain historical achievements as imported provenance, not newly earned Free Play rewards.

**State/dependencies:** #18/#15; #9 if multiple source beds are supported. Source story saves remain byte-for-byte unchanged.

**Acceptance:** Transfer a completed, empty, and legacy campaign; verify no shared references, no story-slot overwrite, correct next season, and honest missing-history notices. Incomplete campaigns do not silently qualify for a completion-only flow.

**Risk/rollout:** Complexity 3, wave 5. Conversion is a fork of data, never mutation of the original campaign.

<a id="feature-18"></a>

### 18. Named Free Play gardens

**Outcome:** Create, name, resume, back up, restore, and remove multiple local Free Play gardens safely.

**Existing anchors:** [game-init.js](../story-mode/src/game/game-init.js), [save.js](../story-mode/src/game/save.js), [authority-cache.js](../story-mode/src/engine/authority-cache.js), [pause-controller.js](../story-mode/src/ui/pause-controller.js), [store.js](../story-mode/src/game/store.js).

**Implementation:** Introduce the separate local run envelope and repository described above. Proposed initial cap: five named gardens with explicit storage feedback, not three borrowed story slots. Replace the one-shot start button with New/Continue cards and safe rename/delete/restore flows. Wire save status and complete-run backup into pause controls. Check revisions on write to detect two-tab conflicts. Initialize persistence before gameplay starts and save accepted state changes plus phase boundaries.

**State/dependencies:** First delivery slice; establish config, run ID, season index, migration, local-only persistence mode, and validation. Existing ephemeral sessions can be saved while still open; already-lost sessions cannot be recovered. Validate unknown versions before assigning the current version.

**Acceptance:** Create two gardens, make distinct edits, reload, switch, export, restore into a new ID, and verify all state. Test quota, corrupt records, interrupted list updates, unavailable storage, future versions, two tabs, and all three untouched story slots. Network disabled must not prevent resume or editing. Never report “Saved” when a write failed.

**Risk/rollout:** Complexity 5, wave 0. Preserve access to an unsaved in-memory garden and download on persistence failure. This resolves the current slot `-1` backup gap.

<a id="feature-19"></a>

### 19. Export to Planner

**Outcome:** Download a supported garden layout as a valid `.gos.json` workspace for the active Planner.

**Existing anchors:** [gos-schema.json](../gos-schema.json), [gos-bed.js](../gos-bed.js), [garden-planner-v5.html](../garden-planner-v5.html), [state.js](../story-mode/src/game/state.js).

**Implementation:** Build a pure adapter that emits the actual required workspace fields, bed records, site settings, and crop IDs. Validate against the current schema and receiving tool. Preview unsupported fields and distinguish layout export from a full Free Play backup. Initially block winter, unsupported custom crops, and dimensions above 10 rather than guessing. Completing seamless 12×12/winter interchange requires a separate compatible workspace contract update across consumers. Never invent cage measurements from visual scenery.

**State/dependencies:** #18/#8/#10; #9 later exports selected or all supported beds. Export reads a consistent snapshot and creates fresh workspace IDs.

**Acceptance:** Import the output through the actual v5 UI, compare crop coordinates and supported settings, reexport, and inspect the resulting file. Source save remains unchanged. Unsupported cases give specific, non-destructive choices; malformed user names do not enter markup.

**Risk/rollout:** Complexity 4, wave 2. Root Planner scores may differ by supported context; promise layout fidelity, and verify any scoring-parity claim separately.

<a id="feature-20"></a>

### 20. Personal bests board

**Outcome:** Compare meaningful local season results without mixing incompatible rules.

**Existing anchors:** [bed-score.js](../story-mode/src/scoring/bed-score.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [read-only-sheet.js](../story-mode/src/ui/read-only-sheet.js).

**Implementation:** Derive records from finalized #15 history. Group by dimensions, bed type/count, season/schedule, modifier set, rules/content version, starting resources/site/soil, and assisted/restored status. Show why a record belongs to a category; use exact score then stable season ID for ties. Support filtering and clearing the derived board without deleting garden history.

**State/dependencies:** #15, #3, #1. Use a rebuildable bounded index, not a second authoritative reward store. Multi-bed ranking policy must be explicit before #9 results are included.

**Acceptance:** Identical finalization cannot add duplicates; loaded/imported records keep their provenance; sprint/modded/standard results stay separate. Sorting and ties are deterministic, empty state is truthful, and clearing the board cannot damage saves.

**Risk/rollout:** Complexity 3, wave 5. Local records are personal comparisons, not verified competitive rankings.

## D. Right-click menu and interaction

<a id="feature-21"></a>

### 21. Drag-select cells

**Outcome:** Select a rectangle or several cells and perform one deliberate group action.

**Existing anchors:** [input-manager.js](../story-mode/src/input/input-manager.js), [context-menu.js](../story-mode/src/ui/context-menu.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Add an explicit selection mode to avoid conflicts with camera movement, paint, and touch controls. Convert hits to a stable, sorted set of `{bedId, cellIndex}` references, draw a selection outline, and expose count/action preview. Provide keyboard range selection and touch tap-to-add. Execute through #22, with the batch grouping used by #27; blocked cells are listed rather than silently ignored.

**State/dependencies:** #22/#27; #8 geometry. Selection is transient and clears on bed/zone/phase change.

**Acceptance:** Dragging in all directions, across edges, and outside the canvas selects only valid cells. Repeated pointer events do not duplicate work. Crop/resource changes while waiting are revalidated. Escape cancels selection without opening pause or firing a tool.

**Risk/rollout:** Complexity 3, wave 3. Deliver selection first, then a small safe verb set before bulk resource-consuming tools.

<a id="feature-22"></a>

### 22. Action queue

**Outcome:** Queue several walk-then-act tasks with visible progress, cancellation, and failures.

**Existing anchors:** [walk-autopilot.js](../story-mode/src/game/walk-autopilot.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [interaction.js](../story-mode/src/game/interaction.js).

**Implementation:** Wrap the current single-target autopilot in an ordered executor. Each task captures run, bed, zone, cell/object ID, verb, selected crop, expected revision, and status; do not store callbacks in saves. Await each accepted mutation before moving on. Cap the queue, show progress, cancel on manual movement/Escape/zone change, and pause for unreachable or invalid tasks with Retry/Skip/Cancel choices. Keep the current pause-aware stall behavior.

**State/dependencies:** #18 for identity and #27 for safe grouped planning edits. First release queue is transient; reload cancels pending work and never replays completed rewards.

**Acceptance:** Test rapid enqueue, user cancellation, pause/hidden tab, failed reach, depleted inventory, changed crop selection, late phase advance, and duplicate completion callbacks. Each task executes at most once and reports success only after the state changes.

**Risk/rollout:** Complexity 4, wave 3. Keep scene movement separate from the authoritative local mutation result.

<a id="feature-23"></a>

### 23. Examine everything

**Outcome:** Examine cells, NPCs, landmarks, structures, and Calvin for concise useful information.

**Existing anchors:** [ui-binder.js](../story-mode/src/ui/ui-binder.js), [npcs.js](../story-mode/src/data/npcs.js), [zone-interactables.js](../story-mode/src/scene/zones/zone-interactables.js), [interaction.js](../story-mode/src/game/interaction.js).

**Implementation:** Add stable examine IDs and authored descriptions to actual interactable definitions. Derive dynamic lines from known state: locked route requirement, soil condition, support, NPC availability, and current event effects. Use a readable detail sheet for longer content with the same entry reachable from proximity and keyboard controls. Do not expose unearned story spoilers.

**State/dependencies:** None beyond existing interaction surfaces; #18 may later remember optional preferences. Examination is read-only and must not count as a reward-bearing interaction.

**Acceptance:** Every registered examine target has content or a truthful fallback. Moving/hidden objects resolve correctly; unknown IDs and imported text are safe. Keyboard and touch can open, read, and close the sheet without changing the garden.

**Risk/rollout:** Complexity 2, wave 2. Start with existing targets; do not make every decorative mesh independently interactive.

<a id="feature-24"></a>

### 24. Swap suggestions

**Outcome:** Offer a few explainable replacements with both cell and whole-bed consequences.

**Existing anchors:** [cell-score.js](../story-mode/src/scoring/cell-score.js), [bed-score.js](../story-mode/src/scoring/bed-score.js), [score-explain.js](../story-mode/src/scoring/score-explain.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Reuse #28's pure preview for legal crop candidates, then rescore the full bed to include neighbors, tall shading, recipe effects, and trellis competition. Rank with stable ties and show the best three plus one material tradeoff. Filter locked/shared cells and crop restrictions. Label the action “Replace” when it is replacement rather than a two-cell swap; apply through the validated planning command path.

**State/dependencies:** #28/#27/#22; rule filtering from #1 when enabled. Store no recommendation cache in game saves.

**Acceptance:** A higher cell score that worsens the total bed is described honestly. Ties remain stable, unsupported climbers are not presented as suitable without explanation, and stale suggestions are recalculated before applying. Undo restores the prior legal state.

**Risk/rollout:** Complexity 3, wave 3. Advice optimizes stated scoring inputs, not unmodeled real-world yield.

<a id="feature-25"></a>

### 25. Verb hotkeys

**Outcome:** Activate a clear action for the focused cell without opening a menu.

**Existing anchors:** [input-manager.js](../story-mode/src/input/input-manager.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [tool-hud.js](../story-mode/src/ui/tool-hud.js).

**Implementation:** Audit bindings before assigning keys: plain W already participates in movement, so the proposed P/W/H set is not automatically safe. Proposed default: remappable modified shortcuts such as Alt+P/W/H, subject to browser/platform checks. Target the keyboard-focused cell or an explicit hover cell, use the same legality/action executor as the context menu, and expose bindings in help. Ignore typing, modal focus, composition, repeated keydown, and consumed events.

**State/dependencies:** #22 and one shared action descriptor. Persist user key preferences separately from competitive run rules if customization ships.

**Acceptance:** No shortcut fires while entering a garden name or using menu arrows. Movement remains intact, one key press causes one action, invalid targets explain why, and all verbs remain usable without a keyboard.

**Risk/rollout:** Complexity 2, wave 3. Verify actual macOS/browser shortcuts before selecting final defaults.

<a id="feature-26"></a>

### 26. Paint mode

**Outcome:** Repeatedly apply a chosen planning verb along a drag path with controlled costs.

**Existing anchors:** [input-manager.js](../story-mode/src/input/input-manager.js), [tool-manager.js](../story-mode/src/game/tool-manager.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Add a visible paint toggle and selected-verb indicator. Collect each crossed cell once per stroke and preserve grid order between sparse pointer samples. Send a bounded stroke through #22; do not bypass walk/reach rules or apply every frame. Start with planting/removal, then add tools only after their cost/cooldown behavior is tested. Use #27's transaction grouping and explicit stop/cancel behavior.

**State/dependencies:** #22/#27; #21's gesture arbitration. Only completed accepted changes persist; held pointers and pending strokes do not.

**Acceptance:** Fast and slow strokes produce the same cell set. Pointer cancel, scrolling, pinch, UI crossings, tab hide, phase change, and empty stock end safely. A cell cannot consume stock multiple times in one stroke.

**Risk/rollout:** Complexity 3, wave 3. A preview-and-execute touch flow is preferable where continuous dragging conflicts with the scene controls.

<a id="feature-27"></a>

### 27. Undo and redo in planning

**Outcome:** Reverse eligible planting edits without duplicating items, rewards, or progression.

**Existing anchors:** [store.js](../story-mode/src/game/store.js), [intervention.js](../story-mode/src/game/intervention.js), [authority-cache.js](../story-mode/src/engine/authority-cache.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Define an allowlist of reversible planning commands and record compact before/after data with expected revision. Initially include plant/remove/replace only. If a command spends seeds, restore exactly that transaction's inventory delta only when subsequent state permits it; otherwise make it ineligible. Exclude harvest, market, crafting, quest rewards, phase advance, and arbitrary state replacement. Clear redo after a new command and clear both stacks on commit, restore, bed switch, or external revision change. Cap history and group each batch/stroke.

**State/dependencies:** #18; shared mutation boundary. Keep stacks transient initially and disclose that reload ends undo history. #4 disables the feature for Ironman.

**Acceptance:** Undo/redo round trips preserve logical state, double undo is harmless, and actions after phase advance cannot restore old gardens or refund spent rewards. Test rejected commands, batch partial completion, and a concurrent edit.

**Risk/rollout:** Complexity 4, wave 3. Replacing a complete Store snapshot is not a safe general undo implementation.

## E. Planning intelligence

<a id="feature-28"></a>

### 28. Hover score preview

**Outcome:** See how a selected crop would score in a cell before planting it.

**Existing anchors:** [cell-score.js](../story-mode/src/scoring/cell-score.js), [score-explain.js](../story-mode/src/scoring/score-explain.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [planner-binder.js](../story-mode/src/ui/planner-binder.js).

**Implementation:** Create a pure preview helper that clones the candidate grid, preserves grid metadata, inserts the selected crop, and calls `scoreCell()`. Show the six factors, dominant limitation, and proposed action; compare with the current cell when replacing. Cache by relevant state revision, crop, bed, site, and season. Offer the same preview for keyboard focus and touch Inspect; do not require hover.

**State/dependencies:** #8/#10 for configurable geometry/context; usable on the current default bed before those land. No persisted derived score.

**Acceptance:** Preview equals the post-plant score on empty/replacement/edge/shaded/trellis cells. Repeated hover leaves saves and resource counts unchanged. Updating the season, neighbor, or crop invalidates the cache. On large beds, work remains bounded to actual target changes.

**Risk/rollout:** Complexity 2, wave 2. Explain that this is placement fit under the current model, not a harvest promise.

<a id="feature-29"></a>

### 29. Import a Planner layout

**Outcome:** Start a Free Play garden from a validated `.gos.json` bed with a clear import preview.

**Existing anchors:** [gos-schema.json](../gos-schema.json), [gos-bed.js](../gos-bed.js), [game-init.js](../story-mode/src/game/game-init.js), [store.js](../story-mode/src/game/store.js).

**Implementation:** Reuse #19's inverse adapter and actual workspace validation. Let the user select a bed, show dimension/crop/site mapping, and list unsupported details. First release creates a new garden; replacing an active garden is a separate reversible flow after #27 is available. Treat imported planting as setup, not hundreds of harvest-eligible tool actions. Map `latesummer` only through a documented user-selected policy; do not silently change it to summer. Reject unknown crops until a validated matching pack is loaded.

**State/dependencies:** #19/#18/#8/#10; #9 for multiple-bed import. Record layout-import provenance and separate it from earned inventory/pantry.

**Acceptance:** Real Planner exports at supported sizes import with matching coordinates; malformed/oversized/future-version files fail before state mutation. Cancel preserves the garden. Imported damage or crop names cannot grant rewards or inject markup.

**Risk/rollout:** Complexity 4, wave 2. `planner-binder.js` is the internal 3D planner UI, not an existing workspace import adapter.

<a id="feature-30"></a>

### 30. Rotation advisor

**Outcome:** Flag meaningful family repetition and suggest practical alternatives for the next season.

**Existing anchors:** [phase-machine.js](../story-mode/src/game/phase-machine.js), [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json), [score-explain.js](../story-mode/src/scoring/score-explain.js).

**Implementation:** Add a reviewed botanical-family mapping for current crop IDs, separate from gameplay factions. Compare each proposed placement with prior crops using stable bed/cell coordinates; account for changed bed sizes and missing history. Explain family repetition, present soil fatigue, and suitable alternative families under current sun/support/season constraints. Keep advice informational unless a separately reviewed scoring change is authorized.

**State/dependencies:** #18/#28; current `previousGrid` supports a one-season first release, #15 enables longer trends. Unknown family/history produces “not enough information.”

**Acceptance:** Two different crops in one family trigger a warning; unrelated crops in the same game faction do not. Edge resizing cannot shift history to the wrong cell. Recommendations avoid unavailable/support-incompatible choices and never mutate the layout.

**Risk/rollout:** Complexity 3, wave 2. Botanical data needs its own verified horticultural source pass during implementation; do not derive it from faction names.

<a id="feature-31"></a>

### 31. Adjacency heat overlay

**Outcome:** See companion and conflict contributions across the bed.

**Existing anchors:** [cell-score.js](../story-mode/src/scoring/cell-score.js), [garden-scene.js](../story-mode/src/scene/garden-scene.js), [score-explain.js](../story-mode/src/scoring/score-explain.js).

**Implementation:** Derive values directly from `adjacencyScore()` or scored factors. Add a toggle with a labeled legend, numeric signs, and cell details naming contributors. Use a separate overlay layer so event damage, current selection, and hover remain distinguishable. Include water mismatch only where the scorer currently includes it; do not add visual bonuses absent from the calculation.

**State/dependencies:** #28 can share derived-data caching. Transient overlay preference only; no mechanical state.

**Acceptance:** Orthogonal neighbors contribute once, diagonals do not unless the canonical rules change, and row boundaries never wrap. Overlay values equal inspected factors after edits. Color is not the sole signal and text contrast remains legible on mobile.

**Risk/rollout:** Complexity 2, wave 2. Label the overlay “Adjacency contribution,” not overall crop health.

<a id="feature-32"></a>

### 32. Recipe goal mode

**Outcome:** Select a recipe and see which ingredients are planted, harvested, or still missing.

**Existing anchors:** [crops.js](../story-mode/src/data/crops.js), [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json), [backpack-panel.js](../story-mode/src/ui/backpack-panel.js), [bed-score.js](../story-mode/src/scoring/bed-score.js).

**Implementation:** Read recipe IDs from the canonical eight-recipe registry. Show separate crop coverage and actual pantry readiness; planting a tomato is not harvesting one. Highlight missing ingredients in the palette, with #28's site-fit explanation. Keep recipes that require biome crops visible with their availability reason. Do not mutate pantry or completion flags on selection.

**State/dependencies:** #18/#28; #38 later adds crafting where a mapping exists. Persist the selected goal ID only.

**Acceptance:** Missing ingredients update after planting/removal/harvest and reload. Selecting a new goal has no scoring side effect beyond existing recipe rules. Unknown/removed recipe IDs fall back safely. Goals show support/access tradeoffs rather than encouraging overcrowding.

**Risk/rollout:** Complexity 2, wave 2. Crop recipes and item crafting recipes are different registries and must not be conflated.

<a id="feature-33"></a>

### 33. Faction affinity readout

**Outcome:** Explain the composition of the current bed across the eight crop factions.

**Existing anchors:** [crops.js](../story-mode/src/data/crops.js), [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json), [ui-data-builders.js](../story-mode/src/ui/ui-data-builders.js).

**Implementation:** Count occupied cells by canonical crop faction; show counts, percentages of planted cells, and optional distinct-variety counts. Handle ties explicitly and label unknown custom crops. Add a short practical interpretation of composition without claiming reputation or character allegiance. Surface this in an optional Inspect/Backpack section, not another permanent HUD panel.

**State/dependencies:** No new persistent model. #9 requires clear active-bed versus whole-garden scope; default to active bed.

**Acceptance:** Empty beds display no invented affinity, percentages use the documented denominator, ties are stable, and a mixed or custom-content bed renders safely. Values update after undo and import.

**Risk/rollout:** Complexity 1, wave 2. Crop factions are neither botanical families nor the character-affinity system described in older progression prose.

## F. Economy, quests, and the wider world

<a id="feature-34"></a>

### 34. Free Play quest deck

**Outcome:** Find and complete repeatable seasonal quests without campaign narrative prerequisites.

**Existing anchors:** [quest-engine.js](../story-mode/src/game/quest-engine.js), [quest-deck-validator.js](../story-mode/src/game/quest-deck-validator.js), [QUEST_DECK.json](../specs/QUEST_DECK.json), [store.js](../story-mode/src/game/store.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Audit current NPC/board entry points and distinguish missing UI from unmet prerequisites. Define a sandbox deck with valid references, achievable requirements, and explicit repeat policy. Select a stable seasonal set from the run seed. Key each quest instance by run/season/template so completed story quest IDs do not suppress later sandbox quests. Route acceptance, progress, expiry, choices, and reward fulfillment through validated reducer actions; derive rewards from the deck, never arbitrary UI payloads.

**State/dependencies:** #18/#3/#40; #35/#37 only for quests requiring those loops. Use the shared calendar for deadlines. Do not offer a quest whose route/resource is unavailable.

**Acceptance:** Finish one quest through visible UI; reload mid-quest; advance the season; repeat the template later. Duplicate completion grants once. Empty/full inventory and impossible prerequisites have clear outcomes.

**Risk/rollout:** Complexity 4, wave 6. The custom-deck path must receive the same reward-validation discipline as the canonical deck.

<a id="feature-35"></a>

### 35. Market runs

**Outcome:** Reach the market, understand availability and prices, and sell/buy without losing or duplicating goods.

**Existing anchors:** [market.js](../story-mode/src/game/market.js), [market-schedule.js](../story-mode/src/data/market-schedule.js), [trade-panel.js](../story-mode/src/ui/trade-panel.js), [shop-panel.js](../story-mode/src/ui/shop-panel.js), [zones/market-square.js](../story-mode/src/scene/zones/market-square.js).

**Implementation:** Trace travel and trader entry points, then instantiate/connect the existing market where needed. Replace chapter-derived Free Play day calculations with the shared calendar. Decide explicitly which harvested pantry entries become sellable inventory items and at what quantity; never grant stock by opening the shop. Make trade a single validated local transaction with stable transaction ID. Add reputation pricing only through an explicit reviewed formula and show base price plus adjustment; it is not present in `computeMarketPrices()` today.

**State/dependencies:** #18/#3; calendar and inventory contracts. Store transactions and seed, derive prices by season/version.

**Acceptance:** Perform visible sell/buy round trips, closed-market visits, exact-balance trades, full inventory, repeated clicks, and reload. Reject NaN, infinity, negative, and fractional quantities before spending. Balance/stock never diverge.

**Risk/rollout:** Complexity 4, wave 6. Existing `REPLACE_STATE` plus a separate transaction log is not sufficient for an atomic durable market flow.

<a id="feature-36"></a>

### 36. Festival entries

**Outcome:** Visit a seasonal festival and submit a qualifying harvest for explained judging.

**Existing anchors:** [festivals.js](../story-mode/src/game/festivals.js), [festivals-data.js](../story-mode/src/data/festivals-data.js), [zones/festival-grounds.js](../story-mode/src/scene/zones/festival-grounds.js), [zone-manager.js](../story-mode/src/scene/zone-manager.js).

**Implementation:** Wire festival start/end checks into actual calendar transitions and make the route plus activity panel reachable. Add a harvest-entry activity with defined eligibility, judging criteria, and whether submitted goods are consumed. Key festivals and entries by season instance. Derive rewards from validated definitions and persist a claimed/entered record before reporting success. Existing activity rewards do not by themselves implement harvest judging.

**State/dependencies:** #18/#40 and shared calendar; #15 supplies historical harvest evidence where required. If festivals occur before harvest, accept prior-season stock or move the entry window explicitly.

**Acceptance:** Enter, judge, reload, and revisit through UI. Repeat entry/reward calls cannot pay twice; month/season closing returns the player safely. Missing produce and unavailable travel give actionable explanations.

**Risk/rollout:** Complexity 4, wave 6. Resolve the current planning-only travel versus festival-month timing before exposing an unreachable event.

<a id="feature-37"></a>

### 37. Foraging loops

**Outcome:** Explore forest, riverside, and meadow for reproducible seasonal discoveries.

**Existing anchors:** [foraging.js](../story-mode/src/game/foraging.js), [biome-crops.js](../story-mode/src/game/biome-crops.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [WORLD_MAP.json](../specs/WORLD_MAP.json).

**Implementation:** Verify existing spots are reachable in a new sandbox and display next availability. Replace reward-affecting wall-clock day selection with run seed + calendar period + spot + pull index. Keep any real-time cooldown explicit and separate from loot identity. Validate biome crop/seed/item mappings. Commit the item grant, cooldown, history, and unlock atomically; full inventory must not consume a discovery unless the UI provides an intentional alternative.

**State/dependencies:** #18/#3, shared calendar; #34 quests can consume the results. Store discovery identity and cooldowns per run, not process-global state.

**Acceptance:** Same seed/action sequence yields the same loot after reload or system-clock changes. Repeated taps, zone reentry, and failed inventory insertion cannot reroll or duplicate rewards. Travel gating remains consistent between menu and proximity controls.

**Risk/rollout:** Complexity 3, wave 6. Current foraging already exists; this plan completes calendar determinism and the visible loop rather than creating a second system.

<a id="feature-38"></a>

### 38. Sauce lab

**Outcome:** Turn actual ingredients into recipes through a readable crafting flow.

**Existing anchors:** [crafting.js](../story-mode/src/game/crafting.js), [CRAFTING_RECIPES.json](../specs/CRAFTING_RECIPES.json), [CROP_SCORING_DATA.json](../specs/CROP_SCORING_DATA.json), [inventory.js](../story-mode/src/game/inventory.js), [store.js](../story-mode/src/game/store.js).

**Implementation:** Define the mapping between crop-recipe goals, pantry quantities, crafting materials, and output items. Add explicit crafting entries for unsupported food recipes rather than assuming all eight are already craftable. Build a panel with recipe, required quantities, missing materials, skill rule, and output preview. Preserve the existing single-action material-spend/output contract; refresh requirements at commit and handle output capacity. Make any Free Play skill bypass a declared setup rule.

**State/dependencies:** #18/#13/#32; #35 can later sell outputs. Persist crafted outputs and recipe achievements separately from mere planting coverage.

**Acceptance:** Craft one available and one missing recipe, test inventory full, exact ingredients, rapid duplicate clicks, reload, and selected batch quantity. No output without matching spend; no arbitrary output IDs/reward totals from UI.

**Risk/rollout:** Complexity 4, wave 6. Keep first release a small complete recipe set, then finish the remaining catalog with validated mappings.

<a id="feature-39"></a>

### 39. Tool wear toggle

**Outcome:** Choose whether durable tools wear down, while keeping resource costs understandable.

**Existing anchors:** [tool-manager.js](../story-mode/src/game/tool-manager.js), [inventory.js](../story-mode/src/game/inventory.js), [intervention.js](../story-mode/src/game/intervention.js), [store.js](../story-mode/src/game/store.js).

**Implementation:** Add a run rule for tool durability. When off, skip durability loss/checks consistently at the mutation boundary, while preserving consumable materials and cooldown rules unless separately configured. Hide unnecessary repair prompts without changing saved durability. When on, expose condition, repair costs, and a reachable repair interaction. Prevent toggling from restoring a broken tool for free; apply changes at a new season or mark the run assisted.

**State/dependencies:** #18/#13; #35 or an explicit local repair interaction for the repair loop.

**Acceptance:** The same action consumes the documented materials with wear both on and off. Broken tools, crafted durability, repair spending, repeated requests, and reload behave consistently. One garden's setting never leaks into another or story mode.

**Risk/rollout:** Complexity 3, wave 6. Do not equate “no wear” with unlimited fertilizer, mulch, or pest treatment.

## G. Events, weather, and content

<a id="feature-40"></a>

### 40. Seeded event pool

**Outcome:** Free Play receives valid seasonal events and repeats them consistently from the same run configuration.

**Existing anchors:** [data/events.js](../story-mode/src/data/events.js), [EVENT_DECK.json](../specs/EVENT_DECK.json), [phase-machine.js](../story-mode/src/game/phase-machine.js), [event-engine.js](../story-mode/src/game/event-engine.js).

**Implementation:** Add explicit sandbox eligibility as a separate mode policy; never force `chapter = 12` merely to obtain events. Audit each canonical event for campaign-specific narrative/effects and exclude unsuitable entries with a documented reason. Feed the versioned #3 seed into stable weighted selection, preserve no-repeat/month restrictions, and resolve any seeded target selection from the same run context. Empty filtered pools produce a deliberate calm beat that can advance normally.

**State/dependencies:** #18/#3 delivered together; #41 supplies category controls later. Persist selected event IDs and resolved targets before display. Record the event catalog/rules fingerprint.

**Acceptance:** Every standard Free Play season has the specified eligible choices; no chapter-99 empty-pool accident. Same seed/season/actions survives reload with identical draws and effects. Empty and exhausted decks do not deadlock. Story-mode event fixtures remain unchanged.

**Risk/rollout:** Complexity 4, wave 0. This is both a baseline repair and the implementation foundation for #1/#41/#44; count it once.

<a id="feature-41"></a>

### 41. Event deck toggles

**Outcome:** Choose which event categories can occur before the season starts.

**Existing anchors:** [EVENT_DECK.json](../specs/EVENT_DECK.json), [data/events.js](../story-mode/src/data/events.js), [event-card.js](../story-mode/src/ui/event-card.js).

**Implementation:** Use actual categories—weather, neighbor, critter, family, infrastructure—with plain labels and examples. Apply allowlists after sandbox/season/month eligibility and before weighted selection. Explain challenge-forced restrictions, such as Drought disabling water events. Freeze the deck configuration at commit; provide “Calm season” deliberately when all categories are off.

**State/dependencies:** #40/#18; consumed by #1. Store sorted category IDs and version, not copied mutable event records.

**Acceptance:** Disabled categories never draw, imported invalid IDs fail validation, a forced restriction cannot be overridden through UI, and all-off/exhausted pools advance without phantom event rewards. Same configuration yields the same sequence.

**Risk/rollout:** Complexity 2, wave 4. “Pests” should map explicitly to `critter`; avoid category names that do not exist in the deck.

<a id="feature-42"></a>

### 42. Day and night on

**Outcome:** Enable optional phase-based lighting in Free Play.

**Existing anchors:** [day-night-controller.js](../story-mode/src/game/day-night-controller.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [state.js](../story-mode/src/game/state.js), [pause-controller.js](../story-mode/src/ui/pause-controller.js).

**Implementation:** Expose `settings.dayNightEnabled` in setup and pause controls, persist it in the local garden envelope, and synchronize immediately. Reuse the existing phase-to-time mapping for the first release; do not claim it is a new free-running simulation clock. Ensure the scene returns to ordinary seasonal lighting when disabled and UI contrast remains usable at dusk/night.

**State/dependencies:** #18; no scoring or event change. If a free-running clock is later added, keep it presentation-only unless a separate rules change is reviewed.

**Acceptance:** Toggle at each phase, reload, pause, switch zones, and return to title. Lighting changes while scores/resources/events remain identical. Reduced-motion users can choose static lighting; dark settings do not obscure controls or crop selection.

**Risk/rollout:** Complexity 2, wave 1. The existing controller is already instantiated; the work is settings, persistence, and reliable reset behavior.

<a id="feature-43"></a>

### 43. Custom content packs

**Outcome:** Load a validated local pack of crops, events, or keepsakes and resume the garden offline.

**Existing anchors:** [pack-loader.js](../story-mode/src/game/pack-loader.js), [pack-validator.js](../story-mode/src/game/pack-validator.js), [main.js](../story-mode/src/main.js), [crops.js](../story-mode/src/data/crops.js), [data/events.js](../story-mode/src/data/events.js), [keepsakes.js](../story-mode/src/data/keepsakes.js).

**Implementation:** Version the pack contract and add the requested event/keepsake schemas. Strengthen existing validation with finite numeric limits, allowed effect types, duplicate/reserved IDs, reference checks, bounded bytes/counts/depth, and asset rules. Create per-run registry composition shared by UI, scorers, reducers, and saves; the current global returned content is not enough. Preview all additions and reject the pack atomically on failure. Bundle validated pack data or content hashes plus locally stored definitions with the garden backup so reload needs no network. Disallow script/eval/executable markup and remote asset dependencies in the initial release.

**State/dependencies:** #18/#3/#40/#19 and history/comparison provenance. Load packs before state normalization so valid custom IDs are not discarded. A missing pack blocks resume with recovery choices rather than deleting its crops.

**Acceptance:** Valid packs appear in the palette/events/keepsakes and survive offline backup round trip. Test conflicting IDs, malformed effects, missing references, oversized files, prototype keys, removed packs, and clean exit into an unmodified vanilla run.

**Risk/rollout:** Complexity 5, wave 7. Modded results are labeled separately; no mutation of shared canonical registries or additional backend is required.

<a id="feature-44"></a>

### 44. Disaster drills

**Outcome:** Practise responding to a defined event sequence with explained consequences.

**Existing anchors:** [event-engine.js](../story-mode/src/game/event-engine.js), [intervention.js](../story-mode/src/game/intervention.js), [phase-machine.js](../story-mode/src/game/phase-machine.js), [event-card.js](../story-mode/src/ui/event-card.js).

**Implementation:** Author a small validated scenario catalog containing starting garden, event IDs, target rules, available interventions, and teaching objectives. Launch a separate practice run or a clearly labeled copy of the current garden. Execute through normal event/intervention paths, pausing between steps for explanation. Record the selected response and resulting score/damage; compare supported alternatives using pure previews. Allow reset within the drill without affecting real history.

**State/dependencies:** #40/#18/#3; #7's schedule only if a sprint drill uses it. Persist scenario version and cursor for optional resume.

**Acceptance:** Known responses yield the specified deterministic outcomes; invalid/missing event IDs fail before launch. Accept Loss always offers a viable path. Exit/reset preserves the original garden and cannot transfer drill rewards into personal bests or economy.

**Risk/rollout:** Complexity 3, wave 4. Keep scripted training distinct from normal challenge completion.

## H. Characters, ambience, and expression

<a id="feature-45"></a>

### 45. Free Play dialogue pools

**Outcome:** Brief, familiar commentary reacts to Free Play events and challenges without replaying campaign exposition.

**Existing anchors:** [DIALOGUE_SYSTEM.md](../specs/DIALOGUE_SYSTEM.md), [DIALOGUE_ENGINE.json](../specs/DIALOGUE_ENGINE.json), [dialogue-runner.js](../story-mode/src/game/dialogue-runner.js), [cutscene-machine.js](../story-mode/src/game/cutscene-machine.js), [data/cutscenes.js](../story-mode/src/data/cutscenes.js), [phase-router.js](../story-mode/src/game/phase-router.js).

**Implementation:** Audit which runtime path consumes each dialogue source; add explicit sandbox conditions and challenge sub-triggers to that actual path. Preserve Garden GURL → Onion Man → Vegeman → Critters ordering and each role's voice. Select lines from deterministic trigger/history inputs with bounded repetition. Use short event/harvest comments, skip/quiet controls, and no background random chatter. Suppress story intros without disabling necessary event/harvest UI progression.

**State/dependencies:** #1/#6/#40; #18 persists seen IDs keyed by run/season where appropriate. Existing chapter-start suppression does not prove every other cutscene is disabled in Free Play.

**Acceptance:** Same trigger/history chooses the same lines, modifiers select the correct override, missing lines fall back safely, and skipping never skips an unresolved mechanical choice. Reload does not replay an already-consumed reward or intro.

**Risk/rollout:** Complexity 3, wave 4. Update the actual runtime and canonical dialogue spec together.

<a id="feature-46"></a>

### 46. NPC visitors

**Outcome:** Neighbors visit the plot on a deterministic schedule shaped by existing relationships.

**Existing anchors:** [npcs.js](../story-mode/src/data/npcs.js), [reputation.js](../story-mode/src/game/reputation.js), [zones/player-plot.js](../story-mode/src/scene/zones/player-plot.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Extend existing seasonal schedules with plot visits keyed by run/season/calendar slot and reputation threshold. Select safe arrival positions outside bed access/collision routes. Register one interactable per visitor, with a short greeting and optional #34 quest. Remove the visitor and listeners at departure or zone exit. Keep the regular NPC location and visiting representation mutually consistent.

**State/dependencies:** #18/#3, shared calendar; #34 for quest-bearing visits, #23 for examine descriptions. Persist a visit's consumed interaction/reward status only when it has mechanics.

**Acceptance:** The same run/reputation yields the same visit. Reload/zone switching cannot duplicate NPCs or rewards. No visitor blocks planting access or steals modal focus. A player can ignore the visitor and continue gardening.

**Risk/rollout:** Complexity 3, wave 6. Begin with one existing neighbor and a complete visit lifecycle before expanding the roster.

<a id="feature-47"></a>

### 47. Calvin companion tasks

**Outcome:** Ask Calvin to patrol, flag an existing pest risk, or retrieve a bounded forage reward.

**Existing anchors:** [garden-scene.js](../story-mode/src/scene/garden-scene.js), [data/cutscenes.js](../story-mode/src/data/cutscenes.js), [interaction.js](../story-mode/src/game/interaction.js), [foraging.js](../story-mode/src/game/foraging.js).

**Implementation:** Add a separate logical companion-task state machine with idle, assigned, moving, completed, and canceled states. Coordinate its visual ownership with Calvin's existing loiter/cutscene behavior. Patrol and pest flags report actual game conditions; retrieval uses a deterministic capped reward with a validated grant. Define safe routes outside planted beds, cooldowns, and cancellation on scene changes. Do not repurpose `companion_patch`, which is a crop intervention bonus.

**State/dependencies:** #18/#3/#37 for retrieval; #23/#46 can share interactable lifecycle patterns. Persist task/reward IDs, not scene objects or movement callbacks.

**Acceptance:** Cutscenes, pause, zone travel, reload, blocked paths, and full inventory cannot duplicate a reward or strand Calvin. Pest alerts cannot invent an active event. Tasks remain optional and do not become a compulsory maintenance chore.

**Risk/rollout:** Complexity 4, wave 6. Ship patrol/alerts first, then retrieval after the reward loop is validated.

<a id="feature-48"></a>

### 48. Ambience that reacts

**Outcome:** Existing seasonal sound gently reflects soil condition and time of day.

**Existing anchors:** [ambient-generator.js](../story-mode/src/audio/ambient-generator.js), [audio-manager.js](../story-mode/src/audio/audio-manager.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js), [day-night-controller.js](../story-mode/src/game/day-night-controller.js).

**Implementation:** Add a small set of continuous, clamped parameters to the existing generator, such as filter brightness and pad balance. Derive them from established soil condition and presentation time, smoothing changes with audio gain ramps rather than rebuilding the graph every frame. Preserve first-user-gesture initialization, mute/volume preferences, and stop/dispose behavior. Always convey actionable soil information visually as well.

**State/dependencies:** #11/#42; #18 for settings. Audio parameters are derived and must not affect mechanics or deterministic event streams.

**Acceptance:** Check deterministic parameter mapping, mute before initialization, suspended audio context, repeated season changes, and return-to-title resource cleanup. Listen to transitions on desktop/mobile for clicks or excessive levels. Gameplay checksums remain identical with sound on/off.

**Risk/rollout:** Complexity 2, wave 7. Keep reactions subtle; do not make poor soil an unpleasant continuous alarm.

<a id="feature-49"></a>

### 49. Photo mode

**Outcome:** Frame the garden, hide controls, and save a correctly rendered PNG.

**Existing anchors:** [camera-controller.js](../story-mode/src/scene/camera-controller.js), [garden-scene.js](../story-mode/src/scene/garden-scene.js), [zone-manager.js](../story-mode/src/scene/zone-manager.js), [ui-binder.js](../story-mode/src/ui/ui-binder.js).

**Implementation:** Add a photo-mode state that saves camera pose, UI visibility, and input focus, pauses gameplay tasks, and offers bounded free-camera controls. Capture the active renderer immediately after a frame or through a dedicated render target; do not assume a retained WebGL buffer. Provide resolution limits, filename sanitization, export progress/error feedback, and a mobile download fallback. Restore all prior state on cancel or completion.

**State/dependencies:** Existing scene first; #22 queue pause contract and #9 active bed context where enabled. Photos contain no hidden save IDs or profile metadata by default.

**Acceptance:** Inspect the exported PNG for actual pixels, correct zone, no hidden HUD, and requested dimensions. Test context loss, failed encoding, repeated captures, mobile memory, Escape, and resize. Exiting resumes the same garden and camera without firing a tool.

**Risk/rollout:** Complexity 3, wave 7. Avoid globally enabling an expensive persistent drawing buffer solely for screenshots.

<a id="feature-50"></a>

### 50. Profile-aware labels

**Outcome:** Use the gardener's chosen name consistently in Free Play garden, journal, and recipe presentation.

**Existing anchors:** [player-profile.js](../story-mode/src/data/player-profile.js), [player-profile-editor.js](../story-mode/src/ui/player-profile-editor.js), [game-init.js](../story-mode/src/game/game-init.js), [ui-data-builders.js](../story-mode/src/ui/ui-data-builders.js).

**Implementation:** Offer the existing normalized profile editor during Free Play setup and reuse it in pause controls. Separate gardener name, garden name, and optional recipe display label. Compose user-facing copy through safe text nodes and keep stable crop/recipe IDs unchanged. Preserve canonical story references such as Mom's Sauce; a personal serving label does not rename the recipe definition. Use a short fallback when the name is empty.

**State/dependencies:** #18; #15/#32/#38 later consume the same label helper. Persist profile once in campaign state, with display overrides only where product copy requires them.

**Acceptance:** Rename, reload, create a second garden, view journal/recipe panels, and verify independent consistent labels. Test long names, Unicode, whitespace, HTML-like strings, and narrow screens. Exported run codes omit personal names unless explicitly chosen.

**Risk/rollout:** Complexity 2, wave 1. Prefer existing normalization limits; avoid adding a second profile system.

## Verification and release gates

### For each implementation slice

1. Refresh `main`, read current instructions, preserve dirty work, and claim an isolated checkout. Confirm that the baseline findings above still apply.
2. Add the narrowest meaningful tests for that feature. Existing suites provide starting points: [save.test.js](../story-mode/src/game/save.test.js), [store.test.js](../story-mode/src/game/store.test.js), [game-init.test.js](../story-mode/src/game/game-init.test.js), [events.test.js](../story-mode/src/data/events.test.js), [scoring.test.js](../story-mode/src/scoring/scoring.test.js), [walk-autopilot.test.js](../story-mode/src/game/walk-autopilot.test.js), [context-menu.test.js](../story-mode/src/ui/context-menu.test.js), and [context-menu-keyboard.test.js](../story-mode/src/ui/context-menu-keyboard.test.js). New test files named for the new module are proposed work, not existing coverage.
3. Run targeted `npm test -- <relevant test paths>` from `story-mode/`, then the appropriate full gate. The existing [verify-all.mjs](../scripts/verify-all.mjs) is the repository release verifier. [pages.yml](../.github/workflows/pages.yml) also runs [story-mode-design-language-diagnostic.mjs](../tests/story-mode-design-language-diagnostic.mjs).
4. Exercise the actual feature flow at desktop and 320/375/430px widths, keyboard only, and touch where applicable. Test offline after assets are available, unavailable storage, corrupted imports, pause/hidden tab, and reload at state boundaries. Use an isolated browser profile; do not overwrite the user's real saves. Automated checks are not a claim of VoiceOver or full WCAG certification.
5. Verify story-mode defaults and root Planner import/export have not regressed. For data-changing features, include old-save migration, future-version rejection, exactly-once rewards, and same-input deterministic replay fixtures. Hash logical mechanics separately from descriptive wall-clock timestamps.
6. Review the exact diff, update the user-facing changelog for shipped behavior, commit, push, and complete applicable merge/deploy gates. Verify the remote SHA, CI, Pages deployment, and the real user-facing feature after deployment. Do not bypass a failed gate or label a source-only change live.

### Failure behavior to implement once and reuse

| Failure | Required behavior |
|---|---|
| Save quota/storage unavailable | Preserve the current in-memory garden, show unsaved status, provide a full recovery download, and never overwrite the last valid durable record with partial data. |
| Unknown save or rules version | Preserve the file/record, explain incompatibility, allow export of the original, and do not relabel it as the current version. |
| Missing content pack | Identify the required pack/version and stop destructive normalization; offer recovery or an explicitly chosen copy with losses previewed. |
| No legal event or inaccessible world activity | Show a calm beat or a concrete locked reason; always retain a valid phase/exit path. |
| Stale queued action or two-tab write | Reject with a reason and refresh the preview; never silently apply an intent to a different bed, crop, season, or revision. |
| History limit or large export | Show size/retention choices and offer export before any archival that would discard full snapshots. |
| Audio/photo/scene capability failure | Preserve gameplay and provide a readable error; clean up temporary resources. |

### Product decisions to resolve in the affected slice

These do not block writing this plan. The proposed defaults are sufficient for sequencing, but the implementing change must document the decision before changing canonical rules.

- #1: Free Play challenge access, inconsistent Drought counts, No-Till soil scale, current-roster heirloom eligibility, shared-row geometry, and Late Start sow windows.
- #8/#19/#29: whether full 12×12/winter workspace compatibility ships as a schema migration or remains an explicitly unsupported interchange case. No silent data loss is acceptable.
- #11/#30: one coherent soil model and verified botanical-family data, without changing scoring merely to support a label.
- #35/#36/#38: pantry-to-item conversion, festival submission timing/consumption, and food-recipe crafting quantities.
- #20: comparison categories and multi-bed ranking; #4 remains a local honor-system mode.
- #18/#15/#43: storage limits should be finalized from measured serialized sizes and failure tests, not guessed browser quota guarantees.

## Plan validation record

- Inspected the current source tree and canonical specifications at the pinned baseline and checked the remote `main` SHA.
- Confirmed 51 crops, eight crop recipes, 40 events, zero chapter-99 eligible events, and no canonical `heirloom` field by reading the actual JSON data.
- Verified all 50 numbered sections include the six required planning fields and all 226 source links resolve to tracked baseline files.
- Mapped all 50 original feature numbers to an outcome, existing source anchors, implementation steps, state/dependencies, acceptance checks, and an estimated delivery wave.
- Identified shared work rather than specifying duplicate seed, save, event, import, or reward systems.
- Runtime tests, browser feature verification, and feature deployment remain future implementation gates. This document does not claim that the proposed features exist.

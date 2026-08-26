# Changelog

All notable changes to Garden OS are documented here.
Format: Keep a Changelog. Versioning: per-line product versions (Planner v4.x)
per docs/VERSIONING_POLICY.md; work with no published version number is grouped
in dated [Unversioned] blocks. Newest first.
Backfilled 2026-08-09 from git history, the archived v4 changelog, version
reports, FEATURES.md, progress.md, and Notion release records. Entries before
2026-03-11 are reconstructed and marked (reconstructed).

## [Unreleased]
### Added
- Added Export Save Backup and Import Save Backup to the Story Mode pause menu
  so a save slot can be downloaded as JSON and restored later, closing the
  data-loss path where Danger Zone deletes destroyed the only copy of a save.
### Changed
- Hardened the public authority API: request bodies are capped at 64KB,
  session ids, seeds, and game ids are validated before storage writes,
  Upstash session and per-session ledger keys expire (default 60 days,
  `GOS_AUTHORITY_SESSION_TTL_SECONDS`), the global ledger is length-capped
  (`GOS_AUTHORITY_LEDGER_MAX_ENTRIES`), and the Vercel handler enforces a
  per-caller fixed-window rate limit (`GOS_AUTHORITY_RATE_LIMIT`,
  `GOS_AUTHORITY_RATE_WINDOW_SECONDS`) plus an optional origin allowlist
  (`GOS_AUTHORITY_ALLOWED_ORIGINS`).
### Fixed
- Updated crop-count regression assertions to the canonical 51-crop roster so
  the Pages deploy gate passes again after the red_lettuce spec addition.
- `scripts/verify-all.mjs` now runs on Windows by spawning npm through a shell
  (npm is `npm.cmd` there and cannot be spawned directly).
- Replaced U+2713 check mark glyph in planner score chip with ASCII '+' per brand-rule no-Unicode policy.

## [Unversioned - 2026-08-09] Story Mode field-kit design language
### Added
- Added a versioned design-audit deployment prompt with explicit run controls,
  a four-part source-mapping gate, and measurable release acceptance checks.
- Added arrow, Home, End, and Escape navigation to Free Play context actions,
  including disabled-item semantics and focus return to the prior control.
- Added a release-blocking Story Mode field-kit check across four desktop and
  two supported phone viewports, with the same gate repeated after deployment.
### Changed
- Unified the Story Mode HUD, current task, season calendar, tool dock, context
  menu, and progression action into one warmer and more legible field-kit
  design language across desktop, ultrawide, and supported phone layouts.
### Fixed
- Removed duplicate progression emphasis and aligned the planning objective
  copy with the visible Start Season action.
- Kept the mobile tool tray above Plant, Backpack, and progression controls so
  every action remains visible and independently targetable.

## [Unversioned - 2026-08-09] Field Companion update and Free Play right-click menu
### Added
- Added a RuneScape-style right-click menu to Story Mode Free Play: context
  actions on bed cells and world objects (Plant, Water, Harvest, Protect,
  Mulch, Remove, Examine, travel, forage, Walk here) with walk-then-act
  auto-movement to the target.
### Changed
- Shipped 15 Field Companion improvements across Home, Beds, Planner, Doctor,
  Journal, Story Mode, and the guides: canonical entry point, truthful empty
  first-run state, single date and season authority, and outdoor mobile
  usability at 320, 375, and 430 px widths.
- Replaced Story Mode's noise-based seasonal ambience with deterministic
  generative pentatonic pads per season.
### Fixed
- Hardened the right-click menu against 15 verified defects: Escape no longer
  toggles the pause menu, dismissal clicks no longer fire the equipped tool,
  interior bed rows are reachable via a bed-edge reach fallback, and queued
  actions re-validate phase and zone on arrival.
- Fixed a brand-rule violation by replacing the score-key check glyph with the
  Icons.check SVG.
- Restored the registry sync script lost in the Desktop-to-Code migration.

## [Unversioned - 2026-07-11 to 2026-07-20] v5 recovery and economy authority
### Changed
- Routed crafting spend, recipe validation, and quest, festival, and harvest
  reward derivation through the authoritative game server.
### Fixed
- Restored the v5 What-If experiments and family recipe bridge lost during a
  rebase, with a fresh service-worker cache.
- Fixed broken PWA installs caused by the service worker precaching deleted
  v4 pages; removed dead sitemap and doc links.

## [Unversioned - 2026-07-06 to 2026-07-09] Server authority, v5 cutover, Story Mode visual overhaul
### Added
- Added an authoritative game server for Story Mode (engine core, worker,
  IndexedDB cache, deployable API on Vercel KV) with saves restored from
  authority.
- Added camera-relative movement and gardener profiles with palette variants.
### Changed
- Cut the user track fully over to v5: archived the v4 planner, doctor, and
  How It Thinks pages and repointed all links.
- Routed planting, watering, harvest, protection, cooldowns, tool durability,
  and item grants through server authority.
- Overhauled Story Mode visuals: golden-hour title art, fixed tone mapping,
  procedural growth-stage sprites for all 43 crops, watered-soil tint, and
  planting pop-in effects; rebuilt the player character and Calvin the
  sheepdog models.

## [Unversioned - 2026-07-03 to 2026-07-04] Graphical sprint and SEO
### Added
- Added a Why-this-score suitability explanation to the v5 planner.
- Added the cast portrait strip and visual reward gates to Story Mode zones.
### Changed
- Improved SEO metadata coverage across pages; polished the Philly backyard.
- Maintenance: pinned GitHub Pages deploy actions, fixed smoke verifiers.

## [Unversioned - 2026-06-22 to 2026-06-24] Reasoned export and open-world phases 5 to 8
### Added
- Added schema-backed reasoned export to the v4 planner.
- Added a market economy with price schedules, a content-pack loader and
  validator with example packs, and an expanded quest deck to Story Mode.
### Fixed
- Fixed open-world QA blockers and added an open-world smoke check.

## [Unversioned - 2026-04-25 to 2026-04-30] v5 user-track suite
### Added
- Added the v5 mobile-first suite: Hub, tap-to-paint Beds, vertical-timeline
  Planner, Doctor, and a local-first Garden Journal with per-cell logs.
- Added cross-device sync with hardened worker and import security.
- Added the mom's-garden beds workflow with plant profiles and safer editing.
### Changed
- Reordered navigation to HUB | PAINT | PLAN | DOCTOR | JOURNAL with
  cold-start routing and tablet and desktop breakpoints.
- Unified one shared suitability model across Painting and Doctor.
- Refreshed the landing page around the v5 Hub.

## [Planner v4.5] - 2026-04-22
### Added
- Added Today's Garden Coach: live Open-Meteo forecasts, a frost alert
  banner, and a Today task panel with Mark done, Snooze, and Undo.
- Added persistent weather site settings with City, ST lookup and fallback.
### Changed
- Refactored the world into 8 zones behind a shared contract module.
- Maintenance: version bump, service-worker cache refresh, FEATURES entry.

## [Unversioned - 2026-03-29 to 2026-04-05] Story Mode public release
### Added
- Released Story Mode to the public site at /story-mode-live/ alongside the
  finalized hub and planner roadmap.
- Added the Garden Doctor symptom-triage page.
- Added focus-visible and reduced-motion accessibility support to Story Mode.
### Fixed
- Fixed the Story Mode deploy path and CSS base path; fixed a startup crash.

## [Unversioned - 2026-03-21 to 2026-03-26] Story Mode buildout
### Added
- Added Story Mode, a mobile-first 3D garden game (Vite + Three.js): title
  screen with 3 save slots, pause menu, backpack, full Philly backyard
  environment, 35 authored cutscenes, and Calvin the sheepdog.
- Added the Let It Grow layer: 8-zone world map, 25 quests, skills, crafting,
  foraging, NPCs, reputation, festivals, market shop, day-night cycle, and a
  sandbox mode.
### Changed
- Aligned Story Mode scoring with the planner as ground truth, with 170+
  integration tests and save migration.

## [Unversioned - 2026-03-16 to 2026-03-20] v4 hardening, brand, and PWA
### Added
- Added the brand identity: shared theme, brand imagery, video hero home
  page, and brand guide.
- Added PWA support: manifest, service worker, offline capability.
- Added planner phases 1 to 3: scoring explainer, planting calendar with
  print layout, and per-cell harvest tracker.
### Changed
- Expanded the crop roster from 19 to 38 crops, reconciled across surfaces.
### Fixed
- Patched 23 bugs across Planner v4 and Season Engine v3; hardened engine
  saves with crash-safe parsing and APP_VERSION stamps.

## [Planner v4.4] - 2026-03-15
### Added
- Added the Score Explanation panel: each cell's score broken into six
  weighted factors plus a full adjacency report, with the limiting factor
  highlighted.
- Added workspace export and import as .gos.json with schema validation and
  version migration; published gos-schema.json as the formal data contract.
- Added the sun direction model with directional light scoring.
- Added the Fairness Tester and the How It Thinks scoring guide.
- Released the Season Engine v3 campaign game as its own hub entry.
### Changed
- Split navigation into user and dev tracks; accessibility pass (skip links,
  contrast, semantics).

## [Planner v4.3] - 2026-03-14
Ported from the archived changelog; long-form detail (including v4.3.1
patches and stats) in archive/DOC garden-os-changelog.md.
### Added
- Added derived cell traits (trellis row, protected, critter safe, access
  priority) computed in one zone pass and stamped onto cells.
- Added crop validity with hard and advisory severities and per-cell issue
  icons.
- Added the scoring system map and interactive scoring visualizer pages.
- Added a cross-page nav bar across index, planner, build guide, ops guide.
### Changed
- Replaced ad hoc cage checks with trait-based scoring and autofill.
- Migrated persistence to the schema v1 workspace envelope with legacy
  gardenOS_v4 and URL-hash loading; cage wall behavior now uses runtime
  overrides instead of mutating stored settings.
- Replaced the ops guide with the complete 7-section expandable version.

## [Planner v4.2] - 2026-03-14 (reconstructed)
Absent from the archived changelog; reconstructed from the release commit.
### Added
- Added the Cage tab: cage, rear-trellis, and wire-side toggles with cage
  visuals, door indicator, and zone-aware scoring bonuses.
- Added cherry tomato (crop 44), TRELLIS and PROTECTED palette badges, the
  Mom's Sanctuary goal, and an 8x4 default bed with compatible saves.
- Folded the cage build guide and ops guide into the Garden OS suite.

## [Unversioned - 2026-03-12] Repository goes public
### Added
- Published the v1 to v4 planner lineage to GitHub with Pages hosting and a
  deploy-on-push workflow.

## [Planner v4.1] - 2026-03-11
Ported from the archived changelog. Stability and security release.
### Fixed
- Fixed the share link dropping the USDA zone setting.
- Fixed the N-S orientation penalty over-selecting columns on narrow beds.
- Fixed division-by-zero in sun scoring, stale cell selection after resize,
  duplicate water-mismatch warnings, undo-stack pollution on first visit,
  double cellIssues computation, and live-bed mutation during scoring.
### Security
- Added escapeHtml across all render paths, a Content Security Policy,
  payload size limits, full settings validation with allowlists, prototype
  pollution guards, and removed all 22 inline event handlers.

## [Planner v4.0] - undated (reconstructed; documented 2026-03-11)
Ported from the archived changelog. Initial release of the raised bed
planner: 43 crops in 8 categories, 3-panel layout, scoring engine (sun,
companions, water, season, goals), auto-fill by goal, undo and redo,
variable bed sizes, zone map, per-cell inspect, crop search, succession
badges, share by URL, localStorage persistence, responsive layout.

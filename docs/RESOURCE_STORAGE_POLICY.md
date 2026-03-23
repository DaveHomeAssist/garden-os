---
Status: Active
Document Version: 1.0
Compatible With: Garden OS v4.3, Story Mode v0.1, Schema v1
Owner: Dave Robertson
Last Updated: 2026-03-22
Artifact Class: SOP
---

# Garden OS — Resource Storage Policy

## Purpose

Garden OS now spans multiple active lines:

1. root static tools and explainers
2. planner v4.3
3. legacy season simulator lineage
4. `story-mode/` as the active flagship runtime
5. Let It Grow as an in-scope planned mode with docs, but no runtime branch yet

This policy defines how resources should be stored so those lines can coexist without duplicating canon, hiding ownership, or mixing source files with generated output.

## Core Rule

Store resources by **scope** and **lifecycle**, not by version label alone.

That means:

- shared truth lives once
- runtime-specific resources live with the runtime that owns them
- generated files are never treated as source
- archived files are frozen and isolated

## Resource Classes

| Class | Meaning | Source of Truth |
|------|---------|-----------------|
| Shared Canon | Rules, contracts, or data used across active Garden OS lines | `specs/` and future `data/shared/` |
| Repo Canon | Repo-wide reference, process, and system docs | `docs/` |
| Mode Canon | Mode-specific planning and technical docs | `docs/story-mode/` today; future mode docs under `docs/<mode>/` |
| Runtime-Local | Assets or data only meaningful to one runtime | colocate with that runtime |
| Generated | Build output, screenshots, regression captures, temp artifacts | `dist/`, `output/`, `story-mode/dist/`, `story-mode/output/` |
| Archived | Frozen legacy HTML, docs, and experiments | `archive/` only |

## Storage Principles

### 1. Shared Truth Lives Once

If the same resource means the same thing across 2 or more active lines, store it once.

Examples:

- crop rules and attributes
- event deck definitions
- scoring rules
- save contract schemas
- repo-wide brand tokens

Preferred locations:

- `specs/` for contracts and rules
- `data/shared/` for runtime-consumable shared JSON
- `assets/shared/` for shared visual/media resources

### 2. Runtime-Specific Resources Stay Local

If a resource only exists for one runtime, it should live with that runtime.

Examples:

- `story-mode` cutscene authored data
- `story-mode` scene textures and CSS
- planner-only UI config
- legacy simulator-only scenario fixtures

Preferred locations:

- `story-mode/assets/`
- `story-mode/src/data/`
- future `data/planner/`
- future `data/legacy-season/`

### 3. Generated Output Is Not Source

Generated output must never become the place people edit or reason from first.

Generated paths:

- `dist/`
- `story-mode/dist/`
- `output/`
- `story-mode/output/`

These may be committed if needed for Pages/runtime behavior, but they are still generated artifacts, not canonical source.

### 4. Archive Once, Not Twice

Frozen legacy artifacts belong in one archive tree.

Current state mixes:

- `archive/`
- `archives/`

Target state:

- `archive/html/`
- `archive/docs/`
- `archive/experiments/`

Do not keep active and historical copies side-by-side in the same top-level namespace unless the active one is clearly canonical and the legacy one is clearly archived.

### 5. Let It Grow Is In Scope, But Not A Runtime Yet

Let It Grow is a planned mode under Garden OS, not a separate product or standalone runtime branch today.

Until executable code exists:

- planning docs belong in `docs/story-mode/`
- shared resources should stay in shared canon locations
- do not create a fake runtime folder just to hold speculative assets

When runtime code exists, preferred target is:

- `let-it-grow/` for runtime-local code and assets
- `docs/let-it-grow/` for mode-specific docs if it diverges enough from `docs/story-mode/`

## Target Directory Roles

| Path | Role | Notes |
|------|------|-------|
| `specs/` | Shared gameplay contracts and canonical rules | Existing canonical layer |
| `docs/` | Repo-wide canonical docs and SOPs | Existing canonical layer |
| `docs/story-mode/` | Story Mode and Let It Grow planning, systems, technical docs | Active mode-specific planning layer |
| `data/shared/` | Shared runtime JSON used by multiple active lines | Preferred future home for shared non-spec JSON |
| `data/planner/` | Planner-only runtime/config data | Preferred future home |
| `data/legacy-season/` | Legacy simulator-only data | Preferred future home |
| `assets/shared/brand/` | Shared logos, favicons, brand marks | Preferred future home |
| `assets/shared/media/` | Shared promotional video or common hero media | Preferred future home |
| `images/guides/` | Build guide and instructional imagery | Keep as authored images |
| `images/marketing/` | Marketing renders and visual collateral | Keep separate from runtime assets |
| `images/reference/` | Real-world reference photos and non-runtime research images | Keep separate from marketing |
| `story-mode/assets/` | Story Mode-only runtime assets | Current valid local runtime storage |
| `story-mode/src/data/` | Story Mode-only authored game/narrative data | Current valid local runtime storage |
| `dist/`, `story-mode/dist/` | Generated deployable output | Not canonical source |
| `output/`, `story-mode/output/` | Test captures and validation artifacts | Not canonical source |
| `archive/` | Frozen legacy artifacts only | Consolidate here |

## Current Root-Level Resource Problems

The repo currently has several loose top-level files that blur ownership:

- `achievement-registry.json`
- `crop-roster.json`
- `league-config.json`
- `pest-profiles.json`
- `scenario-schema.json`
- `scoring-api.json`

These should not stay indefinitely at repo root unless they are part of a root-level public contract.

Default migration target:

- shared runtime data -> `data/shared/`
- planner-only or legacy simulator-only data -> matching mode folder under `data/`
- if a file is actually a canonical contract, move it into `specs/`

## Recommended Ownership Rules

### Shared Canon

Use for:

- crop identity and scoring data
- event definitions
- scoring rules
- shared save/export contracts
- design tokens used across multiple active lines

Do not duplicate these into each runtime unless the runtime needs a build-time copy generated from the shared source.

### Root Static Tool Suite

Owns:

- direct HTML pages at repo root
- root-only helper assets needed by those pages
- root-only planner and legacy simulator behavior

Should consume shared canon wherever possible rather than creating parallel data files.

### Story Mode

Owns:

- `story-mode/src/`
- `story-mode/assets/`
- `story-mode/src/data/`
- `story-mode/dist/` generated output
- `story-mode/output/` runtime validation captures

Should not become the hidden source of truth for shared game rules unless those rules are intentionally story-mode-specific.

### Let It Grow

Owns nothing runtime-local yet.

Current scope is:

- naming
- product framing
- roadmap
- future system design

Until code exists, Let It Grow should consume shared canon and documentation, not create a separate asset silo.

## Lifecycle Rules

| Lifecycle | Allowed Locations | Rule |
|----------|-------------------|------|
| Active source | `specs/`, `docs/`, runtime source trees | Safe to edit |
| Generated | `dist/`, `output/` | Never edit by hand unless explicitly required |
| Historical | `archive/` | Freeze and annotate |
| Draft planning | `docs/`, `docs/story-mode/` | Must not silently replace canon |

## Immediate Cleanup Targets

1. Consolidate `archive/` and `archives/` into one `archive/` tree.
2. Introduce a `data/` namespace instead of leaving runtime JSON at repo root.
3. Separate shared brand/media assets from runtime-local assets.
4. Keep `docs/story-mode/` as the home for Story Mode / Let It Grow planning until Let It Grow has executable code.
5. Treat `dist/` and `output/` as generated in both docs and workflow.

## Non-Goals

- This policy does not force an immediate monorepo refactor.
- This policy does not create a shared-core runtime package yet.
- This policy does not move files automatically.
- This policy does not split Let It Grow into a new repo.

## Decision

Garden OS resources should be stored by:

1. **scope**: shared, repo-wide, mode-specific, runtime-local
2. **lifecycle**: active, generated, archived

Not by version name alone.

That is the only storage model that scales across planner, legacy simulator, Story Mode, and the planned Let It Grow branch without multiplying duplicate assets and duplicate truth.

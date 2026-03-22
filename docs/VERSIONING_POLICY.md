---
Status: Active
Document Version: 1.1
Compatible With: Garden OS v4.3 / Story Mode v0.1 / Schema v1 / Season Engine v4
Owner: Dave Robertson
Last Updated: 2026-03-22
Artifact Class: SOP
---

# Garden OS — Versioning Policy

## Three Version Layers

Garden OS maintains three independent version tracks. They increment separately.

| Layer | What it versions | Current | Where it lives |
|-------|-----------------|---------|----------------|
| **Product Version** | The shipped user experience across active runtime lines | Planner v4.3, Legacy Season Engine v4.0, Story Mode v0.1 | runtime entry surface + release metadata |
| **Schema Version** | Workspace data shape, save/load format, `.gos.json` exports | Schema v1 | `gos-schema.json` → `version` field (const) |
| **Document Version** | Specs, guides, SOPs, design docs | Per-file (e.g., Doc v1.0) | YAML frontmatter header in each file |

A document edit does not bump the product version. A product release does not bump the schema version unless the data shape changed. A schema bump always requires a migration path documented in `docs/MIGRATION-CONTRACT.md`.

Storage scope and lifecycle are separate from these version tracks and are governed by `docs/RESOURCE_STORAGE_POLICY.md`.

## Current Product Lines

Garden OS is no longer one product surface with one runtime model.

| Line | Current Status | Runtime Model |
|------|----------------|---------------|
| Root static tools | Active | direct HTML from repo root |
| Planner v4.3 | Active | single-file HTML |
| Legacy Season Engine v4.0 | Active, legacy branch | single-file HTML |
| Story Mode v0.1 | Active flagship runtime | Vite + Three.js app in `story-mode/` |
| Let It Grow | Planned, docs-only | no runtime branch yet |

---

## Product Version Scheme

Semantic-ish release numbers for shipped HTML tools:

| Type | When | Example |
|------|------|---------|
| **Major** | New tool surface, scoring formula rewrite, campaign structure change | v5.0 |
| **Minor** | New feature, new crop, new event, UI redesign | v4.4 |
| **Patch** | Bug fix, copy tweak, CSS polish, no logic change | v4.3.1 |

Each HTML product file carries its version in:
- `<title>` tag (user-visible)
- `APP_VERSION` JS constant (export stamp)
- Filename suffix for major versions only (e.g., `garden-planner-v4.html`, not `garden-planner-v4.3.html`)

---

## Schema Version Scheme

Real semantic versioning for data contracts:

| Change Type | Example | Migration Required? |
|-------------|---------|-------------------|
| Backward-compatible field add | 1.1.0 | No — old saves still load |
| Internal clarification only | 1.0.1 | No |
| Breaking: renamed key, removed field, changed type | 2.0.0 | Yes — migration function required |

The schema version is a `const` integer in `gos-schema.json`. On load, the app checks `version` and runs migration if needed. Migration rules live in `docs/MIGRATION-CONTRACT.md`.

---

## Document Version Scheme

Simple revision numbers for docs and specs:

| Stage | Version | Meaning |
|-------|---------|---------|
| Work in progress | Doc v0.x | Draft, not reliable |
| First stable | Doc v1.0 | Reviewed and canonical |
| Content revision | Doc v1.1 | Updated, same structure |
| Major rewrite | Doc v2.0 | Structure changed |

---

## Resource Scope And Storage

Version numbers do not decide where resources live.

Resource placement is determined by:

1. scope
2. lifecycle

Use `docs/RESOURCE_STORAGE_POLICY.md` as the governing storage document.

### Scope Rules

| Scope | Preferred Location | Rule |
|------|--------------------|------|
| Shared canonical rules/contracts | `specs/` | One copy only |
| Shared runtime data | future `data/shared/` | Do not duplicate per version line |
| Repo-wide docs/process | `docs/` | Canonical reference layer |
| Story Mode / Let It Grow planning | `docs/story-mode/` | Mode-specific planning/docs |
| Story Mode-only runtime assets/data | `story-mode/assets/`, `story-mode/src/data/` | Colocate with runtime |
| Shared brand/media | future `assets/shared/` | Do not scatter across runtimes |

### Lifecycle Rules

| Lifecycle | Preferred Location | Rule |
|----------|--------------------|------|
| Active source | source trees, `specs/`, `docs/` | Safe to edit |
| Generated output | `dist/`, `story-mode/dist/`, `output/`, `story-mode/output/` | Never treat as canonical source |
| Historical | `archive/` | Freeze and isolate |

### Storage Consequence

Do not create a new copy of a resource simply because a new Garden OS version or mode exists.

Examples:

- a new story-mode build should not create its own private copy of shared crop canon if the shared canon still means the same thing
- Let It Grow should not get a runtime asset tree until it has real executable code
- generated screenshots and build bundles do not become source of truth just because they are committed

---

## Required Metadata Header

Every canonical doc and spec file must include this YAML frontmatter:

```yaml
---
Status: Draft | Active | Locked | Deprecated
Document Version: 1.0
Compatible With: Garden OS v4.3
Owner: Dave Robertson
Last Updated: 2026-03-16
Artifact Class: Spec | Ref | SOP | Release Note
Supersedes: [optional — file it replaced]
---
```

**Status definitions:**

| Status | Meaning |
|--------|---------|
| **Draft** | In progress, not reliable, may change without notice |
| **Active** | Current canonical artifact, maintained |
| **Locked** | Shipped and frozen — changes require a new version |
| **Deprecated** | Replaced, retained for reference only |

---

## Artifact Classes

| Class | Naming Pattern | Version Rule |
|-------|---------------|-------------|
| **Product Surface** | `garden-planner-v4.html` | Product version in title + constant |
| **Spec** | `specs/SCORING_RULES.md` | Must increment when logic changes |
| **Schema / Contract** | `gos-schema.json` | Semantic schema versioning, migration required on major |
| **Reference Doc** | `docs/HANDOFF.md` | Doc version + compatibility tag |
| **SOP / Process** | `docs/VERSIONING_POLICY.md` | Doc version only |
| **Guide** | `garden-cage-build-guide.html` | Doc version, compatibility tag |
| **Release Note** | `archive/DOC garden-os-changelog.md` | Locked once shipped |
| **Experiment** | `archive/WEB garden-planner-v5a.html` | Marked deprecated, retained |

---

## Compatibility Matrix

Current state as of 2026-03-22:

| Artifact | Current Version | Compatible With | Status |
|----------|----------------|-----------------|--------|
| Hub (`index.html`) | v1.0 | Garden OS current root surfaces | Active |
| Planner (`garden-planner-v4.html`) | v4.3 | Schema v1, current planner product | Active |
| Legacy Season Engine v4 (`garden-league-simulator-v4.html`) | APP_VERSION 4.0 | Legacy season sandbox line | Active |
| Story Mode (`story-mode/`) | v0.1 | Story Mode runtime line | Active |
| Let It Grow | docs-only | Garden OS umbrella planning line | Planned |
| Build Guide | Doc v1.0 | Physical cage system | Active |
| Ops Guide | Doc v1.0 | Cage system, Planner v4.3+ | Active |
| gos-schema.json | Schema v1 | Garden OS v4.3+ | Active |
| SCORING_RULES.md | Spec v1.0 | Planner v4.3, legacy season engine, future shared use | Active |
| CROP_SCORING_DATA.json | Data v1 | Shared crop canon across active lines | Active |
| DIALOGUE_ENGINE.json | Data v1 | Legacy season engine canon; story-mode may supersede locally where needed | Active |
| EVENT_DECK.json | v1 | Legacy season engine, Story Mode carry-forward/event interpretation | Active |
| SEASON_ENGINE_SPEC.md | Doc v1.0 | Legacy season engine line | Active |
| VOICE_BIBLE.md | Doc v1.0 | Root tools and Story Mode voice constraints | Active |
| MIGRATION-CONTRACT.md | Doc v1.0 | Schema v1 | Active |
| HANDOFF.md | Doc v1.1 | Hybrid repo current state | Active |
| RESOURCE_STORAGE_POLICY.md | Doc v1.0 | Hybrid repo resource placement | Active |
| CLAUDE.md | **Unversioned** | All tools | Active |

---

## Consistency Issues Found (2026-03-16 Audit)

| Issue | Location | Resolution |
|-------|----------|------------|
| SCHEMA.md conflates app version and schema version | Removed | Resolved — removed SCHEMA.md, CLAUDE.md updated to reference gos-schema.json only |
| SEASON_ENGINE_SPEC.md references "schema v2" | Line 5 depends-on block | Fix to "schema v1" — v2 does not exist |
| EVENT_DECK.json has no version wrapper | `specs/EVENT_DECK.json` | Resolved — wrapped in versioned object with `$schema`, `version`, `description` |
| VOICE_BIBLE.md lacks metadata header | `docs/VOICE_BIBLE.md` | Resolved — header added |
| MIGRATION-CONTRACT.md lacks metadata header | `docs/MIGRATION-CONTRACT.md` | Resolved — header added |
| HANDOFF.md lacks formal version field | `docs/HANDOFF.md` | Resolved — header added |
| CLAUDE.md has no self-version | References other versions but not its own | Add comment header or keep unversioned (agent instructions are living docs) |
| 5 doc files lack any metadata | Various in docs/ | Add headers progressively |

---

## Change Taxonomy

Label every change with one of these:

| Type | When to use | Examples |
|------|-------------|---------|
| **Patch** | No logic change | Typo fix, copy edit, CSS polish |
| **Minor** | New content or behavior, backward compatible | New crop field, new doc section, new UI panel |
| **Major** | Logic change, data migration, guide rewrite | Scoring formula change, schema v2, guide restructure |
| **Breaking** | Incompatible with previous version | Renamed save keys, removed behaviors, changed export format |

---

## Release Checklist

Before tagging a release:

1. All changed product files have updated `APP_VERSION` / `<title>`
2. Schema version bumped if data shape changed (+ migration function)
3. Changelog updated in `archive/DOC garden-os-changelog.md`
4. All affected docs have updated `Compatible With` and `Last Updated`
5. Compatibility matrix in this file updated
6. `docs/active-hosted-urls.md` verified
7. Resource placement checked against `docs/RESOURCE_STORAGE_POLICY.md`
8. Stable baseline tagged in git

---

## What Not To Version

- Conversation-scoped plans and task lists
- Git commit messages (they version themselves)
- Experimental files in `archive/` (mark deprecated, don't track versions)
- Generated files in `dist/` and `output/` trees
- The `CLAUDE.md` agent instructions file (living doc, always current)

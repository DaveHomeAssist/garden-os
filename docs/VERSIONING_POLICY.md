---
Status: Active
Document Version: 1.0
Compatible With: Garden OS v4.3 / Schema v1 / Season Engine v3
Owner: Dave Robertson
Last Updated: 2026-03-16
Artifact Class: SOP
---

# Garden OS — Versioning Policy

## Three Version Layers

Garden OS maintains three independent version tracks. They increment separately.

| Layer | What it versions | Current | Where it lives |
|-------|-----------------|---------|----------------|
| **Product Version** | The shipped user experience (Planner, Season Engine, Home) | Planner v4.3, Season Engine v3 | `APP_VERSION` constant in each HTML file's `<title>` |
| **Schema Version** | Workspace data shape, save/load format, `.gos.json` exports | Schema v1 | `gos-schema.json` → `version` field (const) |
| **Document Version** | Specs, guides, SOPs, design docs | Per-file (e.g., Doc v1.0) | YAML frontmatter header in each file |

A document edit does not bump the product version. A product release does not bump the schema version unless the data shape changed. A schema bump always requires a migration path documented in `docs/MIGRATION-CONTRACT.md`.

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

Current state as of 2026-03-16:

| Artifact | Current Version | Compatible With | Status |
|----------|----------------|-----------------|--------|
| Home hub (index.html) | v1.0 | Garden OS v4.3+ | Active |
| Planner (garden-planner-v4.html) | v4.3 | Schema v1, current product | Active |
| Season Engine (garden-league-simulator-v3.html) | APP_VERSION 3.0 | Standalone (own localStorage) | Active |
| Season Engine v4 (garden-league-simulator-v4.html) | APP_VERSION 4.0 | v3 game engine + brand tokens | Draft |
| Build Guide | Doc v1.0 | Physical cage system | Active |
| Ops Guide | Doc v1.0 | Cage system, Planner v4.3+ | Active |
| gos-schema.json | Schema v1 | Garden OS v4.3+ | Active |
| SCORING_RULES.md | Spec v1.0 | Planner v4.3, Season Engine v3 | Active |
| CROP_SCORING_DATA.json | Data v1 | Planner v4.3, Season Engine v3 | Active |
| DIALOGUE_ENGINE.json | Data v1 | Season Engine v3 | Active |
| EVENT_DECK.json | v1 | Season Engine v3, v4 | Active |
| SEASON_ENGINE_SPEC.md | Doc v1.0 | Season Engine v3 | Active |
| VOICE_BIBLE.md | Doc v1.0 | Season Engine v3, Planner v4.3 | Active |
| MIGRATION-CONTRACT.md | Doc v1.0 | Schema v1 | Active |
| HANDOFF.md | Doc v1.0 | Phase 1 complete | Active |
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
`|------|-------------|---------|
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
7. Stable baseline tagged in git

---

## What Not To Version

- Conversation-scoped plans and task lists
- Git commit messages (they version themselves)
- Experimental files in `archive/` (mark deprecated, don't track versions)
- The `CLAUDE.md` agent instructions file (living doc, always current)

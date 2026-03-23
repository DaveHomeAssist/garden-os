# Garden OS Backlog Normalization

Status: Active
Updated: 2026-03-23
Purpose: deduplicate the imported Garden OS issue backlog and define one execution-ready order.

## Why This Exists

The imported backlog is not execution-ready. It mixes duplicate incidents, overlapping epics, cross-project tasks, and malformed titles. This document collapses that noise into a smaller set of canonical workstreams.

## Normalization Rules

1. One incident or product problem gets one canonical ticket.
2. Research blocks roll up into the parent execution epic unless they truly need separate owners.
3. Cross-project tasks do not stay in the Garden OS product backlog.
4. Notion-friendly title punctuation does not become filesystem-facing naming.
5. Derived planning views do not replace a canonical backlog.

## Canonical Execution Order

| Order | Canonical Workstream | Priority | Why It Goes Here | Source Items Collapsed Into It |
|---|---|---|---|---|
| 1 | Not Found Error and Recovery Handling | P0 | This is already labeled as blocker work and should be treated as one incident lane, not three partial tickets. | `Investigate Not Found Error in Garden OS`, `Update Not Found Error Handling in Garden OS`, `Implement error handling for not found issues` |
| 2 | Missing Resources and Rendering Integration | P0 | Rendering, missing resources, sprite wiring, and hybrid art rules are one delivery lane. Splitting them creates planning noise and hides the blocking dependency chain. | `Identify missing resources for Garden OS`, `Implement Rendering Integration for Garden OS Engine`, `Create Asset Generation Workflow for Garden OS`, `Visual System Upgrade Research Block 4` |
| 3 | Engine Integrity and Planner State Machine | P1 | Determinism, undo, transition integrity, and planner loop ownership are the foundation for any later UX or content work. | `Fix Garden OS transition and undo issues`, `Improve Engine Integrity in Garden OS`, `Define Garden OS Loop Model Actions`, `Audit dashboard tab - faithfulness checklist` |
| 4 | Crop Library Expansion and Bed Geometry Upgrade | P1 | Crop expansion, bed sizes, share links, scoring growth, and research blocks all describe the same product expansion lane. | `Update crop database in Garden OS`, `Expand Crop Library in Garden OS`, `Crop Library Expansion Research Block 1`, `Weather and Location Integration Research Block 2`, `Bed Geometry and Variable Sizes Research Block 3`, `Scoring Model Enhancements Research Block 5`, `Platform and Distribution Strategy Research Block 6`, `Feature Spec Roadmap and Risk Register` |
| 5 | Planner UX and Responsive Surface Cleanup | P1 | Mobile usability, layout density, CSS drift, and planner shell cleanup should be executed together, not as isolated cosmetic patches. | `Implement CSS and JS Changes for Garden OS`, `Audit Garden OS UI - Full Surface Review` |
| 6 | Intervention Mode UX Hardening | P2 | This is a substantial but bounded subsystem pass. It should follow core engine and planner cleanup rather than compete with them. | `Implement UX Improvements for Intervention Mode` |
| 7 | Status and Documentation Sync | P2 | These are valid maintenance tasks, but they should follow actual repo changes rather than lead them. | `Update SFT Current Status for Recent Changes`, `Review and update product README` |
| 8 | Reminders and Push Notifications | P3 | These are additive features with no evidence of being on the critical path. | `Configure task reminders in Garden OS`, `Configure push notifications in Garden OS` |
| 9 | Product Positioning and Theme Direction | P3 | Theme and vibe work matters, but it should not compete with blockers, engine integrity, or planner UX stabilization. | `Review Territory Map - Themes and Vibes` |

## Cross-Project or Non-Canonical Items

These should be removed from the Garden OS product backlog or moved into the correct tracker:

- `Discuss AI Tools and Funding Strategies`
- `Test Garden OS Planner Features and Navigation`
- `Trail Keeper: test weather, zip code, trail lookup`
- `Prompt Lab: test on iPad, capture feedback`
- `Draft Cage Ops Guide - Canvas Doc`

## Immediate Execution Sequence

1. Resolve the Not Found incident end to end.
2. Finish the rendering and resource integration lane.
3. Lock the engine-state and undo-transition contract.
4. Only then expand crops, bed geometry, and scoring surface area.
5. After core correctness is stable, do planner/mobile UX cleanup.

## Naming Cleanup

Normalize issue titles before they become files, task folders, or generated artifacts:

- Remove duplicated prefixes such as `REF -` repeated in both title columns.
- Avoid `|` in any title that may become a filename on Windows.
- Prefer one canonical title per workstream, then use subtasks for the implementation checklist.

## Recommended Next Step

Treat items 1 through 5 as the active Garden OS execution backlog. Everything else should be demoted, moved, or split out of the product tracker until the blocking platform work is closed.

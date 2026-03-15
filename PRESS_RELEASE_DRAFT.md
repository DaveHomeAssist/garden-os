# Garden OS v4.4

## Now Your Garden Explains Itself

**FOR IMMEDIATE RELEASE**
Draft for internal review only

---

Garden OS, the zero backend raised bed planning system, releases its biggest update since the v4 rewrite. Version 4.4 introduces explainable scoring, portable workspaces, and a formal data contract.

---

MELBOURNE, AU — March 2026

Garden OS, the open source raised bed planner that runs entirely in the browser, has released version 4.4. The update transforms the planner from a layout tool into a horticultural reasoning engine.

Three major capabilities define this release.

## "Why This Score?"

Every cell in a Garden OS bed has always displayed a score from 0 to 10.

In v4.4, users can now see exactly why.

The new Score Explanation panel in the Inspect tab breaks each score into its weighted factors:

- Sun fit
- Structural support
- Shade tolerance
- Cell access
- Seasonal timing
- Structural bonuses

It also includes a full adjacency report showing:

- Companion plant benefits
- Conflict penalties
- Water compatibility with neighboring crops

The system automatically highlights the limiting factor, the single variable pulling the score down the most.

> "A 6 out of 10 isn't a failure. It's a diagnosis."
>
> — Dave Robertson, project creator

"Maybe the sun is perfect but the tomato is trapped in an interior cell with no trellis access. Now you can see that instantly instead of guessing."

The scoring explanation follows Liebig's Law of the Minimum, the biological principle that growth is constrained by the scarcest resource rather than the total resources available.

Garden OS now makes that constraint visible.

## Save Your Garden to a File

Until now, Garden OS workspaces lived entirely in localStorage, tied to a single browser on a single device.

Version 4.4 introduces `.gos.json` export and import.

Users can now download their complete workspace as a portable file, including:

- Beds
- Layouts
- Cage configurations
- Settings
- Notes

Import validation ensures the file matches the official schema, performs version migration if needed, and confirms before replacing existing data.

No account required.
No cloud storage.
Just a file.

## A Formal Data Contract

Version 4.4 also introduces `gos-schema.json`, a full JSON Schema definition of the Garden OS data model.

The schema formally defines:

- Workspace structure
- Bed records
- Cage configurations
- Site settings
- Crop records
- Scoring inputs and outputs

This establishes a machine readable contract for the ecosystem.

Future Garden OS tools currently in development will rely on this shared data layer, including:

- Symptom triage
- Yield forecasting
- Experiment tracking

The schema ensures every tool speaks the same language.

## By the Numbers

| Metric | Value |
|--------|-------|
| Crops | 38 crops across 8 categories |
| Scoring | 5 weighted factors + structural bonus, with adjacency applied separately |
| Tools | 6 tools in the Garden OS ecosystem |
| Codebase | 9,169 lines of handwritten HTML, CSS, and JavaScript |
| Dependencies | Zero |

Garden OS uses no frameworks, build tools, or backend services.

Every tool is a single HTML file that runs in any modern browser.

## Garden OS Tool Suite

- Raised Bed Planner
- Garden Cage Build Guide
- Garden Cage Ops Guide
- Scoring System Map
- Scoring Visualizer
- Garden OS Landing Page

## Availability

Garden OS v4.4 is available now:

**Garden OS**
https://davehomeassist.github.io/garden-os/

**Source Code**
https://github.com/DaveHomeAssist/garden-os

---

Garden OS is a personal project by Dave Robertson.

It is not affiliated with any company.

It costs nothing.
Tracks nothing.
Stores everything on your device.

---

**Media contact:** None. This document is an internal draft.

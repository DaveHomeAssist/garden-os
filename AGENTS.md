# AGENTS.md

Inherits root rules from `/Users/daverobertson/Desktop/Code/AGENTS.md`.

## Project Overview

Garden OS is a browser native garden planning and scoring ecosystem. It combines planning tools, scoring visualizers, and system maps into a static deployable hub.

## Stack

- Static HTML, CSS, and JavaScript
- Local storage for browser side persistence
- GitHub Pages style static hosting
- No backend

## Key Decisions

- Keep the product browser native and zero backend to preserve portability and low operating cost
- Ship tools as static surfaces so each module can be opened directly
- Treat scoring rules as canonical shared logic across planners, maps, and visualizers

## Issue Tracker

| ID | Severity | Status | Title | Notes |
|----|----------|--------|-------|-------|
| 014 | P2 | resolved | Reduce planner right sidebar overload | Summary now stays compact, dashboard moved behind its own reveal, and switching sections collapses stale side content |
| 001 | P2 | resolved | Replace planner confirm flows with reversible recovery | Clear, reset, delete, import replace, and harvest delete now use undo or restore paths |
| 002 | P2 | resolved | Separate home and hub roles | `home.html` is the guided start page and `index.html` is the live launcher |
| 003 | P2 | resolved | Surface one dominant simulator action per phase | Added objective strip with current phase CTA and kept existing engine logic intact |
| 004 | P2 | resolved | Share planner manage menu pattern with Season Engine | Added a matching manage drawer in the game shell with tool and learn routes |
| 005 | P2 | resolved | Repair tutorial tomato targeting | Tutorial step 1 now forces the crop palette open before pointing at the tomato item |
| 006 | P2 | resolved | Add deterministic scenario harness prompts | Garden OS prompt pack now includes scenario harness and stronger regression guarantees |
| 007 | P2 | resolved | Unify planner reasoning into one surface | Summary panel now combines score direction, top risk, tradeoff, and next move |
| 008 | P2 | resolved | Harden simulator phase restore and split review semantics | Legacy REVIEW saves now normalize to explicit review phases and UI copy distinguishes harvest review from winter review |
| 009 | P2 | resolved | Surface Accept Loss in simulator beat UI | Unresolved event phases now name Accept Loss directly in the objective strip, status text, and action toolbar |
| 010 | P2 | resolved | Surface planner severity summary and inspect next moves | Planner now shows severity counts above the bed and per cell risk guidance in Inspect |
| 011 | P3 | resolved | Confirm restore success after import and reset | Restore flows now show a success banner after recovery completes |
| 012 | P2 | resolved | Add deterministic scenario pack and regression clauses | Prompt assets now include a fixed scenario pack and stronger regression checks for phase migration and Accept Loss clarity |
| 013 | P2 | resolved | Add phase and reasoning smoke script | Browser smoke script now checks planner reasoning surface and simulator legacy review migration |

## Session Log

[2026-03-18] [GardenOS] [docs] Add AGENTS baseline
[2026-03-18] [GardenOS] [feat] Replace planner confirmations with undo and restore
[2026-03-18] [GardenOS] [refactor] Split home and hub entry roles
[2026-03-18] [GardenOS] [feat] Add simulator objective strip
[2026-03-18] [GardenOS] [feat] Share manage menu pattern with Season Engine
[2026-03-18] [GardenOS] [fix] Open crop palette before tutorial tomato step
[2026-03-18] [GardenOS] [feat] Add deterministic scenario harness prompts
[2026-03-18] [GardenOS] [feat] Unify planner reasoning into one surface
[2026-03-18] [GardenOS] [fix] Normalize legacy simulator review saves
[2026-03-18] [GardenOS] [refactor] Split simulator review copy by phase
[2026-03-18] [GardenOS] [feat] Surface Accept Loss in simulator beat UI
[2026-03-18] [GardenOS] [feat] Add planner severity summary and inspect next moves
[2026-03-18] [GardenOS] [feat] Add deterministic scenario pack and regression clauses
[2026-03-18] [GardenOS] [test] Add phase and reasoning smoke script
[2026-03-18] [GardenOS] [docs] Add planner right sidebar overload ticket
[2026-03-18] [GardenOS] [fix] Reduce planner right sidebar overload

# Garden OS — Project Overview

## What It Is

Garden OS is a local-first garden planning and narrative simulation platform. It combines real horticultural logic with cozy game mechanics, built entirely on the web stack (Three.js, Vite, vanilla JS).

## Layers

| Layer | Description |
|-------|-------------|
| **Garden OS** | Umbrella project / universe / platform |
| **Story Mode** | Existing 12-chapter narrative farming sim (playable) |
| **Let It Grow** | Planned open-world sandbox expansion |

## Core Fantasy

Build, grow, and live inside a persistent garden ecosystem — from a single raised bed to an open neighborhood.

## Platform Targets

- Web (WebGL) — primary
- iOS / Android — future (PWA or native wrapper)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Rendering | Three.js (WebGL) |
| Build | Vite 7.x |
| Testing | Vitest |
| Data | JSON specs loaded at build time (offline-capable) |
| Persistence | localStorage (multi-slot save) |
| Styling | Custom CSS design system (Fraunces + DM Sans + DM Mono) |

## Current State

Story Mode is a **mature, playable prototype** with:
- 12-chapter campaign spanning 3 in-game years
- 32-cell garden grid (8×4 cedar raised bed)
- 6 intervention types
- 50+ narrative cutscenes with 5 animated characters
- Full seasonal system (spring/summer/fall/winter)
- 6-factor scoring algorithm
- Multi-slot save/load
- Procedural scenery, weather FX, character animation
- Mobile-responsive UI

# Prompt: Garden OS Architecture Diagram (SVG)

You are a systems architect and technical diagram designer.

Create a high-level architecture diagram for **Garden OS** as a **single SVG file**.

## Goal
Communicate architecture clarity and engineering maturity for README/docs usage.

## Output constraints
- Pure SVG (no external assets)
- Dark theme
- Readable at 1200px width
- Suitable for GitHub README and docs embedding

## Diagram structure
Use four horizontal layers:

1. User Interface
- Planner
- Inspect Panel
- Scoring Visualizer
- Build Guide
- Ops Guide

2. Core Engine
- Crop Scoring Engine
- Adjacency Analyzer
- Season Evaluator
- Structural Support Model

3. Data Model
- Workspace Model
- Crop Database
- Bed Layout Records
- Cage Configuration
- Site Settings
- JSON Schema

4. Persistence
- localStorage
- `.gos.json` Export/Import

## Connections
- UI components connect down to Core Engine
- Core Engine depends on Data Model
- Data Model persists to localStorage
- Export/Import interacts with Persistence and Data Model

## Visual style
- Layer containers with subtle borders
- Component nodes as rounded rectangles
- Directional connectors with arrowheads
- Clear labels
- Accent color used sparingly for flow emphasis

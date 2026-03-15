# Garden OS Architecture Diagram Specification

## Diagram Purpose
Communicate high-level robustness and data flow for developers and contributors.

## Canvas
- Format: SVG
- Width target: 1200px
- Theme: dark
- Layout: four horizontal layers

## Layers and Components

### 1. User Interface Layer
- Planner
- Inspect Panel
- Scoring Visualizer
- Build Guide
- Ops Guide

### 2. Core Engine Layer
- Crop Scoring Engine
- Adjacency Analyzer
- Season Evaluator
- Structural Support Model

### 3. Data Model Layer
- Workspace Model
- Crop Database
- Bed Layout Records
- Cage Configuration
- Site Settings
- JSON Schema

### 4. Persistence Layer
- localStorage
- .gos.json Export/Import

## Required Connections
- UI -> Core Engine
- Core Engine -> Data Model
- Data Model -> Persistence
- Export/Import path between Data Model and file artifact

## Visual Conventions
- Layer containers with subtle borders
- Rounded rectangle nodes
- Arrowheads for directionality
- Accent color for primary flow
- Secondary color for cross-links

## Labeling
- Keep labels short and human-readable.
- Include title and subtitle with version context.

## Readability Constraints
- Must remain legible when embedded in README at ~1000-1200px.
- No tiny text below 12px equivalent.

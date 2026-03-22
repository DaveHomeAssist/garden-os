# Prompt: Garden OS System Map Page

You are a senior frontend engineer and technical information designer.

Create a professional interactive system map page for **Garden OS**.

## Goal
Explain the architecture and ecosystem to developers, contributors, and technically curious users.

## Output
Return a **single HTML file** with inline CSS/JS. No build tools. No frameworks.

## Visual direction
- Dark mode default
- Technical dashboard aesthetic
- Clean layered layout
- High contrast
- Monospace labels + modern sans body text
- Subtle glow accents

## Required sections
1. Header
- Title: `Garden OS System Map`
- Short tagline
- Links to live demo and GitHub

2. Architecture layers
Show grouped cards for:
- User Interface Layer: Planner, Inspect Panel, Scoring Visualizer, Build Guide, Ops Guide
- Application Logic Layer: Crop Scoring Engine, Adjacency Analyzer, Season Evaluator, Structural Support Model
- Data Model Layer: Workspace Model, Crop Database, Bed Layout Records, Cage Configuration, Site Settings, JSON Schema
- Persistence Layer: localStorage, `.gos.json` export/import

3. Data flow
Include directional flow:
`User interaction -> Planner updates workspace -> Scoring engine evaluates -> Adjacency analysis -> Inspect explanation -> Persist locally -> Optional file export`

4. Key properties panel
Show principles:
- Zero backend
- Offline first
- Deterministic scoring
- Portable workspace files
- Single-file tool architecture

5. Footer
- GitHub link
- License note

## Quality constraints
- Semantic HTML (header/main/section/footer)
- Responsive from mobile to desktop
- Keyboard-visible focus states
- Accessible contrast
- Production-grade polish

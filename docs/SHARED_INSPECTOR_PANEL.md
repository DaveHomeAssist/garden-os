# Shared Component: Inspector Panel

> **Status:** Proposal — not started
> **Updated:** 2026-03-16
> **Applies to:** Trailkeeper + Garden OS
> **Pattern:** Reusable across all DaveHomeAssist local-first apps

---

## Core Idea

When a user clicks anything meaningful — trail, crop cell, gear item, log entry — a slide-out panel appears showing structured details and actions.

Instead of building separate modals, forms, and tooltips across the UI, everything flows through one reusable inspector system.

---

## Why This Matters

Both apps revolve around objects with metadata:

| Trailkeeper | Garden OS |
|-------------|-----------|
| trail | crop cell |
| gear item | plant |
| advisory | scoring factor |
| hike log | harvest log |

They all need the same UI behavior:
- View details
- Edit notes
- Perform actions
- See contextual data

One panel system replaces multiple UI widgets.

---

## Layout

```
┌─────────────────────────────────────────┐
│ MAIN APP                                │
│                                         │
│  [ grid / trails / planner view ]       │
│                                         │
│                    ┌────────────────────┐│
│                    │ INSPECTOR PANEL    ││
│                    │────────────────────││
│                    │ Title              ││
│                    │ Metadata rows      ││
│                    │ Context indicators ││
│                    │ Actions            ││
│                    │ Notes / logs       ││
│                    └────────────────────┘│
└─────────────────────────────────────────┘
```

Slides from the right. Keyboard shortcut friendly. Dismissible with Escape.

---

## Example: Trailkeeper

Click a trail item. Inspector shows:

```
Trail: Wissahickon Loop
───────────────────────

Distance      5.4 km
Elevation     620 m
Surface       dirt
Difficulty    moderate

Weather Fit   Good
Advisories    Mud risk

Actions
  [Open Map]  [Mark Completed]  [Log Hike]

History
  Last hiked: Oct 2025
  Rating: ★★★★☆

Notes
  "Muddy in shaded areas"
```

---

## Example: Garden OS

Click grid cell B3. Inspector shows:

```
Cell B3 — Tomato
───────────────────────

Score         8.5

Breakdown
  Adjacency (basil)    +2.0
  Sunlight (south)     +1.5
  Drainage             +0.5
  Shade (north edge)   -0.5
  Base (tomato)         5.0

Actions
  [Change Crop]  [Log Harvest]

History
  Last harvest: Aug 12
  Yield: 3.2 lb

Notes
  "Best plant this year"
```

---

## Data Contract

Each entity type provides an adapter that returns a standard shape:

```js
{
  title: "Wissahickon Loop",
  subtitle: "5.4 km · moderate",
  fields: [
    { label: "Distance", value: "5.4 km" },
    { label: "Elevation", value: "620 m" },
    { label: "Surface", value: "dirt" }
  ],
  indicators: [
    { label: "Weather Fit", value: "Good", type: "success" },
    { label: "Advisories", value: "Mud risk", type: "warning" }
  ],
  actions: [
    { label: "Open Map", handler: openMap },
    { label: "Mark Completed", handler: markComplete },
    { label: "Log Hike", handler: openLog }
  ],
  notes: {
    value: "Muddy in shaded areas",
    editable: true,
    onSave: saveNote
  }
}
```

---

## Entity Adapters

```
inspectors/
  trailInspector.js       → trail details + enrichment + advisories
  gearInspector.js        → gear item details
  cellInspector.js        → crop cell + score breakdown
  harvestInspector.js     → harvest log entry
  companionInspector.js   → companion planting pair details
```

Each adapter is a pure function:

```js
function trailInspector(trail, index) {
  return {
    title: trail.name,
    fields: [ ... ],
    actions: [ ... ],
    notes: { ... }
  };
}
```

Renderer stays generic. Adapters are app-specific.

---

## CSS Architecture

One shared stylesheet, themed via CSS variables:

```css
.inspector                    /* slide-out panel container */
.inspector-header             /* title + subtitle */
.inspector-fields             /* metadata list */
.inspector-field              /* label + value row */
.inspector-indicators         /* status badges */
.inspector-indicator          /* single badge */
.inspector-indicator.success  /* green state */
.inspector-indicator.warning  /* amber state */
.inspector-indicator.danger   /* red state */
.inspector-actions            /* button row */
.inspector-action             /* single action button */
.inspector-notes              /* editable notes area */
.inspector-history            /* log entries */
```

Theming handled by each app's existing CSS variables:
- Trailkeeper: `--ink`, `--fern`, `--stone`, `--mist`
- Garden OS: `--soil`, `--leaf`, `--sun`, `--text-muted`

---

## Keyboard Flow

```
Arrow keys     → move selection in list/grid
Enter          → open inspector for selected item
Escape         → close inspector
Tab            → cycle through inspector actions
```

This makes both apps feel fast and intentional for power users.

---

## Interaction Rules

- Only one inspector open at a time
- Clicking a different entity swaps content, panel stays open
- Clicking outside or pressing Escape closes the panel
- Notes auto-save on blur
- Actions execute immediately (no confirmation for non-destructive actions)
- Panel width: 320px desktop, full-width on mobile

---

## What This Replaces

Without inspector, each app builds:

- Trail detail modal
- Enrichment popup
- Score breakdown tooltip
- Harvest log form
- Gear editor modal
- Notes editor

With inspector, all entities render through one component.

---

## Implementation Notes

### Phase 1: Core Panel

- Build generic `Inspector` renderer
- CSS for slide-out, fields, actions
- Keyboard navigation
- One adapter (trail or cell) as proof of concept

### Phase 2: Adapters

- Add remaining entity adapters per app
- Wire into existing click handlers
- Replace any existing modals/popups

### Phase 3: Cross-App Extraction

- Extract into `shared/inspector.js` + `shared/inspector.css`
- Both apps load from shared path or copy into their own `js/`
- Theming via CSS variables means zero app-specific style code

---

## Long-Term Value

This component unlocks every future detail view for free:

| Future Feature | Inspector Adapter |
|----------------|-------------------|
| Hike history viewer | `hikeLogInspector.js` |
| Trail condition breakdown | `conditionInspector.js` |
| Seasonal yield chart | `seasonInspector.js` |
| Soil notes per cell | `soilInspector.js` |

New entity types drop in without new UI architecture.

---

## Relationship to Existing UI

The inspector does **not** replace:
- The main list/grid view (that's the primary navigation)
- Toast notifications (those are transient feedback)
- The enrichment row (that's inline summary data)

The inspector **adds** a drill-down layer that currently doesn't exist in either app.

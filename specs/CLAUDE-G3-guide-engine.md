# CLAUDE-G3 — Garden OS: Guide Engine Spec (Codex Handoff — Phase 4)

**Status:** Codex handoff ready
**Date:** 2026-03-14
**Blocks:** CODEX-4
**Depends on:** CLAUDE-G1 (workspace.guideProgress schema)

---

## 1. Guide Definition Schema

```json
{
  "guideId": "cage-build-v1",
  "title": "Mom's Sanctuary — Cage Build Guide",
  "version": 1,
  "steps": [
    {
      "id": "step-layout",
      "title": "Layout & Posts",
      "description": "Establish the footprint and set corner posts.",
      "checklistItems": [
        { "id": "chk-measure-bed", "label": "Measure bed dimensions and confirm 8×4 ft", "required": true },
        { "id": "chk-mark-corners", "label": "Mark corner post positions on bed frame", "required": true },
        { "id": "chk-pilot-holes", "label": "Drill pilot holes for corner brackets", "required": false }
      ],
      "requiredInputs": [
        { "id": "inp-bed-length", "label": "Bed length", "type": "number", "unit": "inches", "required": true },
        { "id": "inp-bed-width", "label": "Bed width", "type": "number", "unit": "inches", "required": true }
      ],
      "prerequisites": [],
      "estimatedMinutes": 30
    }
  ]
}
```

**Rules:**
- `guideId` is a stable string ID, not a generated nanoid — guides are app-defined, not user-created
- `prerequisites` contains step IDs from the same guide — the step is locked until all prerequisites are complete
- `requiredInputs` with `required: true` block step completion
- `type` enum: `"number"` | `"text"`
- `unit` is display-only (shown as suffix in input field)

---

## 2. Guide Progress Schema (Persisted in Workspace)

```json
{
  "guideId": "cage-build-v1",
  "bedId": "bed_abc123",
  "startedAt": "ISO-8601",
  "completedAt": null,
  "currentStepId": "step-layout",
  "steps": [
    {
      "stepId": "step-layout",
      "completedAt": "ISO-8601",
      "checkedItems": ["chk-measure-bed", "chk-mark-corners"],
      "inputValues": {
        "inp-bed-length": 96,
        "inp-bed-width": 48
      }
    }
  ]
}
```

**Storage location:** `workspace.guideProgress[]` — array of progress records, keyed by `guideId + bedId`

**Rules:**
- `bedId` is optional — some guides are workspace-level, not bed-specific
- `completedAt` is set when ALL steps are complete; null otherwise
- `checkedItems` only contains IDs of items the user has checked — unchecked items are absent
- `inputValues` stores the raw user input keyed by input ID

---

## 3. Guide Engine Rules

### Step gating
- A step is **unlocked** only when ALL step IDs in its `prerequisites` array have a `completedAt` timestamp in the progress record
- Steps with empty `prerequisites` are always unlocked

### Required input blocking
- A step **cannot be marked complete** if any `requiredInput` with `required: true` has no value in `inputValues`
- When the user tries to complete a blocked step, show plain-language message: *"Complete all required measurements before moving to the next step."*
- Do NOT silently disable the button — always explain why

### Completion
- A step is **complete** when:
  1. All `required: true` checklist items are in `checkedItems`
  2. All `required: true` inputs have values in `inputValues`
  3. The user clicks "Mark complete"
- A guide is **complete** when all steps have `completedAt` set

### Persistence
- Progress saves to workspace on every checklist toggle and input change (debounced 500ms)
- Uses the same `saveWorkspace()` function from G1

### Multi-guide support
- The engine renders any guide definition conforming to the schema above
- No guide-specific UI code — the shell is generic
- Guide types planned: cage build, seasonal prep, maintenance, planting

---

## 4. Function Boundary Definitions

```
loadGuide(guideId: string) → GuideDefinition
  Returns the guide definition object
  v1: hardcoded guide definitions in app source
  Future: could load from JSON files

getGuideProgress(guideId: string, bedId?: string) → GuideProgress | null
  Reads from workspace.guideProgress[]
  Matches on guideId + bedId (bedId null matches entries with no bedId)
  Returns null if no progress record exists

saveGuideProgress(progress: GuideProgress) → void
  Upserts into workspace.guideProgress[] (match on guideId + bedId)
  Calls saveWorkspace()

isStepUnlocked(step: StepDefinition, progress: GuideProgress) → boolean
  Returns true if all prerequisite step IDs have completedAt in progress
  Returns true if prerequisites is empty

isStepComplete(step: StepDefinition, progress: GuideProgress) → boolean
  Returns true if step has completedAt in progress record

markStepComplete(guideId: string, stepId: string, bedId?: string) → GuideProgress
  Validates all required inputs and checklist items are fulfilled
  Sets completedAt on the step
  If all steps complete, sets guide completedAt
  Returns updated progress

resetGuideProgress(guideId: string, bedId?: string) → void
  Removes the matching progress record from workspace.guideProgress[]
  Calls saveWorkspace()

generateProgressSummary(guideId: string, bedId?: string) → {
  completedSteps: number,
  totalSteps: number,
  percentComplete: number,
  requiredInputValues: Record<string, any>,
  isComplete: boolean
}
```

---

## 5. UI Component Requirements

### Guided mode toggle
- Button in toolbar: "Build Guide" / "Exit Guide"
- Entering guide mode shows the step-by-step panel; exiting returns to normal planner view
- Guide state persists regardless of mode — re-entering shows current progress

### Per-step checklist
- Real `<input type="checkbox">` elements — not clickable divs
- Each item shows label text; required items marked with `*`
- Checked state saves immediately (debounced)

### Required input fields
- `<input type="number">` or `<input type="text">` per schema
- Unit suffix shown as inline label (e.g., "inches")
- Empty required fields highlighted with border color change (not red — use amber)

### Progress tracker
- "Step X of N" text + visual progress bar (CSS width percentage)
- Current step highlighted in step list
- Locked steps show lock icon and are non-interactive

### Step filter
- Toggle: All / Incomplete / Complete
- Default: All

### Printable execution summary
- Generates a print-friendly view: completed steps, confirmed measurements, checklist state
- Uses same `print-mode` pattern from G2

---

## 6. Mom's Sanctuary Cage Build — Guide Instance

The first guide definition uses the existing content from `garden-cage-build-guide.html` (not the `-fixed` variant — that file does not exist).

**Steps map to existing sections:**

| Step ID | Title | Prerequisites | Est. Minutes |
|---------|-------|--------------|-------------|
| step-specs | Specs & Dimensions | — | 15 |
| step-materials | Materials & Cut List | step-specs | 20 |
| step-layout | Layout & Posts | step-specs | 30 |
| step-frame | Lower Frame & Mesh | step-layout | 45 |
| step-trellis | Rear Trellis Wall | step-layout | 30 |
| step-doors | Front Access & Doors | step-frame | 30 |
| step-finish | Finish & Plant | step-frame, step-trellis, step-doors | 15 |
| step-qc | QC Checklist | step-finish | 20 |

---

## 7. Output Contract

**Changed files:** `garden-planner-v4.html` (single file)

**Hard constraint:** No framework or build-tool migration. Remain single-file Vanilla JS/HTML/CSS.

**Verification steps:**
1. Open guide mode — step list renders, first step unlocked
2. Check required checklist items — checkbox state persists on reload
3. Enter required measurements — values persist on reload
4. Try to complete step with missing required input — plain-language explanation shown
5. Complete all prerequisites — next step unlocks
6. Complete all steps — guide shows "Complete" state
7. Reset guide — all progress cleared, first step re-locks appropriately
8. Switch beds — guide progress is bed-specific (if bedId set)
9. Print summary — shows completed steps and measurements
10. No regressions: undo/redo, inspect panel, score updates, bed switching all still work

**Known risks:**
- Guide definitions are hardcoded in v1 — adding new guides requires code changes
- Step prerequisite cycles would deadlock the UI — validate at definition time (no circular deps)
- Large guides (20+ steps) may need virtual scrolling in the step list

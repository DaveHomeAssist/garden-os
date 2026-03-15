# CLAUDE-G4 — Garden OS: Seasonal Task Engine Spec (Codex Handoff — Phase 5)

**Status:** Codex handoff ready
**Date:** 2026-03-14
**Blocks:** CODEX-5
**Depends on:** CLAUDE-G1 (workspace + crop definitions)

---

## 1. Crop Lifecycle Metadata (Additions to Existing Crop Definitions)

New fields added to each crop definition object:

```json
{
  "id": "tomato",
  "name": "Tomato",
  "sowWindowWeeks": { "start": 2, "end": 6 },
  "daysToMaturity": 75,
  "successionIntervalDays": 0,
  "requiresSupport": true,
  "prefersProtection": false,
  "coolSeasonOnly": false,
  "supportReminderDays": 21,
  "harvestWindowDays": 45
}
```

**Field definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `sowWindowWeeks` | `{ start, end }` | Weeks relative to season start (week 1) when sowing is appropriate |
| `daysToMaturity` | integer | Days from sowing/transplant to first harvest |
| `successionIntervalDays` | integer | Days between succession plantings; 0 = no succession |
| `requiresSupport` | boolean | Needs trellis, cage, or stakes |
| `prefersProtection` | boolean | Benefits from critter protection (cage/mesh) |
| `coolSeasonOnly` | boolean | Only viable in spring/fall cool seasons |
| `supportReminderDays` | integer | Days after planting to generate a tie/prune reminder; 0 = no reminder |
| `harvestWindowDays` | integer | Duration of harvest period after maturity |

**Rules:**
- All week references are relative to season start week 1 (not calendar weeks)
- `successionIntervalDays: 0` means "plant once, no succession"
- Crops with `coolSeasonOnly: true` generate no tasks in summer/winter seasons

---

## 2. Task Schema

```json
{
  "id": "task_<nanoid>",
  "cropId": "tomato",
  "bedId": "bed_abc123",
  "taskType": "sow",
  "dueDate": "2026-04-15",
  "estimatedWeek": null,
  "label": "Sow tomato seeds indoors",
  "status": "upcoming",
  "isEstimated": false
}
```

**Enums:**
- `taskType`: `"sow"` | `"transplant"` | `"succession"` | `"tie"` | `"prune"` | `"harvest"`
- `status`: `"upcoming"` | `"overdue"` | `"done"`

**Rules:**
- If `dueDate` is set, `isEstimated` must be `false` and `estimatedWeek` is `null`
- If `dueDate` is `null`, `isEstimated` must be `true` and `estimatedWeek` is set
- `label` is plain English, user-friendly (e.g., "Sow tomato seeds indoors", not "SOW_INDOOR_TOMATO")

---

## 3. Task Generation Rules

### Input
- `workspace` — beds with crop plans (cells array)
- `season` — `"spring"` | `"summer"` | `"fall"` | `"winter"`
- `plantingDate` — ISO date string or `null`

### Generation logic

**For each bed, for each planted crop:**

1. **Sow task** — due at `plantingDate + sowWindowWeeks.start * 7` days (or `estimatedWeek: sowWindowWeeks.start`)
2. **Transplant task** — due 14 days after sow (if crop is typically started indoors: tomato, pepper, eggplant)
3. **Support reminder** — if `requiresSupport && supportReminderDays > 0`: due at `plantingDate + supportReminderDays` days
4. **Succession tasks** — if `successionIntervalDays > 0`: generate additional sow tasks at intervals until `sowWindowWeeks.end`
5. **Harvest task** — due at `plantingDate + daysToMaturity` days
6. **Prune task** — for crops that need it (tomato, cucumber): due at `supportReminderDays + 14` days

**Date mode vs estimated mode:**
- If `plantingDate` exists: compute exact `dueDate` for all tasks, set `isEstimated: false`
- If `plantingDate` is `null`: compute `estimatedWeek` relative to season week 1, set `isEstimated: true`, `dueDate: null`

**Cool season filter:**
- If crop has `coolSeasonOnly: true` and season is `"summer"` or `"winter"`: skip all task generation for that crop

### Performance
- Generate tasks lazily: active bed on load, other beds on demand
- Memoize: cache task arrays per `bedId + season + plantingDate` combo
- Invalidate cache when `plannerState.cells` changes for a bed (crop added/removed)

---

## 4. Timeline v1 Deliverables

### Upcoming tasks panel
- Shows tasks due in the next 14 days (date mode) or next 14 estimated weeks (estimated mode)
- Max 10 visible items; "Show more" button reveals remainder
- Sorted by: dueDate ascending (date mode) or estimatedWeek ascending (estimated mode)
- Each task shows: crop icon/color dot, label, due date or "~Week N", bed name

### Overdue tasks panel
- Shows tasks past their due date (date mode) or past their estimated week (estimated mode)
- Same display format as upcoming
- Highlighted with amber background (not red — overdue is informational, not alarming)

### Per-crop schedule badges
- On planner grid cells: small badge showing task count for that cell's crop
- Only rendered when task count > 0
- Click badge → scrolls to that crop's tasks in the timeline panel
- Badge is a small circle with number, positioned at top-right of cell

### Estimated indicator
- All estimated tasks display a `~` prefix on the week number: "~Week 3"
- Muted text color (not warning color)
- Tooltip: "This date is estimated. Set a planting date for exact scheduling."

---

## 5. Function Boundary Definitions

```
generateTasks(workspace: Workspace, season: string, plantingDate?: string) → Task[]
  Generates tasks for ALL beds in workspace
  Returns flat array of all tasks
  Does not persist — caller decides what to do with result

getUpcomingTasks(tasks: Task[], windowDays: number) → Task[]
  Filters to tasks with status "upcoming" within windowDays of today (or windowWeeks if estimated)
  Sorted by dueDate/estimatedWeek ascending

getOverdueTasks(tasks: Task[]) → Task[]
  Filters to tasks with status "upcoming" but past their dueDate/estimatedWeek
  Does NOT include tasks with status "done"

markTaskDone(taskId: string) → void
  Sets task status to "done"
  Task completion is session-only in v1 (not persisted to workspace)
  Future: persist task completion state

invalidateTaskCache(bedId: string) → void
  Clears memoized task array for the given bed
  Next call to generateTasks will recompute

memoizeTasksForBed(bedId: string, season: string, plantingDate?: string) → Task[]
  Returns cached tasks if cache hit
  Generates and caches if cache miss
  Cache key: bedId + season + plantingDate
```

---

## 6. UX Constraints

| Constraint | Rationale |
|-----------|-----------|
| Plain language task labels | First-time gardeners must understand without jargon |
| "Estimated" label is muted, not alarming | Estimated dates are helpful guidance, not deadlines |
| Max 10 visible upcoming tasks | Prevent overwhelm; "show more" for power users |
| No ICS export in v1 | Scope control — calendar integration deferred |
| Lazy generation (active bed only) | Performance — 8 beds × 80 cells × 6 task types = potential 3840 tasks |
| Amber for overdue (not red) | Overdue garden tasks are recoverable, not emergencies |

---

## 7. Crop Lifecycle Values (Initial Set)

Values for all crops currently in Garden OS:

| Crop | sowWindowWeeks | daysToMaturity | successionDays | requiresSupport | coolSeasonOnly | supportReminderDays | harvestWindowDays |
|------|---------------|----------------|----------------|----------------|----------------|--------------------|--------------------|
| Tomato | 2–6 | 75 | 0 | true | false | 21 | 45 |
| Pepper | 2–6 | 70 | 0 | false | false | 0 | 40 |
| Basil | 4–8 | 60 | 14 | false | false | 0 | 30 |
| Lettuce | 1–4 | 45 | 10 | false | true | 0 | 21 |
| Spinach | 1–3 | 40 | 10 | false | true | 0 | 14 |
| Cucumber | 4–8 | 60 | 0 | true | false | 14 | 30 |
| Zucchini | 4–8 | 55 | 0 | false | false | 0 | 35 |
| Bean | 4–10 | 55 | 14 | true | false | 14 | 21 |
| Pea | 1–4 | 60 | 10 | true | true | 14 | 14 |
| Carrot | 2–6 | 70 | 14 | false | false | 0 | 21 |
| Radish | 1–4 | 28 | 7 | false | true | 0 | 7 |
| Kale | 1–6 | 55 | 0 | false | true | 0 | 60 |
| Marigold | 4–8 | 50 | 0 | false | false | 0 | 45 |
| Nasturtium | 4–8 | 55 | 0 | false | false | 0 | 40 |

**Note:** These values are reasonable defaults. Users cannot edit lifecycle metadata in v1. Per-crop overrides deferred to v2 alongside the custom crop feature.

---

## 8. Output Contract

**Changed files:** `garden-planner-v4.html` (single file)

**Hard constraint:** No framework or build-tool migration. Remain single-file Vanilla JS/HTML/CSS.

**Verification steps:**
1. Set planting date → tasks generate with exact dates, `isEstimated: false`
2. Clear planting date → tasks regenerate with estimated weeks, `isEstimated: true`
3. Add crop to bed → task cache invalidates, new tasks appear
4. Remove crop from bed → tasks for that crop disappear
5. Switch season → tasks regenerate; cool-season crops excluded from summer
6. Mark task done → task moves to "done" state, disappears from upcoming
7. 10+ upcoming tasks → "Show more" button appears
8. Overdue tasks → shown with amber highlight, correct count
9. Grid badges → show task count, click scrolls to timeline
10. No regressions: undo/redo, inspect panel, score updates, bed switching, guide mode all still work

**Known risks:**
- Task count explosion: 8 beds × 80 cells × 6 task types with succession = potentially thousands of tasks; memoization is critical
- Succession logic for crops with short intervals (radish: 7 days) could generate many tasks — cap at season end
- `markTaskDone` is session-only in v1 — user loses completion state on reload; flag this in UI

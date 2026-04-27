# Codex spec: Mom-first real crop data in Garden OS v5

**Status:** Ready for Codex execution
**Author:** Claude (orchestrator handoff)
**Date authored:** 2026-04-27
**Source conversation:** see Davai working/current-context.md and the prior research doc this session
**Repo path on Mac:** `/Users/daverobertson/Desktop/Code/10-projects/active/garden-os-fresh`
**Repo path on Windows (Duncan):** `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os\`

---

## Goal

Make Garden OS v5 immediately useful for Mom by loading her actual planted crops, varieties, beds, grow bags, statuses, and notes into the app. Mom is the primary user. Her Notion tracker is the working garden truth. Higher priority than keeping the app generic.

**Hard rule:** Species/crop ID drives scoring. Variety drives display, history, Journal context, and user trust. Do NOT collapse Mom's variety metadata into anonymous generic crops.

---

## Scope

### Files to touch

| File | Action | Why |
|---|---|---|
| `data/mom-garden-data.json` | CREATE | Canonical Mom dataset |
| `garden-planner-v5.html` | MODIFY | Load Mom data, add `peas`/`scallion`/`garlic` to fallback CROPS catalog, render variety chips, multi-bed read |
| `garden-painting.html` | MODIFY | Multi-bed picker (3 beds), variety field on plantings, "Load Mom Garden" / "Reset to Mom Garden" actions |
| `how-it-thinks-v5.html` | MODIFY (or rename to `journal.html`) | Add Mom Garden load entry + per-planting events. The TabBar currently labels this "Journal" but routes to `how-it-thinks-v5.html` (see prior audit). Reconcile: either rename file to `journal.html` and update `garden-planner-v5.html:495` href, OR keep file and update only the load-event content. Recommend keeping the existing file and adding Mom-load entries; rename is a separate cleanup. |
| `garden-doctor-v5.html` | MODIFY | Show crop+variety+bed context in the Doctor selector when triaging |
| `gos-bed.js` | MODIFY | Bed schema must support `dimensions: {rows, cols}` and `varietyName` per painted cell. Add bed-collection helpers if not present (multi-bed read/write). Add new event type `plant` (Notion log import) without breaking existing `mark_done`/`harvest` types. |
| `index-v5.html` (the Hub) | MODIFY | Add a Mom Garden tile/badge: "Mom's Garden — Real active beds". Click loads data if not present, otherwise opens Beds page. |
| `sw.js` | MODIFY (create if absent) | Add `data/mom-garden-data.json` to the cached asset list. If sw.js does not exist, create a minimal one cacheing the v5 page set (do not introduce a new offline strategy beyond append-cache). |

### Files to NOT touch

- `specs/CROP_SCORING_DATA.json` — canonical scoring spec. Per CLAUDE.md "specs override code." This task does NOT extend the spec schema. Mom's variety dimension lives in `data/mom-garden-data.json` only.
- `specs/SCORING_RULES.md` — scoring is sacred per CLAUDE.md; do not touch.
- `gos-schema.json` — schema bump is a separate task; this work goes around it via `data/mom-garden-data.json` as a sibling layer.
- `garden-planner-v4.html` — the v4 planner is the production surface per IMPLEMENTATION_PLAN. Do not modify.
- Anything in `story-mode/` — out of scope.

---

## Data to embed verbatim in `data/mom-garden-data.json`

```json
{
  "version": 1,
  "source": "Mom Outdoor Plant Beds Tracker (Notion)",
  "comment": "Mom-first demo data. Do not treat as generic crop catalog. Imported 2026-04-27 from Notion DB c0c707d0f4f54b2aae07bbff1721219a.",
  "loadedAt": null,
  "beds": [
    {
      "id": "raised_bed_left",
      "name": "Raised Bed Left",
      "type": "raised_bed",
      "dimensions": { "rows": 4, "cols": 4 },
      "wallSide": "back",
      "plantings": [
        {
          "id": "mom_pea_shelling_wando_left",
          "cropId": "peas",
          "displayName": "Pea, Shelling",
          "varietyName": "Wando",
          "status": "Sprouted",
          "bedLocation": "Row 4 (trellis)",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Pisum sativum, 68 days, frost-tolerant, $2.99/25g (Botanical Interests)"
        },
        {
          "id": "mom_lettuce_romaine_parris_island_left",
          "cropId": "head_lettuce",
          "displayName": "Lettuce, Romaine",
          "varietyName": "Parris Island Cos",
          "status": "Planted",
          "bedLocation": "Row 3",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Lactuca sativa, 21-68 days, USDA Organic, $3.49/750mg (Botanical Interests)"
        },
        {
          "id": "mom_lettuce_butterhead_red_marvel_left",
          "cropId": "head_lettuce",
          "displayName": "Lettuce, Butterhead Red",
          "varietyName": "Marvel of Four Seasons",
          "status": "Planted",
          "bedLocation": "Row 2",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Lactuca sativa, 21-55 days, USDA Organic, heat and cold tolerant"
        },
        {
          "id": "mom_carrot_left",
          "cropId": "carrot",
          "displayName": "Carrot",
          "varietyName": null,
          "status": "Sprouted",
          "bedLocation": "Row 1",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": null
        }
      ]
    },
    {
      "id": "raised_bed_right",
      "name": "Raised Bed Right",
      "type": "raised_bed",
      "dimensions": { "rows": 4, "cols": 4 },
      "wallSide": "back",
      "plantings": [
        {
          "id": "mom_pea_snap_cascadia_right",
          "cropId": "peas",
          "displayName": "Pea, Snap",
          "varietyName": "Cascadia",
          "status": "Sprouted",
          "bedLocation": "Row 4 against trellis",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Pisum sativum, 60 days, USDA Organic, $3.49/15g (Botanical Interests)"
        },
        {
          "id": "mom_kale_dwarf_blue_curled_right",
          "cropId": "kale",
          "displayName": "Kale",
          "varietyName": "Dwarf Blue Curled",
          "status": "Planted",
          "bedLocation": "Row 3",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Brassica oleracea, 21-55 days, USDA Organic"
        },
        {
          "id": "mom_scallion_right",
          "cropId": "scallion",
          "displayName": "Scallions",
          "varietyName": null,
          "status": "Producing",
          "bedLocation": "Row 1, far right",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": null
        }
      ]
    },
    {
      "id": "grow_bags",
      "name": "Grow Bags",
      "type": "grow_bags",
      "dimensions": { "rows": 1, "cols": 6 },
      "wallSide": "none",
      "comment": "Six grow bags modeled as one virtual 1x6 bed. Cells labeled Bag 1 through Bag 6. Sun gradient does not apply.",
      "plantings": [
        {
          "id": "mom_garlic_bag1",
          "cropId": "garlic",
          "displayName": "Garlic",
          "varietyName": null,
          "status": "Growing",
          "bedLocation": "Bag 1",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Fall 2025",
          "notes": "Fall 2025 planting, overwintered"
        },
        {
          "id": "mom_garlic_bag2",
          "cropId": "garlic",
          "displayName": "Garlic",
          "varietyName": null,
          "status": "Growing",
          "bedLocation": "Bag 2",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Fall 2025",
          "notes": "Fall 2025 planting, overwintered"
        },
        {
          "id": "mom_kale_dwarf_blue_curled_bag3",
          "cropId": "kale",
          "displayName": "Kale",
          "varietyName": "Dwarf Blue Curled",
          "status": "Planted",
          "bedLocation": "Bag 3",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Brassica oleracea, 21-55 days, USDA Organic"
        },
        {
          "id": "mom_kale_dwarf_blue_curled_bag4",
          "cropId": "kale",
          "displayName": "Kale",
          "varietyName": "Dwarf Blue Curled",
          "status": "Planted",
          "bedLocation": "Bag 4",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Brassica oleracea, 21-55 days, USDA Organic"
        },
        {
          "id": "mom_lettuce_butterhead_red_marvel_bag5",
          "cropId": "head_lettuce",
          "displayName": "Lettuce, Butterhead Red",
          "varietyName": "Marvel of Four Seasons",
          "status": "Planted",
          "bedLocation": "Bag 5",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": "Lactuca sativa, 21-55 days, USDA Organic"
        },
        {
          "id": "mom_carrot_bag6",
          "cropId": "carrot",
          "displayName": "Carrot",
          "varietyName": null,
          "status": "Planted",
          "bedLocation": "Bag 6",
          "plantedOnStart": "2026-04-11",
          "plantedOnEnd": "2026-04-19",
          "season": "Spring 2026",
          "notes": null
        }
      ]
    }
  ]
}
```

**Total: 13 planting groups across 3 beds, 44 planted cells, 8 distinct vegetables.**

Cell placement notes:
- Where `bedLocation` includes "Row N", map to row N-1 of the bed.
- Where `bedLocation` includes "Bag N", map to col N-1 of the grow_bags bed.
- Where placement is ambiguous (e.g., Row 4 trellis with no column), do best-effort auto-layout left-to-right and tag the rendered cell with a "Garden OS placed" caption visible on hover/tap. Do NOT fabricate exact column positions silently.
- Where placement is fully unknown, render in an "Unplaced" tray under the bed, not in the grid.

---

## Required behavior

### 1. Mom data load path

- App reads `data/mom-garden-data.json` on first run.
- If GosBed has no existing beds AND no localStorage user data, auto-load Mom data and write three GosBed bed records.
- If user data exists, do NOT auto-load. Show the action explicitly.
- Three actions surfaced in the UI:
  - **"Load Mom Garden"** (Hub tile, when no Mom data is present)
  - **"Reset to Mom Garden"** (Painting screen Tweaks/menu, dangerous — confirm before overwriting user beds)
  - **"Import Mom Garden Data"** (sub-action of Reset, alternative wording)
- Loaded Mom beds get `loadedAt: <ISO timestamp>` and `source: "mom-garden-data.json v1"` written into each bed's metadata so the system can detect Mom-loaded beds vs user-created beds.

### 2. Beds page (Painting)

- Multi-bed picker chip in the header. Three beds visible: Raised Bed Left, Raised Bed Right, Grow Bags.
- Bed dimensions read from each bed's `dimensions` field (NOT hardcoded 4x8 — see prior audit item #8).
- Grow Bags bed renders as 1x6 with cells labeled "Bag 1" through "Bag 6" instead of "r0c0" coords.
- When a planting has a `varietyName`, show the variety as a small chip below the species name. Format: `Peas · Wando` or `Lettuce · Marvel of Four Seasons`.
- Status badge per cell using Mom's status taxonomy. Map to a color:
  - Planned → gray
  - Planted → blue
  - Sprouted → yellow
  - Growing → green
  - Producing → purple
  - Harvesting → orange
  - Done → green
  - Failed → red
- Painting writes go through GosBed; new plantings have null variety unless user types one.

### 3. Planner page (`garden-planner-v5.html`)

- Read all beds from GosBed, not just one. Bed picker in the header (matches Painting).
- Scoring uses `cropId`. Display uses `varietyName` where present.
- CropSheet header shows: "Pea, Snap" (displayName), "Cascadia" (varietyName subtitle), then family/days metadata.
- CropChip renders the species `mono`/`color` from `CROPS[cropId]`. Variety appears as a separate chip below.
- Status badge per planting uses Mom's 8 statuses (not the 5 derived stages).
- The hardcoded CROPS catalog at lines 101-114 must include `peas`, `scallion`, `garlic` (currently missing). If a future fetch from `specs/CROP_SCORING_DATA.json` lands, prefer spec; the in-file fallback must still cover Mom's 6 species at minimum: peas, head_lettuce, kale, carrot, scallion, garlic. (Plus the existing 12 to not regress fixture mode.)
- Unknown crop IDs: render an "Unknown crop ({id})" placeholder cell with a "Refresh catalog" action. Never silently disappear.

### 4. Journal page

- On Mom data load, append two kinds of entries:
  - 1 system entry: "Loaded Mom Garden data (44 planted cells, 3 beds)" with timestamp.
  - 1 entry per planting: "{displayName} {varietyName} {status.toLowerCase()} in {bedName}." Examples:
    - "Pea, Snap Cascadia sprouted in Raised Bed Right."
    - "Garlic growing in Grow Bags (Bag 1)."
    - "Carrot sprouted in Raised Bed Left (Row 1)."
- Journal entries should include variety, bed name, and bedLocation when present.
- Entries are written into the journal page's existing data store (or `gosBed.events[]` with a new `type: 'journal'` event). Timestamp uses the load time, not Mom's `plantedOnStart` (the load is what happened today; the planting dates go in the event payload).

### 5. Garden Doctor

- Doctor selector accepts `bedId + cellStr + cropId + varietyName` from the Planner's CropSheet. New URL param: `?bed={bedId}&cell={cellStr}&crop={cropId}&variety={varietyName}`.
- When opened with these params, Doctor pre-fills the crop selection and shows a context bar: "Triaging Pea, Snap (Cascadia) in Raised Bed Right, Row 4."
- If the planting has a Notion-derived `Issue` field (currently none in Mom's data; future-proof), pre-select that symptom.

### 6. Crop catalog completeness

- Verify `specs/CROP_SCORING_DATA.json` already contains: `peas` (line 335), `scallion` (line 398), `garlic` (line 482). It does. No change to spec.
- Add to `garden-planner-v5.html` hardcoded fallback CROPS:
  - `peas`: { name:'Peas', mono:'Pe', color:'#5aab6b', family:'Legume', sowWeek:8, transplantWeek:null, harvestStart:18, harvestEnd:24, daysToMaturity:65, sun:'full' }
  - `scallion`: { name:'Scallion', mono:'Sc', color:'#7da838', family:'Allium', sowWeek:10, transplantWeek:null, harvestStart:18, harvestEnd:32, daysToMaturity:60, sun:'full' }
  - `garlic`: { name:'Garlic', mono:'Ga', color:'#b07d55', family:'Allium', sowWeek:42, transplantWeek:null, harvestStart:24, harvestEnd:30, daysToMaturity:240, sun:'full' }
  - **Note:** garlic's 240-day cycle (fall plant → summer harvest) crosses the year. The current planner timeline assumes single-season W8-W44. Render garlic with a "fall planting → summer harvest" caption rather than a single-band lane until multi-season timeline is implemented. Do not fabricate a fake same-season window.
  - Conflict: `pep` already uses mono `Pe`. Use `Ps` for peas instead. Verify no other 2-letter collisions in the existing 12 crops + these 3.

### 7. Hub

- Add a Mom Garden tile near the top: green badge, label "Mom's Garden", subtitle "44 planted cells · 3 beds · Real active garden".
- Tap → if Mom data not loaded, prompt "Load Mom Garden? This adds 3 beds and 44 planted cells." → Load → navigate to Painting.
- Tap when already loaded → navigate to Painting with the first Mom bed selected.

### 8. Service worker

- If `sw.js` exists, append `data/mom-garden-data.json` to the precache list and bump cache version key (e.g., `gos-cache-v5.1` → `gos-cache-v5.2`).
- If `sw.js` does not exist, create a minimal one with: install handler precaches v5 pages + spec + Mom data; fetch handler is cache-first with network fallback. Do NOT register the SW from `garden-planner-v5.html` in this pass — leave registration as a follow-up to avoid surprising offline behavior changes mid-implementation.

---

## Acceptance criteria

A run is successful when ALL of these hold in a fresh browser session (incognito or cleared localStorage):

1. Hub shows the "Mom's Garden" tile.
2. Tapping "Load Mom Garden" creates 3 beds in GosBed and navigates to Painting.
3. Painting shows a bed picker with 3 entries: Raised Bed Left, Raised Bed Right, Grow Bags.
4. Selecting "Grow Bags" renders a 1x6 grid with cells labeled Bag 1 through Bag 6.
5. Plantings render with variety chips. Verify visible:
   - "Peas · Wando" in Raised Bed Left
   - "Peas · Cascadia" in Raised Bed Right
   - "Lettuce · Parris Island Cos" in Raised Bed Left
   - "Lettuce · Marvel of Four Seasons" in Raised Bed Left, Grow Bags Bag 5
   - "Kale · Dwarf Blue Curled" in Raised Bed Right + Grow Bags Bag 3, Bag 4
6. Scallions and Garlic render visibly (not "Unknown crop").
7. Status badges per planting reflect Mom's taxonomy (Sprouted, Planted, Growing, Producing).
8. Planner page reads the 3 beds. Bed picker present. Switching beds re-renders the timeline.
9. Planner CropSheet for "Pea, Snap" shows "Cascadia" subtitle. Score still calculated using `peas` cropId per scoring spec (no change to numeric outputs).
10. Journal shows: 1 "Loaded Mom Garden data" entry + 13 planting entries with variety + bed name.
11. Garden Doctor opened from a Mom planting via the Planner shows the crop+variety+bed context bar.
12. Browser console has zero errors except the expected Babel standalone warning (per current-context.md baseline).
13. Service worker (if registered): on second page load, `data/mom-garden-data.json` is served from cache (verify in DevTools Network panel: "from ServiceWorker").
14. Reload the page: Mom beds persist via GosBed/localStorage. The Mom data file is NOT re-loaded over user edits.
15. "Reset to Mom Garden" action exists in Painting and works after a confirmation dialog. Test: edit a bed, click Reset → bed returns to Mom data.

---

## Verification commands (run in order)

```bash
# 1. Static syntax check
python3 -m py_compile -m json.tool < data/mom-garden-data.json
node --check garden-planner-v5.html 2>/dev/null || true   # HTML, won't fully parse — check for obvious script errors

# 2. Local serve
python3 -m http.server 8000

# 3. Browser smoke (manual)
# - Open http://localhost:8000/index-v5.html in a fresh incognito window
# - Walk acceptance criteria 1-15 above
# - DevTools console: confirm no errors
# - DevTools Application: verify GosBed localStorage shows 3 beds with Mom-loaded source tags

# 4. Lighthouse / a11y sanity (optional, not required for first ship)
# - Run Lighthouse on /index-v5.html
# - No new accessibility regressions vs baseline
```

---

## Rollback

If anything breaks production:

1. Delete `data/mom-garden-data.json`.
2. `git checkout HEAD -- garden-planner-v5.html garden-painting.html how-it-thinks-v5.html garden-doctor-v5.html gos-bed.js index-v5.html sw.js`.
3. Service worker cache version bump means clients will refresh on next visit; if cache version was bumped, a stale-cache page may persist for one load. Acceptable.

No localStorage migration needed — all changes are additive layers on top of GosBed. User beds created BEFORE this change are unaffected.

---

## Non-goals (do NOT do these in this pass)

- Do NOT extend `specs/CROP_SCORING_DATA.json` with variety field.
- Do NOT modify `garden-planner-v4.html` (the production v4 surface stays untouched).
- Do NOT implement two-way Notion sync. Mom data is a static snapshot; future sync is a separate spec.
- Do NOT add USDA zone lookup, weather API, or location prompt — those are separate ship-blockers from the prior audit (#3, #2). Mom is in Zone 7a per the existing Philadelphia hardcode; that matches her actual location, so the hardcode is correct for Mom-first ship.
- Do NOT add notifications, photos, yield charts, or backdate UI — listed in the prior audit (P2 items 50-52, 14). Future passes.
- Do NOT collapse Mom's variety metadata into anonymous generic crops. The displayName and varietyName fields are user-trust load-bearing.
- Do NOT model grow bags with a sun gradient. They have `wallSide: 'none'` so the row-from-wall light shadow stays at zero. Scoring should still produce a number (per `SCORING_RULES.md` deterministic rule), but the spatial component is irrelevant for bags.
- Do NOT touch the v4 planner's hardcoded fixture data.
- Do NOT register the new sw.js automatically. Leave registration to a follow-up.

---

## Path note

This spec was authored by Claude on Duncan (Windows). The repo path written in the user's prompt is the Mac path: `/Users/daverobertson/Desktop/Code/10-projects/active/garden-os-fresh`. The Windows working copy at `C:\Users\Dave RambleOn\Desktop\01-Projects\code\daveHomeAssist\garden-os\` is a separate clone.

If Codex runs on Mac:
- This spec was committed from Windows. Pull on Mac before starting.
- Path references in this doc use repo-relative paths (`data/...`, `garden-planner-v5.html`, etc.) — they apply to whichever clone Codex is in.

If both clones get edits in parallel, expect merge conflicts on `garden-planner-v5.html` and `garden-painting.html`. Coordinate before parallel work.

---

## Reference: prior context

- Prior session audit of `garden-planner-v5.html` found 76 issues (P0/P1/P2/P3). This spec addresses P0 #8 (bed dimensions hard-coded), partially #9 (CROPS catalog incomplete), and #41 (multi-bed picker). Other P0s (fake weather #2, hard-coded location #3, calendar coverage #4, today-stale #5) are NOT in scope here.
- Notion source: `🌱 DB | Mom | Outdoor Plant Beds Tracker` at https://www.notion.so/c0c707d0f4f54b2aae07bbff1721219a — 13 entries, fetched 2026-04-27 via `notion-query-database-view`.
- Plant master DB: `🌳 DB | Plants` at https://www.notion.so/2b4255fc8f44817da51fff852d09e6a3 (richer per-species data, not used in this pass).
- Planting calendar DB: `📅 DB | Garden Planting Calendar 25-26` at https://www.notion.so/2b4255fc8f448137b5b6f16caabb78e1 (Mom's per-species windows, not used in this pass).

---

## Return to Dave (after Codex run)

Codex should respond with:

1. Files changed (paths + lines added/removed).
2. Mom crop data loaded — confirm the 13 planting groups / 44 planted cells rendered.
3. How beds are represented — confirm 3-bed model with grow bags as 1x6 virtual bed.
4. How varieties are displayed — confirm chip placement.
5. Any unplaced or ambiguous records — list cells where placement was best-effort vs source-explicit.
6. Verification results — pass/fail per acceptance criteria 1-15.

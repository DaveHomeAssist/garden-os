# Garden OS — Changelog

---

## v4.1 (2026-03-11)

Stability and security hardening release. No new features — focused entirely on correctness fixes and attack surface reduction.

### Bug Fixes

**Medium severity:**

- **Share link now includes USDA zone** — `shareLayout()` was missing the `zone` field in its settings payload. Shared links silently dropped the zone setting, causing the recipient to see "— not set —" regardless of what the sender had configured.

- **N-S orientation penalty fixed for narrow beds** — The orientation shading formula `c === floor(bedW/2) || c === floor(bedW/2)-1` selected ALL columns when `bedW = 2`, penalizing every cell by −0.4 hrs. Fixed: beds with `bedW ≤ 2` skip the penalty entirely (no interior column to shade); odd-width beds now penalize only the single true center column instead of two.

**Low severity:**

- **Division-by-zero guard in sun scoring** — `scoreCropInCell` divided by `(sunIdeal - sunMin)` with no guard. If a crop were added with equal values, the score would be `NaN` and propagate to tooltips and the bed score. Added `|| 1` fallback on the denominator.

- **Stale cell selection cleared on bed resize** — After resizing the bed, `ui.selCell` could reference a cell ID that no longer existed (e.g., `r5c3` in a now-3×3 bed). The ghost reference was persisted to localStorage. Now reset to `null` in `applyBedSize()`.

- **Duplicate water-mismatch warnings eliminated** — When cell A (low water) was adjacent to cell B (high water), `cellIssues` emitted two warnings with swapped subjects: "Lettuce and Beit Cuke…" and "Beit Cuke and Lettuce…". The `seen` Set dedup failed because the strings differed. Fixed: only the cell with the lower ID emits the warning, and the crop pair is alphabetically sorted for consistent messaging.

- **Initial auto-fill no longer pollutes undo stack** — On first visit (no localStorage), `loadRec()` called `pushUndo()` which snapshotted the empty bed. Pressing Ctrl+Z immediately wiped the auto-filled recommendation to a blank grid. Added `skipUndo` parameter; init calls `loadRec(true)`.

- **`cellIssues` computed once per render instead of twice** — Both `renderBed` and `renderRight` (via `warnings()`) were independently calling `cellIssues(inputs)`. Now computed once in `render()` and passed to both functions.

- **`betterCropForCell` no longer mutates live bed** — The function temporarily set `cell.crop = candidateKey`, called `scoreCell`, then restored the original. While safe in single-threaded JS today, this was fragile. Now scores on a shallow clone `{...cell}` instead.

### Security Patches

**Medium severity:**

- **Added `escapeHtml()` utility** — New function using `textContent`/`innerHTML` swap pattern. Applied 24 times across all `innerHTML` render paths: bed grid tooltips, cell names, palette items, score bars, inspect pane, variety descriptions, warning messages, and category buttons. Prevents DOM XSS if crop data is ever sourced externally.

- **Added Content Security Policy** — New `<meta>` tag:
  ```
  default-src 'none';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  script-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  ```

- **Removed all 22 inline event handlers** — Every `onclick`, `onchange`, and `oninput` attribute removed from HTML. Replaced with 29 `addEventListener` calls in a dedicated init block, plus 3 event delegation zones (bed presets, category filter, crop palette) using `data-*` attributes. This enables future CSP tightening.

- **Added payload size guard** — `MAX_SHARE_PAYLOAD` constant (50 KB). Both URL hash and localStorage reads reject payloads exceeding this limit before `JSON.parse`, preventing DoS via crafted giant URLs.

**Low severity:**

- **Added `crossorigin="anonymous"` to Google Fonts link** — Ensures CORS headers are sent, enabling future SRI (Subresource Integrity) if the fonts are self-hosted.

- **Full settings validation in `applyLoadedState`** — All settings from localStorage/URL are now type-checked and validated against allowlists before touching the DOM:
  - `orientation` must be in `['ew', 'ns']`
  - `wallSide` must be in `['back', 'front', 'left', 'right', 'none']`
  - `season` must be in `['spring', 'summer', 'latesummer', 'fall']`
  - `goal` must be in `['balanced', 'yield', 'easy', 'salad', 'pickling', 'herbs']`
  - `zone` must be in `['', '5', '6', '7', '8', '9', '10']`
  - `tool` must be in `['paint', 'erase']`
  - `selCell` must match `/^r\d+c\d+$/`
  - `sunHours` must be a finite number between 2 and 10
  - `bedW`/`bedH` clamped to integers in range [2, 10]
  - `bed` must be an `Array` of correct length
  - Each crop key must be a `string` that exists in `CROPS`

- **Prototype pollution guard** — URL-sourced parsed JSON is frozen with `Object.freeze(p)`. Schema shape validated (`typeof p === 'object'`, not `Array`) before property access.

- **Replaced `window.prompt` with in-page UI** — When the clipboard API is unavailable (HTTP, older browsers), `showShareFallback(url)` renders a styled fixed-position panel with a read-only input, "Select All" button, and close button. No more modal dialog leaking the URL.

- **Shared-link load indicator** — `showShareBanner()` displays a 4-second toast at the top of the page: "Loaded from shared link". Helps users know the layout came from an external source.

- **Explicit `decodeURIComponent` error handling** — Malformed percent-encoding (e.g., `%ZZ`) in URL hash is now caught in its own try/catch with early return, before `JSON.parse` is attempted.

### Stats

| Metric | v4.0 | v4.1 | Delta |
|--------|------|------|-------|
| Total lines | ~1,338 | 1,495 | +157 |
| File size | ~78 KB | 86.4 KB | +8.4 KB |
| Functions | ~40 | 50 | +10 |
| Inline handlers | 22 | 0 | −22 |
| addEventListener calls | 1 | 29 | +28 |
| escapeHtml calls | 0 | 24 | +24 |
| Input validation checks | 2 | 18 | +16 |

---

## v4.0 (initial release)

Initial version of Garden OS raised bed planner.

- 43 crops across 8 categories with full metadata
- 3-panel layout: site settings + crop palette, interactive bed grid, scoring/inspect/notes
- Scoring engine: sun fit, companion planting, water compatibility, season matching, goal bonuses
- Auto-fill recommendations by goal (balanced, yield, easy, salad, pickling, herbs)
- Undo/redo (40-deep stack, keyboard shortcuts)
- Variable bed sizes (2×2 to 10×10) with 6 presets
- Zone map with wall penalty, orientation shading, trellis detection
- Per-cell inspect with variety ranking and swap suggestions
- Crop search and category filtering
- Succession planting badges
- Share layout via URL hash
- localStorage persistence
- Responsive mobile layout
- Fill progress bar

---

*Garden OS Changelog · Last updated 2026-03-11*

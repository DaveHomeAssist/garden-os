# Garden OS — UI Specification

Version: 1.0 · Target: Single HTML file · Tech: Vanilla JS, embedded CSS, localStorage
Art Direction: Editorial Realism + Graphic Overlays. Philadelphia backyard. Dry humor. Earned sentiment.

---

## 1. COMPONENT INVENTORY

### 1.1 Status Bar

| Property | Value |
|----------|-------|
| Purpose | Persistent game state readout: season, crops placed, last score, run count |
| Location | Bottom edge, full width |
| z-index | 40 |
| Size | height: 36px; full width of `.app` container |
| Content model | 4 labeled stat slots: `GRID: n/32`, `SEASON: name`, `LAST SCORE: nn`, `RUNS: n` |

| State | Behavior |
|-------|----------|
| default | All stats visible, muted text |
| updated | Stat value pulses once (opacity 0.5 to 1.0, 300ms ease-out) |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | Single row, flex, space-between |
| 768px | Single row, tighter gap (8px) |
| 320px | Wraps to 2x2 grid, font-size: 0.68rem |

---

### 1.2 Crop Panel

| Property | Value |
|----------|-------|
| Purpose | Crop selection organized by faction (category) groups |
| Location | Left column (desktop), top section (mobile) |
| z-index | 1 |
| Size | width: 320px (desktop), full width (mobile) |
| Content model | Section heading, season selector `<select>`, faction groups each containing a scrollable list of crop buttons, eraser button, action buttons row, challenge strip, status text |

| State | Behavior |
|-------|----------|
| default | All crop buttons enabled, selected crop highlighted |
| hover | Crop button lifts 1px, border darkens, subtle shadow |
| active (selected) | Green-tinted background, accent border |
| disabled | opacity: 0.56, cursor: not-allowed, no transform |
| loading | N/A (instant local render) |
| error | N/A |

**Crop Button** inner component:

| Property | Value |
|----------|-------|
| Size | min-height: 44px, full width of group |
| Content | `.name-line` (crop name, 0.96rem, weight 600), `.meta-line` (faction + traits, 0.68rem, muted) |
| Touch target | Full button area, min 44px tall |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 320px fixed sidebar, crop list max-height: 350px scrollable |
| 768px | 280px fixed sidebar |
| 320px | Full width, crop list max-height: 250px, collapsible faction groups |

---

### 1.3 Board (8x4 Grid)

| Property | Value |
|----------|-------|
| Purpose | Primary interaction surface. 8 columns x 4 rows raised bed representation |
| Location | Center column (desktop), below crop panel (mobile) |
| z-index | 1 |
| Size | Fluid, fills available center space. Cells: minmax(0, 1fr) with 6px gap |
| Content model | 32 cells in CSS grid, column axis labels above, row zone labels below |

| State | Behavior |
|-------|----------|
| default | Soil-textured cells with zone indicators |
| hover | Cell lifts 1px, border brightens, shadow deepens |
| selected | Blue focus ring (2px solid `--focus`, 2px offset via box-shadow) |
| eraser-mode | Crosshair cursor on all cells |
| post-sim | Cells colored by score quality (good/warn/hard) |
| loading (sim running) | Sim overlay covers board |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | Cells ~80px tall, full emoji + abbreviation visible |
| 768px | Cells ~68px tall, full detail |
| 320px | Board scrolls horizontally (min-width: 430px), cells 56px tall, abbreviations hidden |

---

### 1.4 Score Card

| Property | Value |
|----------|-------|
| Purpose | Displays overall bed score, grade badge, issue counters, and 6 factor bars |
| Location | Right column (desktop), below board (mobile) |
| z-index | 1 |
| Size | Full width of results column |
| Content model | SVG ring gauge (84x84) with score number (2.2rem) centered, grade badge pill, 3 counters row (hard/warn/buff), 6 factor bar rows |

**Score Ring** sub-component:

| Property | Value |
|----------|-------|
| Size | 84x84px (desktop), 74x74px (mobile <480px) |
| SVG | viewBox 0 0 100 100, track circle r=42 stroke-width=8, fill circle r=42 stroke-dasharray=264 |
| Animation | stroke-dashoffset transitions from 264 to target over 550ms ease-out |

**Grade Badge** sub-component:

| Property | Value |
|----------|-------|
| Size | Auto width, pill shape (border-radius: 999px), padding: 2px 7px |
| Variants | `.a` (green border/text), `.b` (olive), `.c` (amber), `.d`/`.f` (red) |
| Animation | Bounces in via scale(0.6) to scale(1.0), 350ms back-out ease |

**Counters** sub-component:

| Property | Value |
|----------|-------|
| Layout | 3-column grid, equal width |
| Variants | `.hard` (red bg #f5dddd), `.warn` (amber bg #f5ead8), `.good` (green bg #e1f2e5) |
| Content | Strong number + label text |

**Factor Bars** sub-component (x6: Sun, Support, Shade, Access, Season, Adjacency):

| Property | Value |
|----------|-------|
| Layout | 3-column row: 68px label, fluid bar, 42px value |
| Bar | 8px tall, rounded, gradient fill (amber to green) |
| Animation | Width transitions from 0% to target%, 400ms ease-out, staggered 800ms apart during score reveal |

| State | Behavior |
|-------|----------|
| default (no sim) | Score shows `--`, ring empty, grade shows `--`, bars at 0% |
| scored | All values populated, ring filled, grade badge visible |
| hover | N/A (read-only display) |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 340px column width |
| 768px | Full width below board, 2-column layout for counters |
| 320px | Full width, ring 74px, score-value 1.65rem |

---

### 1.5 Violation List

| Property | Value |
|----------|-------|
| Purpose | Scrollable list of HARD and ADVISORY violations from last simulation |
| Location | Right column, below score card |
| z-index | 1 |
| Size | max-height: 140px, overflow-y: auto |
| Content model | List of `.viol` items, each with severity prefix (HARD/ADVISORY/BUFF) and message text |

| State | Behavior |
|-------|----------|
| default (empty) | Empty state message: dashed border, muted icon + hint text |
| populated | Scrollable list, items separated by dashed bottom borders |
| overflow | Scroll indicator (CSS gradient fade at bottom edge) |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 140px max-height |
| 768px | 140px max-height |
| 320px | 120px max-height, font-size: 0.72rem |

---

### 1.6 Narrator Box

| Property | Value |
|----------|-------|
| Purpose | Character commentary from Garden GURL or Onion Man after simulation |
| Location | Right column, below violations |
| z-index | 1 |
| Size | min-height: 90px, full width of results column |
| Content model | Character name (bold, accent color), colon, narrative text. No separate portrait container in v2 — name inline with text |

| State | Behavior |
|-------|----------|
| default | Static opening line from Garden GURL |
| post-sim | Text updates with character-specific commentary based on score tier |
| fade | opacity: 0.3 during transition to new text |
| timing | Appears 600-800ms after score reveal completes |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | Full width, 0.78rem body text |
| 768px | Full width |
| 320px | Full width, min-height: 72px |

---

### 1.7 Event Log

| Property | Value |
|----------|-------|
| Purpose | Chronological scrollable log of game events and narrator messages |
| Location | Right column, below narrator |
| z-index | 1 |
| Size | max-height: 190px, overflow-y: auto |
| Content model | List of `.line` items with dashed bottom borders |

| State | Behavior |
|-------|----------|
| default (empty) | Empty state placeholder |
| populated | New entries prepended, auto-scrolls to latest |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 190px max-height |
| 768px | 190px max-height |
| 320px | 140px max-height |

---

### 1.8 Score History List

| Property | Value |
|----------|-------|
| Purpose | Last 10 simulation scores for comparison |
| Location | Right column, below event log |
| z-index | 1 |
| Size | max-height: 140px, overflow-y: auto |
| Content model | List of `.hist` items showing season, score, timestamp |
| Persistence | localStorage key: `garden_strategy_scores_v1` |

| State | Behavior |
|-------|----------|
| default (empty) | Empty state placeholder |
| populated | Newest entry at top, score colored by quality |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 140px max-height |
| 768px | 140px max-height |
| 320px | 120px max-height |

---

### 1.9 Challenge Strip

| Property | Value |
|----------|-------|
| Purpose | Displays active challenge objective in a compact banner |
| Location | Left column, between crop group and action buttons |
| z-index | 1 |
| Size | Full width of controls column, auto height |
| Content model | Single line of challenge text |
| Border | 1px dashed #7f6b37 |
| Background | Linear gradient warm cream |

| State | Behavior |
|-------|----------|
| default | Shows "Challenge: Open Play" |
| active-challenge | Shows challenge name and brief rule |
| challenge-passed | Text updates with pass confirmation |
| challenge-failed | Text updates with failure reason |

---

### 1.10 Challenge Modal

| Property | Value |
|----------|-------|
| Purpose | Overlay dialog presenting a new challenge with accept/skip options |
| Location | Fixed center of viewport |
| z-index | 50 |
| Size | width: min(520px, 96vw) |
| Content model | Title (h3), description body, two action buttons (Accept, Skip) |
| Backdrop | rgba(44, 31, 20, 0.72) full-screen overlay |

| State | Behavior |
|-------|----------|
| hidden | opacity: 0, visibility: hidden, pointer-events: none |
| active | opacity: 1, modal slides up 14px and scales 0.98 to 1.0 over 200ms ease |
| focus-trap | Tab key cycles within modal; Escape closes |

---

### 1.11 Tooltip

| Property | Value |
|----------|-------|
| Purpose | Contextual information on cell hover (crop name, score breakdown, zone info) |
| Location | Fixed position, follows cursor with offset |
| z-index | 500 |
| Size | max-width: 200px, auto height |
| Content model | Plain text, multi-line allowed |

| State | Behavior |
|-------|----------|
| hidden | display: none |
| visible | display: block, positioned near cursor |
| repositioned | Follows mouse, stays within viewport bounds |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | Standard tooltip |
| 768px | Standard tooltip |
| 320px | Hidden (touch devices use tap-to-inspect instead) |

---

### 1.12 Toast

| Property | Value |
|----------|-------|
| Purpose | Brief feedback notifications (crop placed, simulation complete, challenge result) |
| Location | Fixed bottom-center of viewport |
| z-index | 900 |
| Size | Auto width, padding: 8px 20px |
| Content model | Single line of bold text |

| State | Behavior |
|-------|----------|
| hidden | translateY(60px), below viewport |
| visible | translateY(0), slides up over 300ms ease |
| auto-dismiss | Returns to hidden after 2500ms |

---

### 1.13 Sim Overlay

| Property | Value |
|----------|-------|
| Purpose | Loading state during season simulation computation |
| Location | Fixed fullscreen |
| z-index | 800 |
| Size | Full viewport |
| Content model | "Simulating" text with animated ellipsis dots |
| Backdrop | rgba(0, 0, 0, 0.7) |

| State | Behavior |
|-------|----------|
| hidden | display: none |
| active | display: flex, centered text, dots blink with 1.2s infinite animation, 0.2s stagger |

---

### 1.14 Header Bar

| Property | Value |
|----------|-------|
| Purpose | Game title, subtitle, and metadata chips (narrator names, loop phase) |
| Location | Top, spans all columns |
| z-index | 1 |
| Size | Full width of `.app`, padding: 18px 20px |
| Content model | h1 title (gradient text), subtitle paragraph, flex row of `.chip` pills |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | Row layout, title left, chips right |
| 768px | Row layout, tighter spacing |
| 320px | Column layout, chips wrap below title, chip font-size: 0.68rem |

---

### 1.15 Action Buttons Row

| Property | Value |
|----------|-------|
| Purpose | Primary actions: Run Season, Retry Layout, Auto-Fill, New Challenge |
| Location | Left column, below challenge strip |
| Size | 2-column grid, 8px gap |
| Touch targets | min-height: 44px on all buttons |

**Button variants:**

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `.btn-primary` | Green gradient (#6ea64e to #547f3a) | White (#f8f5ed) | #5f8f45 |
| `.btn-danger` | Red gradient (#c26759 to #a75248) | White (#fff6f2) | #9d4b44 |
| `.btn-secondary` | Warm cream mix | Dark ink | #b89569 |

| State | Behavior |
|-------|----------|
| default | Resting state with gradient background |
| hover | brightness(1.08), translateY(-1px) |
| active | translateY(0) |
| disabled | opacity: 0.56, cursor: not-allowed, no transform |

| Breakpoint | Behavior |
|------------|----------|
| 1440px | 2-column grid |
| 768px | 2-column grid |
| 320px (<480px) | 1-column grid, full-width buttons |

---

### 1.16 Legend Bar

| Property | Value |
|----------|-------|
| Purpose | Color key for board zones and score states |
| Location | Above the board grid |
| Size | Full width of board container, flex-wrap |
| Content model | 5 items: Trellis (gold dot), Access (blue dot), Good (green dot), Advisory (amber dot), Hard (red dot) |

---

## 2. LAYOUT SYSTEM

### 2.1 Container

```css
.app {
  width: min(1280px, 96vw);
  margin: 22px auto 38px;
  display: grid;
  gap: 16px;
}
```

### 2.2 Desktop (>1140px) — 3 Column

```css
.app {
  grid-template-columns: 320px 1fr 340px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "header header header"
    "controls board results";
}
```

- **Left (controls):** Crop panel, season select, challenge strip, action buttons, status text
- **Center (board):** Legend, axis labels, 8x4 grid, zone labels
- **Right (results):** Score card, violation list, narrator box, score history, event log

### 2.3 Tablet (821px–1140px) — 2 Column

```css
@media (max-width: 1140px) {
  .app {
    grid-template-columns: 300px 1fr;
    grid-template-areas:
      "header header"
      "controls board"
      "results results";
  }
  .results { grid-column: 1 / -1; }
}

@media (max-width: 960px) {
  .app {
    width: min(1020px, 97vw);
    grid-template-columns: 280px 1fr;
  }
}
```

### 2.4 Mobile (<=820px) — 1 Column

```css
@media (max-width: 820px) {
  .app {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "controls"
      "board"
      "results";
  }
}

@media (max-width: 600px) {
  .app {
    width: min(100%, 98vw);
    margin: 10px auto 20px;
    gap: 10px;
  }
  /* Board gets horizontal scroll to preserve cell readability */
  .board-wrap { overflow-x: auto; }
  .board, .axis { min-width: 430px; }
}

@media (max-width: 480px) {
  .app {
    width: 100%;
    margin: 8px auto 16px;
    padding: 0 6px;
  }
}
```

### 2.5 Landscape Mobile

```css
@media (max-height: 500px) and (orientation: landscape) {
  .app { margin: 6px auto 10px; gap: 8px; }
  .controls, .board-wrap, .results { padding: 10px; gap: 8px; }
  .crop-grid { max-height: 160px; }
  .event-log { max-height: 120px; }
  .history-list, .violation-list { max-height: 94px; }
}
```

### 2.6 Board Priority Rule

The board always gets remaining space after fixed-width sidebars. On mobile, the board renders at full width (or with horizontal scroll) before any results content. The grid never shrinks below `min-width: 396px` (enough for 8 columns at ~44px each plus gaps).

---

## 3. COLOR TOKEN SYSTEM

### 3.1 Seasonal Palettes

```css
/* ── SPRING ──────────────────────────────────────── */
:root[data-season="spring"],
:root {
  /* Ground layer */
  --s-ground-deep:    #3e2a14;   /* wet soil brown */
  --s-ground-mid:     #5c3d1e;   /* turned earth */
  --s-ground-light:   #8b7355;   /* dirty clay */

  /* Growth layer */
  --s-growth-primary: #6b9a5b;   /* cool mid green */
  --s-growth-accent:  #a3c78a;   /* early lettuce lime */
  --s-growth-muted:   #7a8b6e;   /* sage sprout */

  /* Sky / ambient layer */
  --s-sky-wash:       #c8cfc2;   /* washed gray-green */
  --s-sky-light:      #dde3d6;   /* overcast cream */
  --s-sky-highlight:  #e8eddf;   /* pale spring light */
}

/* ── SUMMER ──────────────────────────────────────── */
:root[data-season="summer"] {
  /* Ground layer */
  --s-ground-deep:    #4c321f;   /* baked soil */
  --s-ground-mid:     #6b4a2a;   /* hot dirt */
  --s-ground-light:   #b89b72;   /* sun-bleached tan */

  /* Growth layer */
  --s-growth-primary: #3d7a2e;   /* deep leaf green */
  --s-growth-accent:  #c24433;   /* tomato red */
  --s-growth-muted:   #8b6b2f;   /* heat gold */

  /* Sky / ambient layer */
  --s-sky-wash:       #f0e6d0;   /* bleached haze */
  --s-sky-light:      #f5ecdc;   /* cream heat */
  --s-sky-highlight:  #e8b44a;   /* sun glare gold */
}

/* ── FALL ────────────────────────────────────────── */
:root[data-season="fall"] {
  /* Ground layer */
  --s-ground-deep:    #3a2810;   /* cold soil */
  --s-ground-mid:     #5e4020;   /* dry garden dirt */
  --s-ground-light:   #8a6b40;   /* onion skin brown */

  /* Growth layer */
  --s-growth-primary: #6b7a44;   /* dry olive */
  --s-growth-accent:  #a83c2e;   /* sauce red */
  --s-growth-muted:   #8b5a30;   /* rust */

  /* Sky / ambient layer */
  --s-sky-wash:       #d4c5a8;   /* faded warm */
  --s-sky-light:      #e0d4ba;   /* kitchen amber */
  --s-sky-highlight:  #c9963a;   /* porch light amber */
}

/* ── WINTER ──────────────────────────────────────── */
:root[data-season="winter"] {
  /* Ground layer */
  --s-ground-deep:    #2e2e30;   /* frozen soil */
  --s-ground-mid:     #4a4a4c;   /* slate gray */
  --s-ground-light:   #6e6e6b;   /* dull metal */

  /* Growth layer */
  --s-growth-primary: #5a6858;   /* dead sage */
  --s-growth-accent:  #8a7a5e;   /* bare wood */
  --s-growth-muted:   #6b6b60;   /* dormant gray-green */

  /* Sky / ambient layer */
  --s-sky-wash:       #c8c4b8;   /* overcast slate */
  --s-sky-light:      #e8e2d4;   /* notebook cream */
  --s-sky-highlight:  #c9963a;   /* porch light amber */
}
```

### 3.2 Semantic Colors

```css
:root {
  --sem-good:         #3e9d63;   /* companion hit, high score */
  --sem-good-bg:      #e1f2e5;
  --sem-warn:         #c78623;   /* advisory violation, mid score */
  --sem-warn-bg:      #f5ead8;
  --sem-hard:         #c24d4d;   /* hard violation, low score */
  --sem-hard-bg:      #f5dddd;
  --sem-companion:    #bb6bd9;   /* companion link indicator */
  --sem-companion-bg: rgba(187, 107, 217, 0.12);
  --sem-focus:        #2f73a8;   /* keyboard focus ring */
}
```

### 3.3 Surface Hierarchy

```css
:root {
  /* Background (page body) */
  --sf-bg:            #2a1c10;
  --sf-bg-gradient:   radial-gradient(circle at 18% 0%, #4c321f 0%, #2a1c10 52%),
                      linear-gradient(180deg, #2a1c10 0%, #1e140b 100%);

  /* Panel (primary containers) */
  --sf-panel:         #f5ecdc;
  --sf-panel-2:       #efe3cd;
  --sf-panel-gradient: linear-gradient(180deg,
                        color-mix(in srgb, var(--sf-panel) 92%, #fff 8%) 0%,
                        var(--sf-panel) 100%);

  /* Card (inset containers within panels) */
  --sf-card:          color-mix(in srgb, var(--sf-panel) 89%, #fff 11%);

  /* Field (input backgrounds) */
  --sf-field:         color-mix(in srgb, var(--sf-panel) 84%, #dfc9a5 16%);

  /* Overlay (modal backdrop) */
  --sf-overlay:       rgba(44, 31, 20, 0.72);

  /* Ink & type */
  --sf-ink:           #22150b;
  --sf-muted:         #5a4834;
  --sf-line:          #c5ab86;
}
```

### 3.4 Character Accents

```css
:root {
  --char-gurl:        #5f8f45;   /* Garden GURL — practical green */
  --char-gurl-bg:     #e4f0dc;
  --char-onion:       #c98d22;   /* Onion Man — warm gold-amber */
  --char-onion-bg:    #f5ead0;
}
```

### 3.5 Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --sf-bg:          #0e0a06;
    --sf-panel:       #1e1610;
    --sf-panel-2:     #252018;
    --sf-card:        #2a2318;
    --sf-field:       #1a150e;
    --sf-ink:         #e8dcc8;
    --sf-muted:       #9a876e;
    --sf-line:        #4a3e2e;
    --sf-overlay:     rgba(0, 0, 0, 0.82);

    --sem-good:       #5ec47e;
    --sem-good-bg:    #1a2e20;
    --sem-warn:       #d4a03a;
    --sem-warn-bg:    #2e2410;
    --sem-hard:       #e06060;
    --sem-hard-bg:    #2e1414;
    --sem-focus:      #5a9fd4;

    --sf-bg-gradient: radial-gradient(circle at 18% 0%, #1a120a 0%, #0e0a06 52%),
                      linear-gradient(180deg, #0e0a06 0%, #060402 100%);
    --sf-panel-gradient: linear-gradient(180deg, #221a12 0%, #1e1610 100%);
  }

  /* Invert ring track for dark surfaces */
  .ring-track { stroke: var(--sf-line); }

  /* Adjust cell soil textures for dark mode */
  .cell {
    background:
      radial-gradient(circle at 20% 24%, rgba(90, 70, 40, 0.22) 1px, transparent 2px),
      radial-gradient(circle at 76% 68%, rgba(70, 50, 30, 0.16) 1px, transparent 2px),
      linear-gradient(180deg, #2a2218 0%, #221a10 100%);
  }

  /* Panel shadows darken further */
  .panel { box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5); }
}
```

---

## 4. TYPOGRAPHY

### 4.1 Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

:root {
  --ff-heading: 'Fraunces', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
  --ff-body:    'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --ff-mono:    'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

### 4.2 Type Scale

| Token | Size | Weight | Family | Usage |
|-------|------|--------|--------|-------|
| `--type-label` | 10px / 0.625rem | 500 | `--ff-mono` | Axis labels, status bar stats, tiny metadata |
| `--type-small` | 11px / 0.6875rem | 400 | `--ff-body` | Crop meta-line, violation details, challenge text |
| `--type-body` | 13px / 0.8125rem | 400 | `--ff-body` | Body text, narrator text, event log entries |
| `--type-subhead` | 16px / 1rem | 600 | `--ff-body` | Crop names, counter labels |
| `--type-section` | 18–22px / clamp(1.12rem, 2vw, 1.375rem) | 700 | `--ff-heading` | Section headings (h2) |
| `--type-score` | 32px / 2rem | 800 | `--ff-heading` | Score display number |
| `--type-title` | clamp(1.32rem, 2.8vw, 2.2rem) | 800 | `--ff-heading` | Page title h1 |

### 4.3 Type Styles

```css
body {
  font-family: var(--ff-body);
  font-size: 13px;
  line-height: 1.6;
  color: var(--sf-ink);
  -webkit-font-smoothing: antialiased;
}

h1 {
  font-family: var(--ff-heading);
  font-size: var(--type-title);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

h2 {
  font-family: var(--ff-heading);
  font-size: var(--type-section);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

/* Faction group headings */
h3 {
  font-family: var(--ff-body);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sf-muted);
}

.score-value {
  font-family: var(--ff-heading);
  font-size: var(--type-score);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.grade {
  font-family: var(--ff-body);
  font-size: 0.67rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kbd {
  font-family: var(--ff-mono);
  font-size: 0.72rem;
  border: 1px solid var(--sf-line);
  border-radius: 6px;
  padding: 2px 5px;
  background: #ead9ba;
}

.cell .abbr {
  font-family: var(--ff-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--sf-muted);
}
```

---

## 5. ANIMATION SPEC

### 5.1 Easing Curves

```css
:root {
  --ease-expo-out:  cubic-bezier(0.16, 1, 0.3, 1);       /* entering elements */
  --ease-expo-in:   cubic-bezier(0.7, 0, 0.84, 0);       /* exiting elements */
  --ease-out:       cubic-bezier(0.33, 1, 0.68, 1);       /* state changes */
  --ease-back-out:  cubic-bezier(0.2, 0.9, 0.2, 1.2);    /* bouncy / organic */
}
```

### 5.2 Animation Table

| Element | Trigger | CSS Properties | Duration | Easing | Reduced-Motion Fallback |
|---------|---------|---------------|----------|--------|------------------------|
| **Cell: plant placement** | Crop placed in cell | `transform: scale(0.85) -> scale(1.0)` | 180ms | `--ease-back-out` | Instant appearance, no transform |
| **Cell: hover lift** | Mouse enter | `transform: translateY(-1px)`, `border-color`, `box-shadow` | 140ms | `--ease-out` | No transform, border/shadow still change |
| **Cell: score color** | Post-simulation | `border-color`, `background` | 140ms | `--ease-out` | Instant color change |
| **Cell: harvest sweep** | Harvest event | `opacity: 1 -> 0.3 -> 1`, `transform: scale(1) -> scale(0.9) -> scale(1)` | 280ms per cell, staggered 120ms diagonal | `--ease-expo-out` | Instant opacity flash |
| **Cell: hard violation pulse** | Hard violation detected | `box-shadow: 0 0 0 0 -> 0 0 0 4px (red)` | 1000ms, infinite | ease-in-out | Static red border, no pulse |
| **Score ring fill** | Simulation complete | `stroke-dashoffset: 264 -> target` | 550ms | `--ease-out` | Instant fill, no transition |
| **Score value count-up** | Simulation complete | Numeric text increment via JS | 400ms | linear (JS-driven) | Instant final value |
| **Factor bar fill** | Score reveal sequence | `width: 0% -> target%` | 400ms each | `--ease-out` | Instant width |
| **Factor bar stagger** | Score reveal sequence | Delay per bar | 800ms between bars (0, 800, 1600, 2400, 3200, 4000ms) | N/A (delay only) | All bars fill simultaneously |
| **Grade badge entrance** | After last factor bar | `transform: scale(0.6) -> scale(1.0)` | 350ms | `--ease-back-out` | Instant appearance |
| **Narrator text update** | 600–800ms after grade | `opacity: 0.3 -> 1.0` | 250ms | `--ease-out` | Instant text swap |
| **Toast slide-up** | Event notification | `transform: translateY(60px) -> translateY(0)` | 300ms | `--ease-expo-out` | Instant appearance |
| **Toast dismiss** | 2500ms auto-timeout | `transform: translateY(0) -> translateY(60px)` | 300ms | `--ease-expo-in` | Instant disappear |
| **Modal entrance** | Challenge presented | `opacity: 0 -> 1`, modal `transform: translateY(14px) scale(0.98) -> translateY(0) scale(1)` | 200ms | `--ease-out` | Instant appearance |
| **Modal exit** | Challenge dismissed | `opacity: 1 -> 0`, `visibility: hidden` | 180ms | `--ease-expo-in` | Instant disappear |
| **Sim overlay dots** | Sim running | Opacity blink: `1 -> 0.1 -> 1` | 1200ms, infinite, 0.2s stagger per dot | ease (default) | Static "Simulating..." text, no blink |
| **Crop button hover** | Mouse enter | `transform: translateY(-1px)`, `border-color`, `box-shadow` | 140ms | `--ease-out` | No transform |
| **Button hover** | Mouse enter | `filter: brightness(1.08)`, `transform: translateY(-1px)` | 140ms | `--ease-out` | No transform, brightness only |
| **Seasonal transition** | Season select change | CSS custom property cross-fade | 3000ms | See section 9 | Instant palette swap |

### 5.3 Reduced Motion Master Rule

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 5.4 Harvest Sweep (JS orchestration)

```js
// Called on harvest event. Cells resolve in diagonal sweep order.
function harvestSweep(cells) {
  const sorted = cells.sort((a, b) => {
    const aRC = cellToRowCol(a);
    const bRC = cellToRowCol(b);
    return (aRC.row + aRC.col) - (bRC.row + bRC.col);
  });

  sorted.forEach((cellIndex, i) => {
    const delay = i * 120; // 120ms diagonal stagger
    setTimeout(() => {
      const el = getCellElement(cellIndex);
      el.classList.add('harvesting');
      // Pentatonic pluck: Eb, F, Ab, Bb, Db mapped to diagonal index mod 5
      playPluck(PENTATONIC_EB[i % 5]);
      setTimeout(() => el.classList.remove('harvesting'), 280);
    }, delay);
  });
}
```

```css
@keyframes harvest-pulse {
  0%   { opacity: 1; transform: scale(1); }
  40%  { opacity: 0.3; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.cell.harvesting {
  animation: harvest-pulse 280ms var(--ease-expo-out) forwards;
}
```

### 5.5 Character Commentary Timing

Narrator text appears 600–800ms after the last animation in the score reveal sequence (grade badge bounce). Use `setTimeout` with a random value in that range:

```js
const narratorDelay = 600 + Math.random() * 200;
```

Character commentary fires on a 1-in-3 basis (33% chance per simulation). When it does not fire, the narrator box shows a shorter default line.

---

## 6. BOARD RENDERING

### 6.1 Cell States

| State | Visual Treatment |
|-------|-----------------|
| **empty** | Soil texture (see 6.3), zone indicator letter in top-left (T or A), muted border |
| **planted** | Emoji centered (1.32rem), abbreviation below (0.62rem mono), green inset shadow |
| **committed (post-sim, good)** | Green border (`--sem-good`), light green background mix |
| **committed (post-sim, warn)** | Amber border (`--sem-warn`), light amber background mix |
| **committed (post-sim, hard)** | Red border (`--sem-hard`), light red background mix |
| **event-affected** | Pulsing border shadow (see violation pulse animation) |
| **harvested** | Harvest sweep animation then returns to planted state with slight gold tint |
| **intervention-target** | Dashed border, companion purple tint background |

### 6.2 Zone Differentiation

**Trellis rows** (rows 0–1, closest to back wall):

```css
.cell.trellis {
  background:
    repeating-linear-gradient(90deg,
      rgba(200, 151, 74, 0.2) 0 2px,
      transparent 2px 7px),
    linear-gradient(180deg, #edd9b7 0%, #dfc9a1 100%);
}

.cell.trellis::before {
  content: "T";
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 0.62rem;
  color: #b47919;
  opacity: 0.85;
}
```

Trellis cells are subtly darker with vertical gold line pattern suggesting wire/string support structure.

**Access rows** (rows 2–3, closest to front/door):

```css
.cell.access {
  background:
    repeating-linear-gradient(90deg,
      rgba(87, 145, 185, 0.18) 0 2px,
      transparent 2px 7px),
    linear-gradient(180deg, #f4e9d0 0%, #eadab7 100%);
}

.cell.access::before {
  content: "A";
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 0.62rem;
  color: #4a89bd;
  opacity: 0.85;
}
```

Access cells are slightly lighter, suggesting proximity to the gardener's walking path.

### 6.3 Soil Texture (CSS Layered Radial Gradients)

```css
.cell {
  background:
    /* Fine grain: tiny irregular dots suggesting soil particles */
    radial-gradient(circle at 20% 24%,
      rgba(129, 99, 62, 0.22) 1px, transparent 2px),
    radial-gradient(circle at 76% 68%,
      rgba(96, 71, 38, 0.16) 1px, transparent 2px),
    /* Base soil gradient: warm to slightly darker */
    linear-gradient(180deg, #f0e3ca 0%, #e6d5b6 100%);
  background-size:
    12px 12px,   /* grain layer 1 period */
    14px 14px,   /* grain layer 2 period (offset for irregularity) */
    100% 100%;   /* base gradient */
}
```

The two radial gradients at different sizes and positions create a non-repeating organic pattern that reads as soil texture at the scale of the cells.

### 6.4 Board Container

```css
.board {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
  background: linear-gradient(180deg, #3f2d1d 0%, #352617 100%);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid #6c4a2a;
}
```

The board container background represents the raised bed frame (wood brown).

### 6.5 Plant Bounce (Placement Animation)

```css
@keyframes pop-in {
  0%   { transform: scale(0.85); }
  100% { transform: scale(1); }
}

.cell.just-planted {
  animation: pop-in 180ms var(--ease-back-out);
}
```

The `just-planted` class is added on placement and removed after 180ms (or on next placement). The overshoot ease creates a subtle organic bounce.

### 6.6 Companion Thread Indicators

When a cell has companion adjacency bonuses after simulation, a purple inset glow marks the relationship:

```css
.cell.companion-buff {
  border-color: var(--sem-companion) !important;
  background: color-mix(in oklab, var(--sem-companion-bg), transparent 40%);
}
```

For v2: companion connections between adjacent cells can optionally render as thin SVG lines overlaid on the board (z-index: 2) connecting the centers of companion-bonused cells.

### 6.7 Post-Sim Cell Score Label

```css
.cell-score-label {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-family: var(--ff-mono);
  font-size: 8px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}
```

Score number (e.g., "7.2") appears bottom-right of cell after simulation. Color matches score quality: green for >=7, amber for >=5, red for <5.

### 6.8 Violation Icon on Cell

```css
.cell-viol-icon {
  position: absolute;
  top: 1px;
  left: 2px;
  font-size: 8px;
  line-height: 1;
  pointer-events: none;
}
```

Small warning icon appears top-left of cells with violations after simulation.

---

## 7. SCORE REVEAL SEQUENCE

The score reveal is the primary feedback moment. It plays out as a choreographed sequence after the sim overlay dismisses.

### 7.1 Sequence Timeline

| Time | Event | Detail |
|------|-------|--------|
| 0ms | Sim overlay dismisses | Board cells update with score-colored borders |
| 100ms | Score ring begins fill | `stroke-dashoffset` transitions over 550ms |
| 100ms | Score number begins count-up | Counts from 0 to final value over 400ms (JS interval) |
| 200ms | Factor bar 1 (Sun) fills | Width: 0% to `(sunAvg/5)*100%` over 400ms |
| 1000ms | Factor bar 2 (Support) fills | +800ms stagger |
| 1800ms | Factor bar 3 (Shade) fills | +800ms stagger |
| 2600ms | Factor bar 4 (Access) fills | +800ms stagger |
| 3400ms | Factor bar 5 (Season) fills | +800ms stagger |
| 4200ms | Factor bar 6 (Adjacency) fills | +800ms stagger |
| 4600ms | Grade badge bounces in | `scale(0.6) -> scale(1.0)`, 350ms `--ease-back-out` |
| 4950ms | Counter numbers populate | Hard, Advisory, Buff counts appear |
| 5200ms | Violation list populates | Items fade in, scrollable |
| 5600–5800ms | Narrator commentary | Fade in over 250ms (if 1-in-3 character line triggers) |

### 7.2 SVG Ring Gauge

```html
<div class="score-ring" aria-hidden="true">
  <svg viewBox="0 0 100 100" focusable="false">
    <circle class="ring-track" cx="50" cy="50" r="42" />
    <circle class="ring-fill" id="scoreArc" cx="50" cy="50" r="42" />
  </svg>
  <div class="score-value" id="scoreValue">--</div>
</div>
```

```css
.score-ring {
  position: relative;
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.score-ring svg {
  width: 84px;
  height: 84px;
  transform: rotate(-90deg);
  position: absolute;
  inset: 0;
}

.ring-track {
  fill: none;
  stroke: #dbc39e;
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 264;       /* 2 * PI * 42 ≈ 263.9 */
  stroke-dashoffset: 264;      /* fully hidden */
  transition: stroke-dashoffset 550ms var(--ease-out),
              stroke 350ms var(--ease-out);
}
```

**Fill calculation (JS):**

```js
function setRingScore(score, maxScore) {
  const circumference = 2 * Math.PI * 42; // ~263.9
  const ratio = score / maxScore;
  const offset = circumference * (1 - ratio);
  scoreArc.style.strokeDashoffset = offset;

  // Color by quality
  if (score >= 7) scoreArc.style.stroke = 'var(--sem-good)';
  else if (score >= 5) scoreArc.style.stroke = 'var(--sem-warn)';
  else scoreArc.style.stroke = 'var(--sem-hard)';
}
```

### 7.3 Grade Badge Entrance

```css
@keyframes grade-bounce {
  0%   { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1.0); opacity: 1; }
}

.grade.reveal {
  animation: grade-bounce 350ms var(--ease-back-out) forwards;
}
```

The grade badge starts invisible and scales up with overshoot at the end of the factor bar sequence.

### 7.4 Factor Bar Stagger (JS)

```js
const FACTOR_STAGGER = 800; // ms between each bar

function revealFactorBars(factorAvg) {
  const bars = document.querySelectorAll('.bar-fill');
  const factors = ['sun', 'support', 'shade', 'access', 'season', 'adjacency'];

  factors.forEach((key, i) => {
    setTimeout(() => {
      const bar = bars[i];
      const pct = (factorAvg[key] / 5) * 100;
      bar.style.width = pct + '%';
    }, i * FACTOR_STAGGER);
  });
}
```

### 7.5 Narrator Timing

```js
const LAST_BAR_TIME = 5 * FACTOR_STAGGER; // 4000ms
const GRADE_TIME = LAST_BAR_TIME + 400;   // 4400ms
const NARRATOR_MIN = GRADE_TIME + 600;     // 5000ms
const NARRATOR_MAX = GRADE_TIME + 800;     // 5200ms

setTimeout(() => {
  narratorBox.classList.remove('fade');
  narratorBox.innerHTML = buildNarratorHTML(result);
}, NARRATOR_MIN + Math.random() * (NARRATOR_MAX - NARRATOR_MIN));
```

---

## 8. EVENT CARD COMPONENT

Event cards appear during seasonal events (pest outbreaks, weather events, bonus harvests). They interrupt gameplay and require player response.

### 8.1 Structure

```html
<div class="event-card-overlay" role="dialog" aria-modal="true">
  <div class="event-card" data-type="negative">
    <div class="event-card-header">
      <span class="event-icon">icon</span>
      <h3 class="event-title">Event Name</h3>
    </div>
    <p class="event-body">Description text.</p>
    <div class="event-actions">
      <button class="btn btn-primary">Intervention A</button>
      <button class="btn btn-secondary">Intervention B</button>
      <button class="btn btn-secondary">Dismiss</button>
    </div>
  </div>
</div>
```

### 8.2 Entrance Animation

```css
.event-card-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.70);
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 300ms var(--ease-out),
              visibility 300ms var(--ease-out);
}

.event-card-overlay.active {
  opacity: 1;
  visibility: visible;
}

.event-card {
  width: min(480px, 96vw);
  border-radius: 14px;
  padding: 16px;
  transform: translateY(60px);
  transition: transform 500ms var(--ease-expo-out);
}

.event-card-overlay.active .event-card {
  transform: translateY(0);
}
```

- Overlay dims the garden to 70% (`rgba(0,0,0,0.70)` backdrop)
- Card slides up 60px over 500ms with expo-out easing
- Card anchors to bottom of viewport (flex: align-items: flex-end) so garden board remains partially visible above

### 8.3 Type Variants

```css
/* Positive event (bonus harvest, beneficial weather) */
.event-card[data-type="positive"] {
  background: linear-gradient(180deg, #e8f4e0 0%, #d8eacc 100%);
  border: 2px solid var(--sem-good);
}

/* Negative event (pest, drought, frost) */
.event-card[data-type="negative"] {
  background: linear-gradient(180deg, #f8e8e4 0%, #f0d8d4 100%);
  border: 2px solid var(--sem-hard);
}

/* Mixed event (trade-off scenarios) */
.event-card[data-type="mixed"] {
  background: linear-gradient(180deg, #f4ecd8 0%, #ecdcc4 100%);
  border: 2px solid var(--sem-warn);
}
```

### 8.4 Intervention Buttons

Buttons within event cards follow the standard button spec (44px min-height). Primary intervention is `.btn-primary`, alternatives are `.btn-secondary`. Dismissal button is always last.

### 8.5 Dismissal

On dismiss or intervention selection:
- Card slides down 60px over 400ms (`--ease-expo-in`)
- Overlay fades out 300ms
- Focus returns to previously focused element (stored before overlay opened)

---

## 9. SEASONAL TRANSITION

### 9.1 Trigger

When the player changes the season selector, or when a seasonal event advances the season.

### 9.2 Color Cross-Fade

Seasonal tokens (section 3.1) transition over 3 seconds using CSS transitions on the `data-season` attribute change. Because CSS custom properties cannot be directly transitioned, the implementation uses a layered approach:

**Strategy: Background layer cross-fade**

```css
.app::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  opacity: 0;
  transition: opacity 3000ms var(--ease-out);
}

.app.season-transitioning::after {
  opacity: 1;
}
```

**JS implementation:**

```js
function transitionSeason(newSeason) {
  const root = document.documentElement;
  const app = document.querySelector('.app');

  // Step 1: Add transitioning class (triggers CSS transition on tinted overlay)
  app.classList.add('season-transitioning');

  // Step 2: After 1500ms (midpoint), swap the data-season attribute
  setTimeout(() => {
    root.setAttribute('data-season', newSeason);
  }, 1500);

  // Step 3: After 3000ms, remove transitioning class
  setTimeout(() => {
    app.classList.remove('season-transitioning');
  }, 3000);
}
```

### 9.3 Elements That Change Per Season

| Element | Spring | Summer | Fall | Winter |
|---------|--------|--------|------|--------|
| Body background gradient | Cool brown-green | Warm brown-tan | Dry amber-brown | Slate gray |
| Board frame border | Earthy mid-brown | Hot dark brown | Rust brown | Dull gray-brown |
| Panel background tint | Cool cream | Warm cream | Amber cream | Slate cream |
| Cell soil texture base | Damp dark | Sun-bleached light | Dry medium | Frozen gray |
| Header gradient text | Green to olive | Green to gold | Olive to rust | Gray-green to amber |

### 9.4 Reduced Motion Fallback

With `prefers-reduced-motion: reduce`, the season swap is instant: no overlay fade, `data-season` attribute updates immediately, all colors snap to new values.

---

## 10. PRINT / EXPORT

### 10.1 Print Stylesheet

```css
@media print {
  /* Hide interactive elements */
  .controls,
  .btn-row,
  .event-log,
  .challenge-strip,
  #toast,
  #tooltip,
  .overlay,
  .sim-overlay,
  button,
  select { display: none !important; }

  /* Reset backgrounds for ink efficiency */
  body {
    background: white !important;
    color: #1a1a1a !important;
  }

  .app {
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
  }

  .panel {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    break-inside: avoid;
    margin-bottom: 12px;
  }

  /* Board prints inline */
  .board {
    background: #f0f0f0 !important;
    border: 1px solid #999 !important;
    gap: 3px;
  }

  .cell {
    background: #fafafa !important;
    border: 1px solid #bbb !important;
    min-height: 40px;
  }

  .cell.good { background: #e8f5e8 !important; }
  .cell.warn { background: #fdf4e4 !important; }
  .cell.hard { background: #fce8e8 !important; }

  /* Score ring prints as static */
  .ring-fill {
    transition: none !important;
  }

  /* Violations print fully expanded */
  .violation-list {
    max-height: none !important;
    overflow: visible !important;
  }

  .history-list {
    max-height: none !important;
    overflow: visible !important;
  }

  /* Page title */
  h1::after {
    content: " — Season Recap";
    font-weight: 400;
    font-size: 0.6em;
  }
}
```

### 10.2 Export Recap Card (Shareable Portrait)

The export function generates a standalone recap image via canvas rendering or a dedicated recap HTML view.

**Recap card dimensions:** 1080x1350px (4:5 portrait, optimized for social sharing)

**Layout:**

```
┌──────────────────────────────────┐
│  GARDEN OS — SEASON RECAP        │  64px header
│  Season: Summer · Score: 7.4/10  │
├──────────────────────────────────┤
│                                  │
│     ┌─────────────────────┐      │
│     │   8x4 BOARD RENDER  │      │  Board: ~800px wide
│     │   (cells with emoji) │      │
│     └─────────────────────┘      │
│                                  │
├──────────────────────────────────┤
│  Grade: B — Competent            │  Score section: 200px
│  ██████████░░░ Sun: 4.2          │
│  █████████████ Support: 4.8      │
│  ████████░░░░░ Shade: 3.1        │  Factor bars
│  ██████████░░░ Access: 4.0       │
│  █████████████ Season: 4.9       │
│  ████████░░░░░ Adjacency: 3.4    │
├──────────────────────────────────┤
│  Narrator: "Garden GURL: ..."    │  Narrator: 120px
│  Hard: 2 · Advisory: 5 · Buff: 3│
├──────────────────────────────────┤
│  gardenOS · date · #GardenOS     │  Footer: 48px
└──────────────────────────────────┘
```

**Export implementation:**

```js
function exportRecap(result) {
  const recap = document.createElement('div');
  recap.className = 'recap-card';
  recap.innerHTML = buildRecapHTML(result);
  document.body.appendChild(recap);

  // Option A: html2canvas (if acceptable dependency)
  // Option B: Manual canvas draw from DOM data
  // Option C: Open recap as printable standalone page

  // For offline-capable single file: render as a printable overlay
  window.print(); // Uses @media print styles
}
```

**Recap card CSS (for on-screen preview before export):**

```css
.recap-card {
  width: 540px;
  max-width: 96vw;
  margin: 0 auto;
  background: var(--sf-panel);
  border: 1px solid var(--sf-line);
  border-radius: 14px;
  padding: 20px;
  font-family: var(--ff-body);
  color: var(--sf-ink);
}

.recap-card .recap-header {
  font-family: var(--ff-heading);
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--sf-line);
}

.recap-card .recap-board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
  margin: 12px 0;
  background: var(--s-ground-mid);
  padding: 6px;
  border-radius: 8px;
}

.recap-card .recap-cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 4px;
  font-size: 1rem;
  background: var(--sf-panel-2);
  border: 1px solid var(--sf-line);
}

.recap-card .recap-footer {
  font-size: 0.72rem;
  color: var(--sf-muted);
  text-align: center;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--sf-line);
}
```

---

## APPENDIX A: Z-INDEX MAP

| Layer | z-index | Elements |
|-------|---------|----------|
| Background texture | -1 | `body::before` dot pattern |
| Content | 1 | All panels, board, results |
| Board overlays | 2 | Companion thread SVG lines (future) |
| Status bar | 40 | Bottom status readout |
| Challenge modal overlay | 50 | `.overlay` backdrop |
| Event card overlay | 60 | `.event-card-overlay` |
| Tooltip | 500 | `#tooltip` |
| Sim overlay | 800 | `#sim-overlay` |
| Toast | 900 | `#toast` |

---

## APPENDIX B: ACCESSIBILITY CHECKLIST

| Requirement | Implementation |
|-------------|---------------|
| WCAG AA contrast (4.5:1 body, 3:1 large) | All `--sf-ink` on `--sf-panel` combinations verified. Semantic colors on their bg variants verified. Score colors on white/cream verified. |
| 44px touch targets | All buttons: `min-height: 44px`. Crop buttons: full-width with min-height. Grid cells: `min-height: 56px` at smallest breakpoint. |
| Keyboard navigation | Grid cells navigable via arrow keys. Tab order: crop panel -> season select -> action buttons -> board -> results. Focus visible: `2px solid var(--sem-focus)`, 2px offset. |
| Screen reader | `role="grid"` on board, `role="listbox"` on crop selector, `aria-live="polite"` on narrator and status text, `aria-modal="true"` on dialogs, `aria-label` on all sections. |
| Reduced motion | Global rule disables all animation/transition. JS checks `prefersReducedMotion()` before choreographed sequences. |
| Focus trap | Modal dialogs trap Tab key within focusable children. Escape key closes. Focus restores to trigger element on close. |

---

## APPENDIX C: CSS CUSTOM PROPERTY REFERENCE

Complete list of all custom properties, organized for a developer implementing the `<style>` block:

```css
:root {
  /* ── Typography ──────────────────────── */
  --ff-heading:     'Fraunces', 'Palatino Linotype', Georgia, serif;
  --ff-body:        'DM Sans', 'Segoe UI', system-ui, sans-serif;
  --ff-mono:        'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  /* ── Easing ──────────────────────────── */
  --ease-expo-out:  cubic-bezier(0.16, 1, 0.3, 1);
  --ease-expo-in:   cubic-bezier(0.7, 0, 0.84, 0);
  --ease-out:       cubic-bezier(0.33, 1, 0.68, 1);
  --ease-back-out:  cubic-bezier(0.2, 0.9, 0.2, 1.2);

  /* ── Layout ──────────────────────────── */
  --radius:         16px;
  --shadow:         0 16px 36px rgba(0, 0, 0, 0.26);

  /* ── Surfaces ────────────────────────── */
  --sf-bg:          #2a1c10;
  --sf-panel:       #f5ecdc;
  --sf-panel-2:     #efe3cd;
  --sf-card:        color-mix(in srgb, #f5ecdc 89%, #fff 11%);
  --sf-field:       color-mix(in srgb, #f5ecdc 84%, #dfc9a5 16%);
  --sf-overlay:     rgba(44, 31, 20, 0.72);
  --sf-ink:         #22150b;
  --sf-muted:       #5a4834;
  --sf-line:        #c5ab86;

  /* ── Semantic ────────────────────────── */
  --sem-good:       #3e9d63;
  --sem-good-bg:    #e1f2e5;
  --sem-warn:       #c78623;
  --sem-warn-bg:    #f5ead8;
  --sem-hard:       #c24d4d;
  --sem-hard-bg:    #f5dddd;
  --sem-companion:  #bb6bd9;
  --sem-companion-bg: rgba(187, 107, 217, 0.12);
  --sem-focus:      #2f73a8;

  /* ── Characters ──────────────────────── */
  --char-gurl:      #5f8f45;
  --char-gurl-bg:   #e4f0dc;
  --char-onion:     #c98d22;
  --char-onion-bg:  #f5ead0;

  /* ── Seasonal (default: spring) ──────── */
  --s-ground-deep:  #3e2a14;
  --s-ground-mid:   #5c3d1e;
  --s-ground-light: #8b7355;
  --s-growth-primary: #6b9a5b;
  --s-growth-accent:  #a3c78a;
  --s-growth-muted:   #7a8b6e;
  --s-sky-wash:     #c8cfc2;
  --s-sky-light:    #dde3d6;
  --s-sky-highlight:#e8eddf;
}
```

---

*End of specification. A developer implements this file as a single `<style>` block and vanilla JS within one HTML document. No external dependencies beyond Google Fonts. All persistence via localStorage. All animations respect `prefers-reduced-motion`. All colors support `prefers-color-scheme: dark`.*

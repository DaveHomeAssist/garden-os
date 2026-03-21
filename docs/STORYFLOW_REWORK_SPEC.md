# Garden OS — Storyflow & Dialogue Rework Spec

Generated: 2026-03-21
Source: Playtesting analysis of cutscene-machine.js, cutscenes.js, speakers.js

---

## Core Rule

- **UI explains mechanics.** Event cards, tooltips, objective strip.
- **Cutscenes express mood, consequence, memory, and character.**
- **Reactive dialogue should be specific to what happened, not just that something happened.**

---

## Current Problems

1. Event dialogue is over-generic (event-negative, event-positive, event-drawn-generic)
2. Seasonal identity is weak in reactive moments
3. GURL explains too much, Critters interrupt too often, Onion Man underused, Vegeman is spice not countervoice
4. Mechanical explanation mixed with narrative flavor
5. Trigger conditions key on trigger+valence, not event family/season/severity

---

## Character Use Plan

| Character | Primary role | Use for | Reduce in |
|-----------|-------------|---------|-----------|
| Garden GURL | Standards, pattern recognition, consequences | Structural assessments, compliance, scoring context | Generic event warnings |
| Critters | Pressure, world pushback, vulnerability | Pests, chaos, exposure, mockery | Default pairing with GURL |
| Onion Man | Memory, heart, continuity | Fall/winter, recipes, recovery, neighborhood, carry-forward | (increase usage) |
| Vegeman | Chaos, overconfidence, bad impulses | Summer, full-bed pressure, bravado, dense planting | (increase usage) |

## Seasonal Speaker Matrix

| Season | Primary speakers | Tone |
|--------|-----------------|------|
| Spring | GURL + Onion Man | Fresh start, standards + permission |
| Summer | Critters + Vegeman + GURL | Heat, pressure, bravado, chaos |
| Fall | Onion Man + GURL | Memory, harvest weight, reflection |
| Winter | Onion Man solo, minimal Critters | Stillness, record, carry-forward |

---

## Event Family Structure (replaces generic fallbacks)

| Family | Events | Primary speaker |
|--------|--------|----------------|
| weather-negative | Frost, heat dome, storm, drought | GURL (assessment) |
| weather-positive | Rain streak, mild week | Onion Man (relief) |
| pest-negative | Hornworm, slugs, cabbage moth, aphids | Critters (report) |
| pest-mixed | Beneficial insects, pest-repellent companion | Critters + GURL |
| neighbor-positive | Compost gift, seed swap, block party | Onion Man (community) |
| neighbor-negative | Foot traffic, cat patrol, stolen harvest | Critters (intrusion) |
| memory-neutral | Mom's trowel, seedling lineage, photo | Onion Man (memory) |
| infrastructure | Compaction, enrichment, trellis stress | GURL (structural) |
| windfall | Lucky break, bonus yield, surprise growth | Vegeman (enthusiasm) |

---

## Intervention Reaction Rules

- One line max in most cases
- Only fire when: first-time, high-stakes, or notable
- Never restate what the UI already shows
- Example good: "That mulch will matter in three weeks."
- Example bad: "You used your intervention token to mulch one cell."

---

## Harvest Reaction Rules

- Grade-based structure stays
- Add season + chapter seasoning
- A `B` in summer ≠ a `B` in fall
- Fall harvests reference what grew vs what was promised
- Spring harvests reference what survived the learning curve

---

## Priority Order

1. Event reaction restructure (replace generic fallbacks with families)
2. Seasonal speaker distribution
3. Remove redundant mechanic-explainer lines
4. Harvest/transition specificity
5. Final prose polish

---

## Implementation Notes

- Structure first, then prose
- cutscenes.js is the primary data file
- cutscene-machine.js selects highest-priority eligible scene — no changes needed to the machine
- speakers.js role definitions are correct — no changes needed
- chapter-text.js emotional arc is strong — no changes needed

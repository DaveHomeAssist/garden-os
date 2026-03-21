# Story Mode Dialogue & Storyflow Rework Spec

Status: proposed  
Scope: `story-mode` narrative pacing, reactive dialogue structure, speaker distribution, cutscene authoring rules  
Primary runtime file affected later: [cutscenes.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/data/cutscenes.js)

## Purpose

The current `story-mode` dialogue system has good character foundations but weak reactive variety. The biggest problem is structural repetition, especially in event reactions. This spec defines how to rework storyflow and dialogue so:

- seasons feel different from each other
- speakers have clearer jobs
- dialogue stops repeating UI information
- reactive beats feel specific to what happened
- chapter arc and gameplay arc reinforce each other

This is a content-structure spec, not a prose-only polish pass.

## Current Diagnosis

### Strengths

- Chapter intros already carry a coherent three-year arc.
- Speaker roles are distinct at the concept level.
- Trigger-based cutscene routing is clean enough to support richer content.
- Harvest and campaign-complete moments already have stronger emotional weight than most mid-season reactions.

### Current Failures

1. Event reactions are too generic.
- `event-drawn-generic` and `event-negative` carry too much of the reactive load.
- Different events often collapse into the same dramatic shape.

2. Speaker pairing is repetitive.
- `Garden GURL -> Critters` and `Critters -> Garden GURL` recur too often.
- This makes seasons feel flatter than the chapter intros suggest.

3. Dialogue often duplicates UI.
- Event cards, helper text, targeting highlights, and score breakdown already explain mechanics.
- Dialogue should not repeat “you have one intervention” or “pay attention to the warning” unless the line adds something new.

4. Seasonal identity is weak during live play.
- Intros differ by season.
- Reactive dialogue does not differ enough by season.

5. Triggers are under-specific.
- Most event reactions key off `event_drawn` plus broad `valence`.
- They do not distinguish weather vs pests vs neighborhood vs memory vs carry-forward pressure.

## Narrative Design Rules

### Rule 1: UI explains mechanics, dialogue explains meaning

Use UI for:
- what the event does
- what the player can do
- which cells are affected
- what score changed

Use dialogue for:
- mood
- consequence
- memory
- tension
- character point of view

### Rule 2: One speaker by default

Reactive beats should be single-speaker unless contrast is the point.

Use two-speaker beats only when they provide:
- disagreement
- emotional contrast
- tutorial + emotional framing together
- payoff after a major result

### Rule 3: Seasonal identity must be audible

Reactive content should sound different in:
- spring: possibility, caution, reopening
- summer: pressure, density, pests, heat, overreach
- fall: payoff, scarcity, preservation, seriousness
- winter: memory, review, inheritance, quiet

### Rule 4: Critters are not the default warning system

Critters should be used mainly for:
- pest pressure
- mockery
- opportunism
- ecological chaos

Critters should not be the all-purpose narrator for every bad event.

### Rule 5: Garden GURL should diagnose, not narrate everything

Garden GURL is strongest when:
- identifying patterns
- naming tradeoffs
- framing standards
- recognizing competence or failure precisely

She should not be the default generic warning voice.

## Speaker Role Matrix

### Garden GURL

Use for:
- standards
- structure
- consequences
- pattern recognition
- precision praise

Avoid overusing for:
- generic event warnings
- repeating button/UI instructions

### Onion Man

Use for:
- memory
- continuity
- neighborhood context
- recipes
- emotional framing
- quiet recovery after bad harvests

Increase usage in:
- fall
- winter
- chapter transitions

### Vegeman

Use for:
- bravado
- overcommitment
- density/full-bed energy
- comic pressure
- reckless confidence

Best chapters:
- 2
- 6
- 9
- 10

### Critters

Use for:
- pests
- exposure
- conflict
- ecosystem pushback
- dark humor

Reduce usage in:
- winter
- positive events
- generic non-pest warnings

## New Reactive Storyflow Model

### 1. Chapter Start

Keep authored intros.

Requirement:
- every chapter intro must establish one of:
  - season mood
  - chapter mechanic
  - arc progression

### 2. Event Drawn

Replace broad fallback-first routing with event-family routing.

Required event families:
- `weather_negative`
- `weather_positive`
- `pest_negative`
- `neighborhood_positive`
- `neighborhood_negative`
- `memory_neutral`
- `carry_forward_warning`

Each family should then have seasonal variants where needed.

Example:
- `event-weather-negative-summer`
- `event-weather-negative-fall`
- `event-pest-negative-summer`

### 3. Intervention Used

Keep short.

Rules:
- usually one beat only
- max one line in most cases
- only use two lines when the choice changes emotional framing

### 4. Harvest Complete

Keep grade-based structure, but add seasonal/chapter seasoning.

Requirement:
- a `B` in summer should not feel identical to a `B` in fall
- recipe-related chapters should bias toward pantry/legacy framing

### 5. Chapter Complete

This is where long-arc continuity should live.

Use for:
- “what changed in you”
- “what changed in the bed”
- transition into next seasonal tone

Avoid generic “next chapter” filler unless it is a fallback.

## Required Content Changes

### Replace these current generic scenes

High priority replacements in [cutscenes.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/data/cutscenes.js):

- `event-drawn-generic`
- `event-negative`
- `event-positive`
- `chapter-generic-intro`
- `chapter-complete`

These should remain only as true fallbacks after family/season-specific scenes exist.

### Add event-family conditions

The trigger payload for `event_drawn` should be expanded later to include at minimum:

- `season`
- `valence`
- `eventFamily`
- `severity`
- `carryForward`

Optional later additions:

- `targetFamily`
- `affectedCount`
- `chapter`

### Add harvest context conditions

The trigger payload for `harvest_complete` should later include:

- `season`
- `chapter`
- `grade`
- `recipeMatchCount`
- `highDamageSeason`

## Seasonal Speaker Distribution Targets

### Spring

Primary voices:
- Garden GURL
- Onion Man

Secondary:
- Critters rarely
- Vegeman lightly

### Summer

Primary voices:
- Critters
- Vegeman
- Garden GURL

Secondary:
- Onion Man as relief or grounding

### Fall

Primary voices:
- Onion Man
- Garden GURL

Secondary:
- Critters only when pest pressure is specific

### Winter

Primary voices:
- Onion Man
- Narrator
- Garden GURL sparingly

Critters:
- nearly absent

## Authoring Rules

1. Do not restate obvious UI facts.
- bad: “Use your intervention wisely. You only get one per beat.”
- better: “This one will linger if you let it in.”

2. Every reactive line must answer one of:
- what changed emotionally?
- what changed materially?
- what does this say about the bed?
- what does this say about the player?

3. Avoid repeated dramatic shapes.
- do not default to `warning -> snark reply`

4. Reserve longer exchanges for:
- chapter intros
- chapter complete
- major harvests
- recipe unlocks
- campaign complete

5. If a line could be deleted without changing the scene, delete it.

## Implementation Plan

### Pass 1: Structural rewrite

- classify all current cutscenes by function
- replace generic event scenes with event-family scenes
- reduce two-speaker event defaults
- rebalance speaker presence by season

Deliverable:
- new cutscene data structure in `cutscenes.js`

### Pass 2: Trigger enrichment

- extend trigger payloads in runtime to include event family and severity
- add chapter/season context where missing

Deliverable:
- cutscene selection can target more than `valence`

### Pass 3: Prose polish

- tighten lines
- remove redundant explanation
- improve transitions and harvest specificity

Deliverable:
- final authored text pass

## Acceptance Criteria

The rework is successful when:

- no single generic event scene dominates the play experience
- Critters are no longer the default partner to Garden GURL in most seasons
- reactive dialogue varies audibly by season
- event dialogue no longer repeats what the UI already says
- chapter-complete scenes feel like progression, not placeholders
- players can describe each speaker’s role after a short session

## Immediate Next Step

Start with a rewrite of [cutscenes.js](/Users/daverobertson/Desktop/Code/10-active-projects/garden-os/story-mode/src/data/cutscenes.js), not a line polish pass. Structural variety will produce bigger gains than better wording on the same repetitive pattern.

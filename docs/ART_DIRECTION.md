# GARDEN OS — Art Direction Plan

**Internal Documentation — v1.0**

---

## 1. Art Pillars

**Pillar 1: Worn Surface, Living Line**
Every visual element should feel like it exists on a physical surface that has been used. Not pristine, not ruined — *worn in*. Think the texture of a stained seed packet, a sun-bleached Phillies pennant, a garden journal with dirt smudges on the margins. Lines should feel hand-committed — confident ink with occasional imperfection, not sketchy-on-purpose, not vector-clean.

**Pillar 2: Philly Grit as Aesthetic Layer**
Philadelphia is not a cozy city. It is a city of brick rowhouses with crumbling mortar, hand-painted corner store signs, utility poles with stapled flyers, and concrete that cracks so weeds can push through. The raised bed exists in a real backyard — chain-link fence visible, maybe an alley, maybe a neighbor's AC unit humming. The beauty of the garden is *because* of the grit around it, not in spite of it.

**Pillar 3: Seasonal Honesty**
Seasons are not costumes draped over a static world. They are structural shifts in light, palette, atmosphere, and mood. July should feel like it could give you heatstroke. February should make you question why you're doing this at all. The seasons are the emotional architecture of the game.

**Pillar 4: Authored, Not Algorithmic**
Every composition should feel like a specific person made a specific choice. Asymmetric layouts. Odd crops. A willingness to let negative space breathe or to crowd a frame with overlapping leaves. The game should look like someone's visual journal of a year in their garden.

---

## 2. Color Logic by Season

Color is organized into three concurrent layers: **Ground** (soil, hardscape, built environment), **Growth** (plant life, produce), and **Sky** (atmospheric light, weather). Each season shifts these layers independently.

### Early Spring
- **Ground:** Cold brown-grey. Wet concrete tones. Cedar dark with moisture.
- **Growth:** Almost nothing. Pale chartreuse at edges — emerging shoots. Seed packet colors (printed, artificial) provide the only saturated hues.
- **Sky:** Pewter. Thin white. Occasional pale blue that feels unconvincing.

### Late Spring
- **Ground:** Warming. Soil reads as actual brown. Brick picks up warmth.
- **Growth:** Yellow-green, new and electric. First blooms in specific, non-pastel colors: true purple of eggplant flowers, sharp yellow of tomato blossoms.
- **Sky:** Higher contrast. Clouds with dimension. Directional light arrives.

### Summer
- **Ground:** Baked. Cedar pale and dry. Concrete bright and punishing.
- **Growth:** Full, heavy green — dark, almost blue-green in shadow. Fruit and vegetable colors at maximum saturation: tomato red that is genuinely aggressive, pepper green almost black.
- **Sky:** Washed out. Philly summer sky is hazy, white-hot, humid. Light from everywhere, short hard shadows.

### Late Summer / Early Fall
- **Ground:** Dust. Tired surfaces. Most sun-bleached wood.
- **Growth:** The palette fractures. Some plants still green, others yellowing, others producing final harvests in amber and deep red. Most *complex* palette.
- **Sky:** Golden hour stretches. Horizontal warm light. Shadows lengthen and soften.

### Fall
- **Ground:** Leaves on concrete. Wet brick. Bed looks skeletal as plants are pulled.
- **Growth:** Brown stalks, collapsed vines, geometry of bare plant structure. Cover crop green is muted and flat.
- **Sky:** Low, dramatic. Philly fall light is cinematic — sharp horizontals, long shadows.

### Winter
- **Ground:** Frozen or muddy. Bed under cover reads as geometric shape — grave or cocoon.
- **Growth:** None. Seed catalogs provide color — printed, interior, artificial warmth.
- **Sky:** Early dark. Blue-grey to deep indigo. Street light sodium-orange at scene edges.

---

## 3. Texture Language

### Primary Material Vocabulary

- **Cedar plank grain** — the raised bed. Three seasonal variants minimum (wet/fresh, dry/bleached, frosted). Most-seen texture in the game.
- **Garden soil** — not uniform brown. Dark when wet with visible organic matter. Lighter and cracked when dry. Should feel like it has *weight*.
- **Concrete and asphalt** — cracked, patched, stained. Old paint marks. Philly's native surface.
- **Brick** — always visible in background. South Philly brick: mismatched repairs, painted-over sections, mortar in various states of decay.
- **Printed paper** — seed packets, journals, clipboards. Slightly off-white, visible fiber, ink that sits on top of surface. Risograph-adjacent feel.
- **Rusted and weathered metal** — chain-link, tool heads, tomato cages, neighbor's AC bracket. Functional rust. Things still in use.

### Application Rules
1. Characters sit *on top* of textured environments. Their ink lines maintain drawn quality against the rendered world.
2. UI elements use printed paper texture as native surface.
3. Event cards use heavier paper stock texture — like a postcard or baseball card.
4. No smooth gradients. Value transitions through layered washes, dry brush, or halftone.

---

## 4. Character Rendering Style

### Line Quality
Confident, variable-weight ink line. Not uniform vector. Not wobbly affectation. Weight varies with pressure: heavier on shadow side, lighter on edges catching light.

### Color Fill
Flat-ish color with subtle surface variation — pigment on slightly rough paper. Shadow through a *second flat tone*, not gradient. Maximum three value steps per area: light, mid, shadow.

### Character-Specific Notes

**Onion Man:** Warm parchment-yellow skin. Translucent quality at onion-layer edges. Tears are the one place we allow rendered shine. Phillies cap is correct red, slightly faded. Get the logo right. Expressiveness from eyes and posture, not squash-and-stretch.

**Garden GURL:** Most composed visual presence. Cleanest, most deliberate lines. Clipboard and wide-brimmed hat are defining silhouette elements. Hat casts shadow across upper face — quiet authority. Muted earth tones with one deliberate accent. She is the visual *anchor*.

**Vegeman:** Rendering loosens. Lines more energetic, thicker. Muscular veggie-hybrid anatomy drawn with superhero confidence — humor in the commitment, not sloppiness. Higher saturation than other characters. Loudest visual element. Breaks frame edges, overlaps elements, slightly too large for his space.

**Garden Critters:** Rendered more simply. Fewer line details, smaller scale, but *not cute*. Aphids look like aphids. Hornworms are genuinely unpleasant. Weather-as-critter is abstract — texture and pattern, not full character rendering. Collectively feel like a *swarm* — visual repetition with slight variation.

---

## 5. UI Integration Style

### Core Principle
The UI is a **garden journal that the characters inhabit**. Not a transparent HUD. A paper surface with its own materiality.

### Layout
- Garden bed occupies 60-70% of screen, slightly elevated three-quarter angle
- UI panels border the garden as physical objects: clipboard, seed packet tray, weathered almanac page
- Characters in two modes: portrait insets (like baseball cards) and in-world presence (full art, casting shadows)

### Character-UI Rules
1. Onion Man's dialogue in thought bubbles rendered on paper — *drawn* bubbles, not floating UI
2. Garden GURL's clipboard *is* the stats panel. Her portrait in the header. Flipping pages navigates views.
3. Vegeman breaks the UI boundary. Arm reaches across panels. Portrait too large for frame. Deliberate visual gag.
4. Critters appear as marginalia — small drawings in edges and gutters. When active threats, they "spill" from margins into garden view.

### Typography
- **Headers:** Hand-lettered display face. Comic book titling quality — controlled and clear.
- **Body:** Clean, slightly warm sans-serif. Zine or small-press field guide feel.
- **Numbers:** Monospaced or tabular from same warm family. Journal notes, not spreadsheet.

---

## 6. Balancing Cartoon Characters with Grounded Environment

### The Rule of Coexistence
Characters are *drawn*. The environment is *observed*. Two visual modes sharing a frame. Neither apologizes for the other.

**The environment** is rendered with the fidelity of a plein air study. Painterly. Observed light, real color, textural honesty.

**The characters** maintain ink-line identity regardless of lighting. They are *lit* by the scene (shadow tones shift seasonally), but not *rendered* into it. Graphically distinct.

**The junction** — where character meets ground — is handled through:
- Cast shadows matching scene light direction (drawn, not rendered)
- Color temperature influence from environment on shadow tones
- Physical interaction evidence: dirt on hands matches actual soil color
- No glow, stroke, or halo outlines. They simply *exist* through confident drawing.

---

## 7. Avoiding Children's Game Energy

### What Creates It
- Round, soft, bouncy shapes with no hard edges
- High-saturation pastels as dominant palette
- Large heads, small bodies, permanent smiles
- Clean smooth surfaces with no wear
- Symmetrical centered compositions
- Reward sparkles and particle celebrations
- Rounded candy-colored UI buttons

### Our Counter-Moves

**Shape:** Angular and organic, not round and geometric. The bed is a rectangle. The grid is a grid. Onion Man is teardrop-shaped (pointed, not round). Vegeman is built like a linebacker.

**Color:** Earned, not given. Palette starts cold and grey. Full-saturation tomato red of August is a *reward* the palette builds toward for seven chapters.

**Faces:** Actual emotional range. Onion Man is watery-eyed and slightly embarrassed. GURL's composure is genuine competence. Vegeman's intensity is slightly alarming.

**Environment:** Signals adult space. A beer can on the back step. Neighbor's radio. Extension cords, mismatched furniture, a grill cover.

**Strategic desaturation:** 60%+ of screen in muted tones at any moment. Saturated color reserved for produce, character accents, and event cards.

**Composition:** Asymmetric layouts, tight crops cutting off character extremities, negative space that feels *considered*.

---

## 8. Making Screenshots Instantly Recognizable

### Recognition Stack (fastest to slowest read)

**Layer 1 — Color Signature (0.1s):** Muted urban grit + specific agricultural saturation. No other game combines concrete grey, brick red-brown, and aggressive tomato-plant green-red in this ratio.

**Layer 2 — Texture Density (0.3s):** Notably more surface information than most indie games. Grain, fiber, rust, soil. Reads as tactile at thumbnail scale.

**Layer 3 — Character Silhouettes (0.5s):** Onion Man's teardrop + Phillies cap. GURL's hat brim. Vegeman's muscular absurdity. Must be identifiable at 100px height.

**Layer 4 — The Grid (0.5s):** The 8x4 bed creates visual rhythm specific to this game. Always visible, always structured.

**Layer 5 — The Philadelphia Frame (1s):** Chain-link. Brick. Concrete. Every screenshot includes at least a sliver of urban surround.

### Screenshot Rules
1. Never crop out urban context entirely
2. At least one character visible in promotional screenshots
3. Raised bed at least partially visible
4. Show seasonal extremes: dead grey of March, explosive green of July, melancholy amber of October
5. At least one screenshot per set features the UI (communicates strategy game)

---

## 9. Three Visual Directions

### Direction A: "Almanac"
The entire game framed as a found object — a vintage gardening almanac drawn in, annotated, lived with. UI is literally book pages. Garden view is an illustration plate.

**Pros:** Extremely strong identity. Paper texture unifies all assets. Print-ready. High screenshot recognition. Inherently avoids children's game energy.

**Cons:** Risk of feeling static. Animation within book-page frame needs careful handling. May read as "book game" to some audiences.

### Direction B: "Backyard Realism"
Full painterly realism for environment. Drawn ink-line characters placed *into* realistic space. Minimal semi-transparent UI.

**Pros:** Realistic Philly backyard is powerful differentiator. Drawn-in-painted-world tension is striking. Seasonal shifts maximally impactful. Strong trailer potential.

**Cons:** Highest production cost. Character/environment rendering gap is a tightrope. Risk of looking "serious" in a way that undersells humor.

### Direction C: "Zine Press"
Everything rendered as small-run print shop output. Risograph color logic — limited ink layers, visible halftone, slight registration misalignment. Heavy ink outlines on everything. DIY, authored, unmistakably indie.

**Pros:** Extraordinarily distinctive. Characters and environments share one rendering logic. Naturally Philadelphian — aesthetic is *from* Philly's art community. Scales across all asset types. Strong awards potential. Streamlined pipeline once built.

**Cons:** Audience risk if halftone is hard to read at small sizes. Lo-fi could be misread as "unfinished." Readability of 8x4 grid needs careful UX testing. Environmental atmosphere harder through print filter.

---

## 10. Recommended Direction

### Direction C: "Zine Press" — with selective borrowing from A and B.

**Why this wins:**

**Awards.** The most visually literate, formally inventive, and connected to a real artistic tradition (printmaking). IGF, IndieCade, BAFTA juries reward authored vision. A risograph-language game about a South Philly garden is a *statement*.

**Trailers.** Print aesthetic creates shareable, scroll-stopping imagery. Transitions use print mechanics: ink layers peeling apart, registration shifting for season change, colors separating and recombining.

**Store presence.** On Steam or eShop, capsule art looks like nothing around it. Bold ink, limited palette, visible print texture, hand-lettered typography. Reads as *art object* rather than *game product*.

### Selective Borrowing

**From A (Almanac):** Journal/almanac UI metaphor for clipboard and info panels. Chapter title cards as almanac headers. Narrative structure gets almanac treatment; visual rendering gets zine press treatment.

**From B (Backyard Realism):** Insistence on specific observed Philadelphia detail. Brick patterns, concrete cracks, chain-link geometry, Philly light quality — drawn from life, rendered through print filter. Send artists to South Philly with sketchbooks.

### Implementation Priorities

1. **Print simulation pipeline first.** Ink-layer separation, halftone generation, registration-drift systems before final assets.
2. **Seasonal color separations.** Each season gets 4-5 defined ink colors (like screen print plates). Constraint is a feature.
3. **Character art integration testing.** Existing hand-drawn art tested within print simulation.
4. **Screenshot validation.** 5-6 mock screenshots tested at Steam capsule, Twitter card, and phone-screen sizes.
5. **Trailer storyboard.** Print-mechanic transition language developed before animation begins.

---

### Final Note

The goal is a game that looks like it was made by people who garden in South Philly and make art in South Philly — because it was. The visual identity is not a skin applied to a game. It is the game's argument made visible: that beauty is specific, that labor is meaningful, that a 4x8 cedar box of dirt in a cracked concrete backyard is worth your sustained attention.

The art direction should make that argument before the player reads a single word.

# Garden OS: Seasonal Event System

> Internal game documentation. 40 event cards across four seasons, categorized by type and valence.
> Every event creates a real mechanical tradeoff. Nothing magical. Nothing apocalyptic. Just a South Philly backyard doing what it does.

---

## How Events Work in the Loop

Events fire during the season phase (early / mid / late beats). Each season draws 2-3 events from a weighted seasonal pool. Events are revealed one at a time. After each event resolves, the player gets one intervention token.

Events modify gameplay through five mechanical channels:

| Channel | What It Does | Example |
|---------|-------------|---------|
| **Cell penalty** | Reduces score on specific cells by type, position, or faction | Heatwave: all cool-season crops lose 1.5 points |
| **Cell buff** | Increases score on specific cells by type, position, or faction | Steady rain week: all root-faction crops gain 0.5 |
| **Zone lockout** | Temporarily removes a row or column from intervention access | Neighbor's fence repair blocks access to row 0 for one beat |
| **Resource cost** | Consumes the player's intervention token automatically | Groundhog requires immediate response; no spare token this beat |
| **Carry-forward** | Modifies a condition that persists into the next beat or next season | Compacted soil from foot traffic: front row access score reduced next season |

Events never destroy the entire bed. They stress specific zones, factions, or positions. The player always has at least one cell worth protecting and at least one decision to make.

---

## Event Categories

| Category | Source | Frequency | Tone |
|----------|--------|-----------|------|
| **Weather** | Heat, rain, frost, wind, humidity | 1-2 per season | Impersonal. The sky does not care about your plans. |
| **Critter** | Insects, rabbits, squirrels, cats, birds | 1 per season | Territorial. They were here first. |
| **Neighbor** | Adjacent rowhouses, shared fences, block life | 0-1 per season | Social. Not malicious, just inconvenient. |
| **Family** | Household obligations, visitors, schedules | 0-1 per season | Personal. The garden is not the only thing in your life. |
| **Infrastructure** | Trellis, soil, hose, cage, bed frame | 0-1 per season | Material. Things wear out. |

---

## Valence Types

| Valence | Count | Definition |
|---------|-------|------------|
| **Positive** | 8+ | Net benefit. Free buff, bonus, or resource. Still requires positioning to exploit. |
| **Negative** | 8+ | Net cost. Penalty, loss, or constraint. Requires triage. |
| **Mixed** | 8+ | Benefit and cost simultaneously. Forces a tradeoff. |

---

## The 40 Event Cards

### SPRING (Events S01–S10)

---

**S01: Late Frost Advisory**
- Category: Weather
- Valence: Negative
- Season window: Early spring
- Mechanic: All cool-season crops in rows 2-3 (front, exposed) lose 1.0 point. Crops in rows 0-1 (back, near wall/fence) are sheltered and unaffected.
- Intervention option: Sacrifice one intervention token to "cover" two cells with row cover, negating the penalty on those cells.
- GURL: "The forecast was available. The front row was not prepared."
- Onion Man: "Every year. Every single year I think we are past this. We are never past this."
- Vegeman: "Quick, throw a bedsheet on it. That counts, right? My grandmother did that."
- Critters: "Frost on the tips. Soft leaves. Noted."

---

**S02: Surprise Warm Week**
- Category: Weather
- Valence: Positive
- Season window: Mid spring
- Mechanic: All heat-loving crops (tomato, pepper, basil, eggplant) gain 0.5 point this beat. Cool-season crops unaffected.
- No intervention required.
- GURL: "Unseasonable warmth. The warm-season crops are ahead of schedule. Do not get used to it."
- Onion Man: "This is the kind of week that makes you believe in things. I am trying not to overreact."
- Vegeman: "SEE? I said plant the tomatoes early. I said it. Nobody listened."
- Critters: "Warm soil. Things moving underground. Early season."

---

**S03: Neighbor's Tree Canopy Leafs Out**
- Category: Neighbor
- Valence: Negative
- Season window: Mid spring
- Mechanic: Column 0 (leftmost) loses 1 effective sun hour for the remainder of the season. Crops with high sun requirements in that column lose 0.5-1.0 points.
- Intervention option: Swap one crop from the shaded column to a sunnier position.
- GURL: "The neighbor's maple has opinions about your light exposure. It has had these opinions every April since before you were born."
- Onion Man: "That tree is beautiful and also it is stealing our sun. I have complicated feelings about this."
- Vegeman: "Can we trim it? Can we ask? Can we do something aggressive but legal?"
- Critters: "Shade pocket forming. Column zero. Adjusted."

---

**S04: Aphid Scouts**
- Category: Critter
- Valence: Negative
- Season window: Late spring
- Mechanic: The weakest-scoring cell in the bed gets targeted. That cell and its orthogonal neighbors each lose 0.5 points. If any of those cells contain herbs (basil, cilantro, dill), the penalty is halved — herbs function as partial repellent.
- Intervention option: Prune the affected cell (sacrifice its yield entirely) to prevent spread to neighbors.
- GURL: "Aphids found your most vulnerable position. They always do."
- Onion Man: "Not the basil. Please not the basil. Anything but the basil."
- Vegeman: "Blast them with the hose. Full pressure. They cannot handle the hose."
- Critters: "Weak stem. Soft new growth. We sent scouts. They reported back."

---

**S05: Block Cleanup Day**
- Category: Neighbor
- Valence: Mixed
- Season window: Early spring
- Mechanic: Front row (row 3) is inaccessible for one beat — neighbors have stacked trash bags and yard waste along the shared fence line. Any crops in row 3 that needed intervention this beat cannot receive it. However, the community goodwill generates a 0.3 point buff to all cells next beat (neighbors notice your garden, offer encouragement and a bag of compost).
- GURL: "Access to the front row is temporarily obstructed by civic participation. Inconvenient and technically admirable."
- Onion Man: "The block looks great. My row does not. But the block looks great."
- Vegeman: "Free compost? Take the compost. Always take the compost."
- Critters: "Front row blocked. Cannot reach. Cannot protect. Interesting."

---

**S06: Found Volunteer Tomato**
- Category: Infrastructure
- Valence: Positive
- Season window: Mid spring
- Mechanic: One empty cell (randomly selected, or the best-positioned empty cell if multiple exist) gets a free tomato plant. If no empty cells exist, the player chooses one cell to replace. The volunteer tomato has no planting cost and gets a 0.5 point "established root" bonus.
- GURL: "A volunteer emerged from last year's root zone. It has better positioning than half your intentional plants."
- Onion Man: "She just showed up. Like she was always supposed to be here. I am not crying. The wind changed."
- Vegeman: "Free tomato. FREE. TOMATO. This is the best day of the season."
- Critters: "Seed survived winter. Took root before you noticed. Respect."

---

**S07: Spring Rain Surplus**
- Category: Weather
- Valence: Mixed
- Season window: Late spring
- Mechanic: All crops with water need "high" gain 0.5 points. All crops with water need "low" lose 0.5 points. Root-faction crops in rows 2-3 (lower, wetter) gain 0.3 points. Herbs in rows 2-3 lose 0.3 points (soggy roots).
- GURL: "Sustained rain. Good for some. Catastrophic for others. That is how water works."
- Onion Man: "The rain sounds nice on the tarp. The basil does not think it sounds nice."
- Vegeman: "Rain means we do not have to water. That is a win. I refuse to see a downside."
- Critters: "Damp soil. Slugs mobilizing. Rows two and three."

---

**S08: Phillies Home Opener**
- Category: Family
- Valence: Mixed
- Season window: Early spring
- Mechanic: The player loses one intervention token (too distracted by the game to tend the bed). However, the emotional energy of Opening Day generates a 0.5 point "morale buff" on the three highest-scoring cells — you came back from the game fired up and gave your best plants extra attention.
- GURL: "One intervention lost to a baseball game. The bed does not care about the National League."
- Onion Man: "Listen. Opening Day is sacred. The garden understands. The garden has to understand."
- Vegeman: "We can do both. Watch the game on the phone while we water. Multitasking."
- Critters: "Unattended for six hours. Scouted the perimeter. Found opportunities."

---

**S09: Soil Test Results**
- Category: Infrastructure
- Valence: Positive
- Season window: Early spring
- Mechanic: All cells gain 0.2 points for the season. The player receives advance intelligence: the weakest row is identified and highlighted, giving better information for intervention decisions later in the season.
- GURL: "You tested the soil. This is baseline competence, not heroism, but it does improve your position."
- Onion Man: "Okay, the soil is good. The soil is actually good. That is one less thing to worry about."
- Vegeman: "Numbers say we're fine. Plant everything. The dirt gave us permission."
- Critters: "Soil healthy. Fewer openings. Disappointing."

---

**S10: Seed Starting Mishap**
- Category: Family
- Valence: Negative
- Season window: Early spring
- Mechanic: Two random cells that contain transplant-type crops (tomato, pepper, eggplant) lose 1.0 point — the seedlings you started indoors got knocked over by the cat / forgotten on the windowsill / overwatered. Those cells start the season weaker.
- GURL: "Indoor seedling failure. The bed inherits your windowsill mistakes."
- Onion Man: "The cat sat on the seed tray. The cat does not care about the season. The cat cares about the cat."
- Vegeman: "Buy starts from the nursery. Problem solved. No shame in buying starts."
- Critters: "Weak transplants. Stressed roots. Promising."

---

### SUMMER (Events U01–U10)

---

**U01: August Heatwave**
- Category: Weather
- Valence: Negative
- Season window: Late summer
- Mechanic: All cool-season crops (lettuce, spinach, peas, radish, kale) lose 2.0 points. All heat-loving crops unaffected. Herbs lose 0.5 points unless adjacent to a taller crop providing partial shade.
- Intervention option: Sacrifice one cell (pull it entirely) to install a shade cloth effect — reduces penalty by 50% on all adjacent cells.
- GURL: "Ninety-four degrees for five consecutive days. Your lettuce has filed a grievance."
- Onion Man: "This is the week that separates the real ones from the wishful thinkers. Also I am personally dying."
- Vegeman: "Lettuce was a gamble in August. A bold, stupid gamble. I liked it at the time."
- Critters: "Heat stress. Wilting edges. Leaf damage in the open rows. Thank you."

---

**U02: Squirrel Raid**
- Category: Critter
- Valence: Negative
- Season window: Mid summer
- Mechanic: Two random fruiting-faction cells (tomato, pepper, eggplant, cucumber, zucchini) lose 1.0 point each — partial harvest theft. Cells with cage protection (`isCritterSafe`) are immune. If all fruiting cells are protected, the squirrel targets the highest-scoring unprotected cell of any type instead.
- Intervention option: Spend token to install emergency netting on one row. All cells in that row become critter-safe for the rest of the season.
- GURL: "The squirrel took two tomatoes and left the evidence on the sidewalk. Critter protection was available."
- Onion Man: "I watched it happen. From the window. It looked at me. It did not care."
- Vegeman: "We need a decoy garden. A sacrificial tomato. A tomato we do not love."
- Critters: "Red fruit. No cage. Took what was offered."

---

**U03: Thunderstorm Knockdown**
- Category: Weather
- Valence: Negative
- Season window: Mid summer
- Mechanic: All climbing crops (tomato, cucumber, bean, pea) without trellis support (`hasVerticalSupport` = false) lose 1.5 points — wind damage and stem breakage. Properly trellised crops are unaffected. One random unsupported tall crop is completely destroyed (cell becomes empty).
- GURL: "A storm tested your support infrastructure. The trellised crops held. The unsupported ones did not. Predictable."
- Onion Man: "That wind came out of nowhere. Actually it came out of the weather forecast but I did not check."
- Vegeman: "The beans are on the ground. The beans are literally on the ground. This is a crime scene."
- Critters: "Wind event. Tall stems down. We did not cause this one. We will use it."

---

**U04: Neighbor's Cookout Smoke**
- Category: Neighbor
- Valence: Mixed
- Season window: Late summer
- Mechanic: All cells in rows 0-1 (back, near neighbor's fence) lose 0.3 points from smoke exposure. However, the neighbor comes over to compliment the garden and offers three ripe tomatoes from their own plant — the player can place these as a "bonus harvest" that counts toward recipe/pantry progress without using a cell.
- GURL: "Smoke damage is minor but measurable. The social capital may prove more useful than the lost points."
- Onion Man: "He brought tomatoes. He saw the garden and he brought tomatoes. This is how it is supposed to work."
- Vegeman: "Free tomatoes AND we get to complain about the smoke? This is a net win."
- Critters: "Smoke. Reduced insect activity near back rows. Temporary reprieve. Annoying."

---

**U05: Japanese Beetle Arrival**
- Category: Critter
- Valence: Negative
- Season window: Early summer
- Mechanic: All bean and basil cells lose 1.0 point — skeletonized leaves. If marigold or nasturtium is adjacent to an affected cell, penalty reduced to 0.3 (companion flower defense).
- Intervention option: Hand-pick beetles from one row (costs intervention token, removes penalty from that row entirely).
- GURL: "Japanese beetles. They prefer beans and basil. Your companion flowers, if you planted any, are doing their job. If you did not plant any, that was a choice."
- Onion Man: "Every leaf looks like lace. Not the good kind. The destroyed kind."
- Vegeman: "We should have planted more marigolds. I was saying that. I was definitely saying that."
- Critters: "Beetles arrived on schedule. Your beans were on the menu. The menu was accurate."

---

**U06: Perfect Growing Week**
- Category: Weather
- Valence: Positive
- Season window: Mid summer
- Mechanic: All cells gain 0.5 points. The three highest-scoring cells gain an additional 0.3 points. The bed is firing on all cylinders.
- No intervention required.
- GURL: "Optimal conditions across all factors. Sun, water, temperature, and humidity within ideal range. This is what planning looks like when the weather cooperates."
- Onion Man: "This is the week. This is the week you tell people about in October. 'Remember that one week in July?'"
- Vegeman: "I want to bottle this week. I want to put this week in a jar and open it in February."
- Critters: "Everything healthy. Everything strong. Nothing easy. We will wait."

---

**U07: Phillies Losing Streak**
- Category: Family
- Valence: Negative
- Season window: Mid summer
- Mechanic: Player is emotionally compromised. One random intervention this season is wasted — you spent the evening on sports radio instead of checking the bed. The lowest-scoring cell loses an additional 0.5 points from neglect.
- GURL: "One intervention lost to a seven-game losing streak. The bed's weakest cell suffered from inattention. Causation is clear."
- Onion Man: "I know the garden needed me. But also the Phillies needed me. They did not know they needed me but they did. They still lost."
- Vegeman: "The Phillies will come back. The wilted pepper might not. Priorities, man."
- Critters: "Neglected corner. Unwatered for two days. We appreciate the oversight."

---

**U08: Hose Blowout**
- Category: Infrastructure
- Valence: Negative
- Season window: Late summer
- Mechanic: For one beat, watering is manual only — the hose coupling burst. All cells with water need "high" lose 0.5 points. The player can spend their intervention to do a manual deep-water on one row, negating the penalty for that row.
- GURL: "Infrastructure failure at the coupling. The bed's hydration dropped below baseline for seventy-two hours. Avoidable with a twelve-dollar replacement part."
- Onion Man: "The hose exploded on a Wednesday. I fixed it on a Saturday. Those three days cost us."
- Vegeman: "Just use a watering can. How hard is a watering can? Very hard, apparently, across thirty-two cells."
- Critters: "Dry soil. Stressed roots. Cracks forming. Good."

---

**U09: Tomato Hornworm**
- Category: Critter
- Valence: Negative
- Season window: Mid summer
- Mechanic: One random tomato cell loses 2.0 points — massive defoliation. If the player has companion herbs (basil, dill) adjacent, the hornworm is detected earlier and the penalty is reduced to 1.0 point. If the player spends an intervention, the hornworm is removed entirely.
- GURL: "One hornworm. One tomato. Two points. The math is straightforward and unforgiving."
- Onion Man: "It was the size of my finger. It ate half the plant in two days. I have questions about biology."
- Vegeman: "Those things are disgusting and also kind of impressive. Mostly disgusting."
- Critters: "Large caterpillar. Efficient. Left us nothing to work with. Professional courtesy."

---

**U10: Neighborhood Kid's Ball**
- Category: Neighbor
- Valence: Mixed
- Season window: Late summer
- Mechanic: A wiffle ball lands in the bed. One random cell in rows 2-3 takes 0.5 point damage (broken stem). The kid comes to retrieve it, sees the garden, and is genuinely interested — this generates a "community" narrative beat and a 0.2 point buff to all cells next beat (you spent ten minutes explaining the garden and felt good about it, came back and gave everything extra attention).
- GURL: "One stem broken by recreational projectile. The subsequent social interaction marginally improved your attentiveness. Net effect: nearly neutral."
- Onion Man: "The kid asked what kind of tomato that was. By name. I almost lost it."
- Vegeman: "Tell the kid to aim for the alley. Also, sign the kid up. We need recruits."
- Critters: "Impact damage, row three. One stem compromised. Minimal. Barely worth reporting."

---

### FALL (Events F01–F10)

---

**F01: First Frost Warning**
- Category: Weather
- Valence: Negative
- Season window: Late fall
- Mechanic: All warm-season crops still in the bed (tomato, pepper, basil, cucumber, zucchini, bean) lose 1.5 points. Cool-season crops (kale, spinach, lettuce, radish, pea, carrot) are unaffected. Root crops gain 0.3 points — frost sweetens them.
- Intervention option: Cover two cells with fabric, negating the frost penalty for those cells.
- GURL: "Frost tonight. Warm-season holdouts will pay the price. Cool-season crops and roots will benefit. You were told this would happen."
- Onion Man: "It is over for the tomatoes. I am not ready. I am never ready."
- Vegeman: "What if we just... leave them? What if they are fine? They could be fine."
- Critters: "Temperature drop. Soft tissue damage. Warm crops exposed. Season turning."

---

**F02: Bumper Herb Harvest**
- Category: Weather
- Valence: Positive
- Season window: Early fall
- Mechanic: All herb-faction crops (basil, cilantro, dill, parsley) gain 1.0 point. The cool autumn temperatures and shorter days trigger a final flush of growth before the season ends. Recipe/pantry progress for herbs doubles this beat.
- GURL: "Herb yield above projection. Cool nights triggered a productive flush. Harvest promptly."
- Onion Man: "The basil smells like September. I do not know how to explain what that means but it means something."
- Vegeman: "Dry it. Freeze it. Put it in everything. Herb surplus is not a problem. It is a lifestyle."
- Critters: "Strong aroma. Herbs healthy. Reduced pest access near herb clusters. Inconvenient for us."

---

**F03: Raccoon Composting Incident**
- Category: Critter
- Valence: Mixed
- Season window: Mid fall
- Mechanic: A raccoon tears through the compost bin, scattering material across rows 2-3. Those rows get a 0.5 point penalty this beat (physical disruption and scattered debris). However, the scattered compost acts as mulch — those same rows gain 0.3 points for the next beat (improved soil condition).
- GURL: "The raccoon redistributed your compost without authorization. The short-term mess creates a minor long-term soil benefit. The raccoon does not know this."
- Onion Man: "I heard it at 2 AM. By the time I got out there it was gone and the compost was everywhere. Everywhere."
- Vegeman: "Accidental mulching. The raccoon is doing free labor. We should leave more compost out."
- Critters: "Raccoon was here. Not us. We just observed. And took notes."

---

**F04: Leaf Drop from Neighbor's Tree**
- Category: Neighbor
- Valence: Mixed
- Season window: Mid fall
- Mechanic: All cells in column 0 and column 1 are covered in leaves. Those cells lose 0.5 points (reduced light, moisture trapping). If the player spends an intervention to rake, the penalty is removed AND the raked leaves create a mulch bonus of 0.3 points on all front-row cells for the next season (carry-forward).
- GURL: "Deciduous debris from the adjacent property. Clearing it now creates a future mulch benefit. Ignoring it creates a present light deficit."
- Onion Man: "The leaves are kind of pretty for about one day. Then they are a problem."
- Vegeman: "Leave the leaves. Nature's mulch. I read that somewhere. It might have been wrong."
- Critters: "Leaf cover. Damp. Dark. Hiding places. We approve of this development."

---

**F05: Phillies Postseason Run**
- Category: Family
- Valence: Mixed
- Season window: Late fall
- Mechanic: If the Phillies are in the playoffs, the player is distracted for the entire late fall beat. No intervention available this beat. However, the emotional intensity generates a "clutch performance" buff — the single highest-scoring cell gains 1.0 point. You poured all your nervous energy into one perfect corner of the bed.
- GURL: "No intervention available due to postseason baseball. One cell received the full force of your displaced anxiety. It thrived."
- Onion Man: "We are going to the World Series and the kale has never looked better. These two facts are connected. Do not ask me how."
- Vegeman: "Forget the garden. Actually no. Do not forget the garden. But also the Phillies."
- Critters: "Extended human absence. Evening access uncontested for nine days. Productive stretch."

---

**F06: End-of-Season Brassica Surge**
- Category: Weather
- Valence: Positive
- Season window: Mid fall
- Mechanic: All brassica-faction crops (kale, broccoli, cabbage, Brussels sprouts) gain 1.0 point. Cool temperatures trigger sugar production and improved flavor. These crops were made for this moment.
- GURL: "Brassicas performing at peak. Cool temperatures activating sugar conversion. This is their designed operating range."
- Onion Man: "The kale is thriving in the cold. The kale is tougher than me. I respect the kale."
- Vegeman: "Brassicas in fall is free money. I have been saying this. Put kale in every cell."
- Critters: "Brassicas hardening. Leaves thickening. Reduced vulnerability. Not ideal."

---

**F07: Gutter Overflow**
- Category: Infrastructure
- Valence: Negative
- Season window: Late fall
- Mechanic: The house gutter overflows during a heavy rain, dumping water directly on rows 0-1 (back rows, near the house). All cells in those rows lose 1.0 point — root saturation and soil compaction. Climbing crops on trellis in those rows lose an additional 0.5 points (water weight on vines).
- Intervention option: Spend token to redirect water flow. Penalty reduced to 0.3 points.
- GURL: "Gutter maintenance is not a garden skill. It is a homeowner skill that affects the garden. The distinction does not help your back row."
- Onion Man: "The gutter has been doing this for three years. I keep saying I will fix it. I keep not fixing it."
- Vegeman: "Redirect it to the bed on purpose. Irrigation hack. Wait, too much? Too much."
- Critters: "Standing water, back rows. Pooling at root level. Conditions favorable."

---

**F08: Sauce Ingredient Check**
- Category: Family
- Valence: Positive
- Season window: Mid fall
- Mechanic: The game checks the bed for sauce recipe ingredients (tomato, basil, pepper, onion, carrot). For each ingredient present and scoring above 5.0, the player gets a 0.3 point buff on that cell. This event rewards players who planted with intention toward the recipe goal.
- GURL: "Ingredient audit complete. Cells meeting recipe threshold have been credited. This is what foresight looks like in a scoring engine."
- Onion Man: "Tomato, basil, pepper, onion, carrot. That is the list. I count them every year. Every year it matters."
- Vegeman: "Sauce run. SAUCE RUN. This is not a drill."
- Critters: "Emotional activity detected near the bed. Humans distracted. Access noted."

---

**F09: Early Dark**
- Category: Weather
- Valence: Negative
- Season window: Late fall
- Mechanic: Effective sun hours reduced by 1 for all cells. Crops with high sun requirements (sunMin >= 6) lose 0.5 points. Shade-tolerant crops (shadeScore >= 4) are unaffected.
- GURL: "Daylight hours below summer baseline. High-sun crops are underperforming. This was forecastable at planting time."
- Onion Man: "It gets dark at 4:30 now. The garden does not get checked after dark. Things happen after dark."
- Vegeman: "We need grow lights. Outdoor grow lights. Is that a thing? That should be a thing."
- Critters: "Short days. Extended dark hours. More time to operate."

---

**F10: Neighbor Asks for Produce**
- Category: Neighbor
- Valence: Positive
- Season window: Early fall
- Mechanic: A neighbor asks if you have extra tomatoes, herbs, or greens. If you have at least 3 cells of any single crop scoring above 6.0, you gain a 0.5 point "community reputation" buff on all cells for the next beat. Sharing strengthens the garden. If you cannot share (no crop meets the threshold), no penalty — just a missed opportunity.
- GURL: "Surplus shared with adjacent household. Community integration confirmed. This buffs the bed. Do not ask me to explain why. Morale is real."
- Onion Man: "She asked for basil. I gave her basil and two tomatoes. That is what you do. That is what Mom did."
- Vegeman: "Give them the ugly ones. Keep the good ones. Strategic generosity."
- Critters: "Harvest removed from premises. Less for us. Humans cooperating. Unfortunate."

---

### WINTER (Events W01–W10)

---

**W01: Frozen Pipe Delay**
- Category: Infrastructure
- Valence: Negative
- Season window: Early winter
- Mechanic: Carry-forward effect. The outdoor spigot froze because it was not winterized. Next spring, the first beat starts with no watering access — all crops with water need "high" take a 0.5 point penalty in early spring. Preventable. Was not prevented.
- GURL: "The spigot was not drained. The pipe froze. Spring will begin with a plumbing delay. This is a winter consequence that becomes a spring problem."
- Onion Man: "I knew I was supposed to drain that. I knew it in November. It is now January."
- Vegeman: "It will thaw. Pipes thaw. This is fine. This is definitely fine."
- Critters: "Ice in the lines. Spring access delayed. Advantage: us."

---

**W02: Seed Catalog Arrives**
- Category: Family
- Valence: Positive
- Season window: Mid winter
- Mechanic: Planning advantage for next season. The player gains advance visibility into next spring's event pool — one event is revealed early. Additionally, the player can "pre-select" one crop that will start next spring with a 0.5 point establishment bonus.
- GURL: "The catalog provides advance intelligence. Use it for strategic pre-selection, not impulse ordering."
- Onion Man: "The catalog came. I sat with it for an hour. Circled too many things. It is a ritual."
- Vegeman: "Order everything. We will figure out where it goes later. That is a future problem."
- Critters: "Paper arrived. No threat. Humans excited. Irrelevant to us."

---

**W03: Bed Frame Check**
- Category: Infrastructure
- Valence: Mixed
- Season window: Early winter
- Mechanic: Inspection reveals the cedar bed frame has one compromised board. If the player "spends" a winter planning token to repair, all cells gain 0.2 points next season (structural integrity bonus). If ignored, front row cells lose 0.3 points next season (soil erosion from the gap).
- GURL: "Cedar board along the front edge is splitting. Repair now is cheap. Repair in May is an emergency."
- Onion Man: "Mom built this bed. The wood is holding up but it is not new. Nothing is new. That is okay."
- Vegeman: "Slap a board over it. Twenty minutes. Done. Why are we even discussing this?"
- Critters: "Gap in the frame. Ground-level access point. We will remember this."

---

**W04: Phillies Hot Stove Signing**
- Category: Family
- Valence: Positive
- Season window: Mid winter
- Mechanic: Big offseason move. The emotional boost carries over — next spring, the player starts with one extra intervention token. The energy of a good signing translates into extra garden motivation.
- GURL: "An emotional uplift from a baseball transaction has generated one additional intervention token for spring. The correlation is not scientific. The result is measurable."
- Onion Man: "They signed him. THEY SIGNED HIM. I am going outside right now to look at the bed. In January. In the snow. I do not care."
- Vegeman: "Championship energy. Put it in the soil. The soil can feel it. Probably."
- Critters: "Human exhibited unusual outdoor behavior in subfreezing conditions. Brief. Loud. No garden impact."

---

**W05: Winter Cover Crop Decision**
- Category: Infrastructure
- Valence: Mixed
- Season window: Early winter
- Mechanic: The player chooses whether to plant a winter cover crop (crimson clover, winter rye). If yes: all cells gain 0.3 points next spring (nitrogen fixation, soil health), but the player must use their first spring intervention to terminate the cover crop before planting. If no: no penalty, no bonus. Straightforward tradeoff.
- GURL: "Cover cropping is a deferred investment. The spring cost is one intervention. The spring return is soil quality. Do the math."
- Onion Man: "It looks like nothing. A green blanket on dirt. But underneath, the roots are working all winter. I think about that."
- Vegeman: "Planting something we are going to kill in March? That is cold. I love it."
- Critters: "Winter green cover. Reduced soil exposure. Fewer access points. Grudging acknowledgment."

---

**W06: Compost Bin Maintenance**
- Category: Infrastructure
- Valence: Positive
- Season window: Mid winter
- Mechanic: Turning the compost in winter means rich compost ready for spring. All cells gain 0.2 points in the next spring season. Additionally, one random cell in spring gains a 0.5 point "black gold" bonus from a particularly good compost pocket.
- GURL: "Compost maintained through winter. Decomposition rate adequate. Spring application will provide a measurable soil amendment."
- Onion Man: "Turning compost in January is not fun. Turning compost in January is the kind of thing you do because you actually care."
- Vegeman: "Compost is free dirt. Free good dirt. There is no reason to not do this."
- Critters: "Compost turned. Disturbed habitat. Temporary displacement. We adapt."

---

**W07: Garage Seed Storage Check**
- Category: Family
- Valence: Mixed
- Season window: Late winter
- Mechanic: You check last year's seeds stored in the garage. The temperature fluctuations may have reduced viability. Roll: 60% chance seeds are fine (no effect), 40% chance two random crops next spring start with a 0.5 point penalty (poor germination from bad storage). If seeds are fine, you gain a small bonus — saved money means you can afford one premium start, giving one crop a 0.3 point bonus next spring.
- GURL: "Seed viability is a function of storage conditions. Your garage is not climate-controlled. Outcomes vary accordingly."
- Onion Man: "The seeds were in a shoebox on the shelf next to the paint cans. I know. I know."
- Vegeman: "They are fine. Seeds are tough. Plant them all and see what happens."
- Critters: "Mice may have accessed the seed box. We cannot confirm. We can suggest."

---

**W08: Garden Planning Session**
- Category: Family
- Valence: Positive
- Season window: Late winter
- Mechanic: The player sits down and actually plans. Full visibility into next season's crop roster, companion/conflict relationships, and one guaranteed event preview. The best planning session gives the player one free "undo" token for next spring — they can reverse one placement after committing.
- GURL: "Planning session logged. Next season's layout space is now partially visible. One reversal token earned. Use it wisely or do not use it at all."
- Onion Man: "I drew the bed on graph paper. At the kitchen table. With coffee. This is how it starts."
- Vegeman: "Planning is great but have you considered just winging it? No? Fine. Plan."
- Critters: "Human indoors with paper. No outdoor activity. Winter continues."

---

**W09: Ice Storm Damage**
- Category: Weather
- Valence: Negative
- Season window: Mid winter
- Mechanic: Carry-forward. The trellis takes ice damage — one trellis wire snaps. Next spring, the player has reduced trellis capacity: one column of the trellis zone cannot support climbing crops until repaired (costs one spring intervention). Climbing crops placed in the damaged column without repair get no trellis bonus.
- GURL: "Ice load exceeded wire tolerance on one trellis column. Repair is required before spring loading. Structural failure in a support system is not cosmetic."
- Onion Man: "Mom put that wire up. It held for years. One ice storm and now I have to learn how to splice wire."
- Vegeman: "Zip ties. Heavy-duty zip ties. That is a repair. Do not let anyone tell you it is not."
- Critters: "Trellis compromised. Vertical support reduced. Climbing crops more vulnerable next season. Excellent."

---

**W10: Neighbor Moves Away**
- Category: Neighbor
- Valence: Mixed
- Season window: Late winter
- Mechanic: The neighbor who shared tomato seedlings with Mom is moving. Narrative memory beat. The carry-forward effect: the new neighbor is unknown. Next season, one neighbor event is guaranteed to fire (they might be helpful, they might be a problem). Additionally, any "community reputation" buffs from previous neighbor interactions are reset to zero. You start fresh with the new neighbor.
- GURL: "Adjacent property changing hands. Community modifiers reset. Future neighbor events will draw from the full pool, not the established-positive subset."
- Onion Man: "He gave Mom the first tomato plant. That was fifteen years ago. Now he is leaving. The bed remembers even if the block does not."
- Vegeman: "New neighbor could be great. New neighbor could be terrible. Either way, new content."
- Critters: "Territory boundary shift. New human. Unknown threat level. Monitoring."

---

## Event Index by Category

### Weather Events (9)

| ID | Name | Season | Valence |
|----|------|--------|---------|
| S01 | Late Frost Advisory | Spring | Negative |
| S02 | Surprise Warm Week | Spring | Positive |
| S07 | Spring Rain Surplus | Spring | Mixed |
| U01 | August Heatwave | Summer | Negative |
| U03 | Thunderstorm Knockdown | Summer | Negative |
| U06 | Perfect Growing Week | Summer | Positive |
| F01 | First Frost Warning | Fall | Negative |
| F09 | Early Dark | Fall | Negative |
| W09 | Ice Storm Damage | Winter | Negative |

### Critter Events (6)

| ID | Name | Season | Valence |
|----|------|--------|---------|
| S04 | Aphid Scouts | Spring | Negative |
| U02 | Squirrel Raid | Summer | Negative |
| U05 | Japanese Beetle Arrival | Summer | Negative |
| U09 | Tomato Hornworm | Summer | Negative |
| F03 | Raccoon Composting Incident | Fall | Mixed |
| F04 | Leaf Drop from Neighbor's Tree | Fall | Mixed |

### Neighbor Events (7)

| ID | Name | Season | Valence |
|----|------|--------|---------|
| S03 | Neighbor's Tree Canopy Leafs Out | Spring | Negative |
| S05 | Block Cleanup Day | Spring | Mixed |
| U04 | Neighbor's Cookout Smoke | Summer | Mixed |
| U10 | Neighborhood Kid's Ball | Summer | Mixed |
| F10 | Neighbor Asks for Produce | Fall | Positive |
| W10 | Neighbor Moves Away | Winter | Mixed |
| F04 | Leaf Drop from Neighbor's Tree | Fall | Mixed |

### Family Events (7)

| ID | Name | Season | Valence |
|----|------|--------|---------|
| S08 | Phillies Home Opener | Spring | Mixed |
| S10 | Seed Starting Mishap | Spring | Negative |
| U07 | Phillies Losing Streak | Summer | Negative |
| F05 | Phillies Postseason Run | Fall | Mixed |
| W04 | Phillies Hot Stove Signing | Winter | Positive |
| W07 | Garage Seed Storage Check | Winter | Mixed |
| W08 | Garden Planning Session | Winter | Positive |

### Infrastructure Events (7)

| ID | Name | Season | Valence |
|----|------|--------|---------|
| S06 | Found Volunteer Tomato | Spring | Positive |
| S09 | Soil Test Results | Spring | Positive |
| U08 | Hose Blowout | Summer | Negative |
| F07 | Gutter Overflow | Fall | Negative |
| W01 | Frozen Pipe Delay | Winter | Negative |
| W03 | Bed Frame Check | Winter | Mixed |
| W05 | Winter Cover Crop Decision | Winter | Mixed |
| W06 | Compost Bin Maintenance | Winter | Positive |

---

## Valence Summary

### Positive Events (8)

| ID | Name |
|----|------|
| S02 | Surprise Warm Week |
| S06 | Found Volunteer Tomato |
| S09 | Soil Test Results |
| U06 | Perfect Growing Week |
| F02 | Bumper Herb Harvest |
| F06 | End-of-Season Brassica Surge |
| F08 | Sauce Ingredient Check |
| F10 | Neighbor Asks for Produce |

### Negative Events (14)

| ID | Name |
|----|------|
| S01 | Late Frost Advisory |
| S04 | Aphid Scouts |
| S10 | Seed Starting Mishap |
| U01 | August Heatwave |
| U02 | Squirrel Raid |
| U03 | Thunderstorm Knockdown |
| U05 | Japanese Beetle Arrival |
| U07 | Phillies Losing Streak |
| U08 | Hose Blowout |
| U09 | Tomato Hornworm |
| F01 | First Frost Warning |
| F07 | Gutter Overflow |
| F09 | Early Dark |
| W09 | Ice Storm Damage |

### Mixed Blessing Events (11)

| ID | Name |
|----|------|
| S05 | Block Cleanup Day |
| S07 | Spring Rain Surplus |
| S08 | Phillies Home Opener |
| U04 | Neighbor's Cookout Smoke |
| U10 | Neighborhood Kid's Ball |
| F03 | Raccoon Composting Incident |
| F04 | Leaf Drop from Neighbor's Tree |
| F05 | Phillies Postseason Run |
| W03 | Bed Frame Check |
| W05 | Winter Cover Crop Decision |
| W07 | Garage Seed Storage Check |
| W10 | Neighbor Moves Away |

### Positive Winter Events (carry-forward bonuses, 4)

| ID | Name |
|----|------|
| W02 | Seed Catalog Arrives |
| W04 | Phillies Hot Stove Signing |
| W06 | Compost Bin Maintenance |
| W08 | Garden Planning Session |

---

## Phillies-Season-Flavored Events (4)

| ID | Name | Season | What Happens |
|----|------|--------|-------------|
| S08 | Phillies Home Opener | Spring | Lose an intervention, gain morale buff on best cells |
| U07 | Phillies Losing Streak | Summer | Lose an intervention, weakest cell takes neglect damage |
| F05 | Phillies Postseason Run | Fall | No intervention available, best cell gets clutch buff |
| W04 | Phillies Hot Stove Signing | Winter | Emotional boost gives extra intervention token next spring |

These four events form a mini-arc across the baseball season. Opening Day is hopeful, the losing streak is summer despair, the postseason is fall intensity, and the hot stove is winter renewal. Onion Man's emotional register tracks the Phillies season alongside the garden season. The two calendars rhyme.

---

## How Characters Comment on Events

### Garden GURL: Diagnoses

GURL treats events like code violations and weather advisories. She identifies the cause, the consequence, and whether the player should have seen it coming. She does not sympathize. She documents.

**Pattern:** [What happened] + [What it costs mechanically] + [Whether it was foreseeable]

- She never says "sorry" or "tough break"
- She uses words like "confirmed," "measurable," "forecastable," "avoidable"
- Her version of comfort is "the data suggests recovery is possible"
- She is funniest when she treats a squirrel like a zoning violation

### Onion Man: Reacts

Onion Man feels events before he understands them. He connects garden disruptions to weather memory, food, family, and Phillies outcomes. He gets emotional about the right things at slightly the wrong scale.

**Pattern:** [Emotional reaction] + [Personal association] + [Small pivot to hope or resignation]

- He deflects with humor before being sincere
- He treats basil damage like a personal injury
- He is funniest when his emotional investment is disproportionate to the event
- He is most effective when he is quiet after something lands

### Vegeman: Sees Opportunity

Vegeman reads every event as either a reason to double down or a vindication of something he said earlier. Negative events are problems to brute-force. Positive events are permission to overcommit. He is never cautious and almost never right, but his energy is useful.

**Pattern:** [Aggressive reframe] + [Bad solution proposed with confidence] + [Half-accurate instinct buried in the noise]

- He never says "we should be careful"
- He treats disaster as content
- He is funniest when his solution is technically possible but clearly unwise
- His one contribution is momentum — he keeps the player moving forward even after a loss

### Garden Critters: Report

Critters observe events with territorial indifference. They do not cause most events, but they benefit from the openings events create. Their commentary is clipped, factual, and slightly menacing.

**Pattern:** [What they observed] + [What vulnerability it exposed] + [What they plan to do about it]

- They speak in fragments
- They never express sympathy or frustration
- They are funniest when they sound bored while describing their advantage
- Their version of praise for the player is "nothing easy, annoying"

---

## How to Keep Events Funny, Stressful, and Grounded

### Funny

1. **Specificity over absurdity.** "The squirrel took two tomatoes and left the evidence on the sidewalk" is funnier than "a squirrel attacked your garden" because it is specific and visual. Every event should have one detail that makes the player picture an actual backyard moment.

2. **Character reaction mismatch.** The event is serious. GURL treats it like a building inspection. Onion Man treats it like a family crisis. Vegeman treats it like a dare. Critters treat it like a status report. The four different registers on the same event create comedy through contrast.

3. **Proportional ridiculousness.** The events themselves are mundane. The characters' responses are where the comedy lives. A broken hose is not funny. Onion Man's guilt about not fixing it for three days is funny. Vegeman suggesting you water 32 cells with a watering can is funny. GURL calculating the hydration deficit to two decimal places is funny.

4. **The Phillies throughline.** Having a professional baseball team's season emotionally entangled with a backyard vegetable garden is inherently absurd and inherently South Philly. It is the kind of thing that is only funny if it is also completely real.

### Stressful

1. **Events target what the player cares about most.** Aphids find the weakest cell. The squirrel takes the best tomato. The heatwave kills cool-season crops the player specifically chose. Events should feel like they read the player's layout and found the vulnerability.

2. **Intervention scarcity means real triage.** The player cannot fix everything. When a storm knocks down unsupported beans AND the hose blows out, the player must choose which problem to solve. That choice is the stress.

3. **Carry-forward consequences.** Winter events that affect spring create dread across seasons. The frozen pipe, the ice-damaged trellis, the unknown new neighbor — these make winter feel consequential even though nothing is growing.

4. **Mixed events force tradeoffs.** Block Cleanup Day blocks your front row but gives you compost. The raccoon destroys your compost bin but mulches your rows. The Phillies postseason steals your intervention but buffs your best cell. The player cannot simply react — they must weigh costs against benefits in real time.

### Grounded

1. **Every event has happened in a real backyard.** Late frost, broken hoses, neighbor trees, squirrels, hornworms, ball-in-the-garden, gutter overflow, leaf drop, ice damage, raccoons in the compost — these are not invented scenarios. They are the actual texture of maintaining a garden in a dense urban neighborhood.

2. **No event exceeds the scale of a backyard.** There are no floods, no infestations that destroy everything, no neighbor conflicts that escalate to drama. The events are small, local, and recoverable. The stress comes from accumulation and scarcity, not from catastrophe.

3. **Social events reflect real neighborhood dynamics.** The cookout smoke, the kid's ball, the block cleanup, the neighbor moving away, the request for produce — these are the actual social fabric of a South Philly block. They are not hostile. They are just life happening adjacent to the garden.

4. **Infrastructure events reflect real homeowner neglect.** The gutter nobody fixes, the hose coupling that was always going to blow, the trellis wire that held for years until it did not, the pipe that should have been drained in November. These events are believable because they are the specific things that every real gardener forgets and then regrets.

---

## Event Draw Rules

### Per Season
- Draw 2-3 events per growing season (spring, summer, fall)
- Draw 1-2 events per winter (carry-forward only)
- Maximum 1 critter event per season
- Maximum 1 neighbor event per season
- Maximum 1 Phillies event per season
- Weather events can stack (rain + heat in the same summer)

### Weighting
- Negative events weighted 40%
- Mixed events weighted 35%
- Positive events weighted 25%
- First playthrough of each chapter uses a curated event (not random) to teach the mechanic
- Free play uses weighted random draws from the seasonal pool

### Anti-Frustration
- No more than 2 consecutive negative events in a single season
- If two negative events fire in a row, the third draw pulls from the positive/mixed pool only
- Carry-forward penalties cap at -0.5 points per cell (no stacking winter penalties to cripple spring)
- The player always has at least one intervention token per season, even if events consume the others

---

## Implementation Notes

### Event Data Structure

```json
{
  "id": "S01",
  "name": "Late Frost Advisory",
  "season": "spring",
  "window": "early",
  "category": "weather",
  "valence": "negative",
  "mechanic": {
    "type": "cell_penalty",
    "target": { "rows": [2, 3], "filter": "coolSeason" },
    "amount": -1.0,
    "intervention": {
      "type": "cover",
      "cells": 2,
      "effect": "negate_penalty"
    }
  },
  "dialogue": {
    "gurl": "The forecast was available. The front row was not prepared.",
    "onionMan": "Every year. Every single year I think we are past this. We are never past this.",
    "vegeman": "Quick, throw a bedsheet on it. That counts, right? My grandmother did that.",
    "critters": "Frost on the tips. Soft leaves. Noted."
  },
  "carryForward": null
}
```

### Carry-Forward Structure

```json
{
  "source": "W01",
  "targetSeason": "spring",
  "targetWindow": "early",
  "effect": {
    "type": "cell_penalty",
    "target": { "filter": "waterNeed:high" },
    "amount": -0.5
  },
  "resolved": false
}
```

### Integration Points

- Events hook into the scoring engine via temporary modifiers applied during the season phase
- Cell penalties/buffs are additive to the existing `adjScore` channel
- Zone lockouts set a `locked` flag on affected rows/columns, preventing intervention targeting
- Carry-forward effects are stored in the workspace and resolved at the start of the target season
- Event draws use a seeded RNG tied to the season number for deterministic replay

---

## Design Principles

1. **Events are not flavor text.** Every event changes at least one number in the scoring engine. If it does not modify gameplay, it is not an event — it is a narrator line.

2. **Events reward preparation.** Trellis compliance protects against storms. Companion flowers reduce beetle damage. Cage protection blocks squirrels. Players who built well suffer less. Players who cut corners discover why corners exist.

3. **Events create stories.** The best seasons are the ones where something went wrong and the player adapted. The worst seasons are the ones where nothing happened. Events are the plot of each season.

4. **Events respect the player's time.** Resolution is quick — read the event, see the effect, make one intervention decision. No multi-step quest chains. No dialogue trees. One card, one consequence, one choice.

5. **Events keep the yard alive.** The bed exists inside a neighborhood, under a sky, next to a house, with creatures and neighbors and weather. Events are the game's way of saying: this is not a spreadsheet. This is a place.

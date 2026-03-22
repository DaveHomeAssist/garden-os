# Let It Grow — Game Design Document

## 1. Core Game Loop

**Plant → Maintain → Explore → Help NPCs → Earn Rewards → Expand → Repeat**

### Primary Loop (Per Session)
1. Check garden status (what grew, what needs attention)
2. Use tools: water, fertilize, prune, harvest
3. Talk to NPCs, accept quests
4. Explore neighborhood or new zones
5. Return with seeds, materials, rewards
6. Plant, arrange, optimize

### Secondary Loop (Per Season)
1. Seasonal events change available crops and challenges
2. NPC rotations bring new quests
3. Festivals offer limited-time rewards
4. End-of-season harvest scoring

### Meta Loop (Per Year)
1. Unlock new zones and biomes
2. Level up skills
3. Build reputation with NPCs
4. Craft advanced tools
5. Expand inventory capacity

## 2. Time System

| System | Behavior |
|--------|----------|
| Day Cycle | Optional — visual only or gameplay impact (toggle) |
| Seasonal | Spring, Summer, Fall, Winter |
| Monthly | Events + NPC rotations |
| Real-Time Sync | Optional server-based toggle |

### Seasonal Events
- **Spring**: Bloom Festival — bonus seed drops, planting bonuses
- **Summer**: Growth surge — faster timers, heat challenges
- **Fall**: Harvest Week — scoring multipliers, recipe bonuses
- **Winter**: Dormancy Challenge — soil management, planning phase

### Existing Foundation
Story Mode already implements 4 seasons × 3 months = 12 chapters. The time system extends this from turn-based months to optional real-time progression.

## 3. World Structure

| Layer | Description | Unlock |
|-------|-------------|--------|
| Player Plot | Home base (existing 8×4 bed, expandable) | Start |
| Neighborhood | NPC gardens, shared spaces | v0.2 |
| Expansion Zones | Forest, meadow, riverside biomes | v0.3+ |
| Event Areas | Temporary festival/challenge maps | Seasonal |

## 4. Progression Tracks

| Track | Mechanic | Unlocks |
|-------|----------|---------|
| Skill XP | Earned from actions matching skill | Passive buffs, new abilities |
| Reputation | Earned from NPC quests | Better rewards, new quests, zone access |
| Exploration | Earned from discovering new areas | Map expansion, rare seeds |
| Crafting | Earned from building items | Advanced tools, decor |

## 5. Modes of Play

| Mode | Description |
|------|-------------|
| Story Mode | Existing 12-chapter guided narrative (preserved) |
| Let It Grow | Open-world sandbox with free-roam |
| (Future) Creative | Unrestricted building/decorating |
| (Future) Challenge | Timed/scored scenarios |

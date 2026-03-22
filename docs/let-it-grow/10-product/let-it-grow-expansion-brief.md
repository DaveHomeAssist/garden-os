# Let It Grow — Expansion Brief

## Elevator Pitch

**Let It Grow** is the open-world sandbox expansion of Garden OS. It transforms the existing 12-chapter story mode into a persistent, explorable garden ecosystem with NPCs, quests, crafting, skills, and eventually multiplayer.

## Genre

Open World Sandbox / Cozy Simulation

## Core Loop

**Plant → Maintain → Explore → Help NPCs → Earn Rewards → Expand → Repeat**

| Layer | Systems |
|-------|---------|
| Primary | Planting, watering, harvesting |
| Secondary | NPC quests, trading, crafting |
| Passive | Growth over time (real-time + seasonal) |
| Meta | Unlock areas, tools, social progression |

## Player Promise

You inherit a garden. You grow it into a neighborhood. Every season brings new challenges, new characters, and new things to discover. Nothing is rushed. Everything grows.

## What Already Exists

Story Mode delivers the v0.1 garden loop: plant on a grid, weather events affect growth, harvest and score, save your progress across 12 chapters. The Let It Grow expansion builds on top of this foundation rather than replacing it.

## What's New

| System | Description |
|--------|-------------|
| Open World | Player movement beyond the plot — neighborhood, expansion zones, biomes |
| NPC Quests | Old Gus, Maya, Lila + dynamic neighbor pool with quest state machines |
| Skill Tree | Gardening, Soil Science, Composting, Foraging, Social, Crafting |
| Crafting | Tool creation, recipe discovery, material combining |
| Inventory | RuneScape-style slot system with backpack tiers |
| Real-Time | Optional real-time growth alongside turn-based story mode |
| Multiplayer | Async garden visits, co-op tasks, persistent world (Phase 2+) |

## Key Decisions to Lock

| Question | Impact |
|----------|--------|
| Unity port or stay web-native? | Timeline vs control |
| Real-time sync? | Server complexity |
| Multiplayer scope? | Architecture shift |
| Story Mode preserved as-is? | Backward compatibility |

## Strategic Position

Garden OS Story Mode is the **proof of concept**. Let It Grow is the **product**. The existing 34-file codebase, 50+ cutscenes, 5 characters, and seasonal engine are not throwaway prototypes — they are the foundation.

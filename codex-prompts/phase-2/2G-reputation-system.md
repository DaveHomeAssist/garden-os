# Codex Prompt — Phase 2G: Reputation System

## Task

Create `src/game/reputation.js` — per-NPC reputation tracking with 5 tiers that gate quests, dialogue, and zone access.

## Deliverable

Create `src/game/reputation.js`:

```js
export const ReputationTiers = {
  STRANGER: { id: 'stranger', label: 'Stranger', threshold: 0 },
  ACQUAINTANCE: { id: 'acquaintance', label: 'Acquaintance', threshold: 25 },
  FRIEND: { id: 'friend', label: 'Friend', threshold: 50 },
  TRUSTED: { id: 'trusted', label: 'Trusted', threshold: 75 },
  FAMILY: { id: 'family', label: 'Family', threshold: 100 },
};

export class ReputationSystem {
  constructor(store) { ... }

  // Get current reputation value for an NPC (0–100)
  getReputation(npcId) { ... }

  // Get current tier for an NPC
  getTier(npcId) { ... }

  // Add reputation (from quest rewards, gifts, etc.)
  // Clamps to 0–100
  addReputation(npcId, amount) { ... }

  // Apply seasonal decay (called at season transition)
  // -1 per NPC per season, minimum 0
  applyDecay() { ... }

  // Check if player meets a reputation requirement
  // requirement: { npcId: minValue }
  meetsRequirement(requirement) { ... }

  // Get all NPC reputations (for UI display)
  getAllReputations() { ... }
}
```

### Store Integration

Add actions:
- `ADD_REPUTATION` — { npcId, amount }
- `DECAY_REPUTATION` — {} (applies to all NPCs)

Reputation state stored in `campaign.reputation: { [npcId]: number }`

### Tier Effects

| Tier | Quest Access | Dialogue | Zones |
|------|-------------|----------|-------|
| Stranger | Basic quests only | Cold greetings | None |
| Acquaintance | More quest variety | Warmer tone | None |
| Friend | Special seeds, tool recipes | Personal | Gus: Forest Edge |
| Trusted | Zone access, rare items | Confiding | Maya: Greenhouse |
| Family | Unique storylines, cosmetics | Intimate | All zones |

### Integration Points

- Quest engine checks `reputation.meetsRequirement()` for quest availability
- Dialogue system uses `reputation.getTier()` to select greeting variant
- Zone manager checks reputation for gated zones
- Season transition calls `reputation.applyDecay()`
- Quest completion calls `reputation.addReputation()` from rewards

## Constraints

- No external dependencies
- Deterministic — no random reputation events
- All mutations through Store
- Reputation is per-save-slot (not global)
- Reputation never exceeds 100 or drops below 0

## Testing

Write `src/game/reputation.test.js`:
- Test addReputation: normal, overflow (cap at 100), underflow (cap at 0)
- Test getTier at each threshold boundary
- Test applyDecay: reduces by 1, doesn't go below 0
- Test meetsRequirement with single and multi-NPC requirements
- Run: `npx vitest run`

## After completing changes

- Commit with message: `feat: add per-NPC reputation system with tier gating`
- Do NOT push

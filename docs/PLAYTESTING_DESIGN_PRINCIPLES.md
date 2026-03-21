# Garden OS — Playtesting-Derived Design Principles

Source: Notion research brief REF-32a255fc
Generated: 2026-03-21

---

## The 10 Principles

1. **Cause-and-effect must be visible.** If the engine knows something, the player must be able to see it. Factor bars without tooltips, event damage without cell state, scoring without explanation — all create confusion with no recovery path.

2. **Every phase transition needs explicit next-action text.** The player should never be enabled without knowing what to do. Phase guidance is not optional — it's the difference between "I'm stuck" and "I know what's next."

3. **Auto-targeting destroys strategy feel.** The player always selects the target cell. The machine never auto-selects. Even when there is only one valid target, the player taps it. That tap is the moment of agency.

4. **Persistent visual state for every mechanic.** If a number exists in the engine but has no visual representation, it effectively doesn't exist as a mechanic. Soil fatigue, infrastructure flags, carry-forward effects — all must be visible on the cell.

5. **Highlight systems need hard reset.** Transient effects layer on top of canonical scene state and always have a teardown path. If the base visual state isn't immutable, mood/highlight bleeds are inevitable.

6. **Labels must match behavior exactly.** Every UI label is a potential confusion point. "Beat" vs "phase", "token" vs "action", "faction" vs "crop type" — precision in language is precision in comprehension.

7. **Mobile-first interaction.** Touch targets, scroll behavior, and input routing must work on a phone before they work on desktop. If a button requires scrolling to find, it doesn't exist.

8. **Cutscenes hand back cleanly.** `onFinish` must re-enable game input AND update phase guidance text simultaneously. Enabled-but-lost is worse than disabled-and-waiting.

9. **Push small verified fixes.** Narrow patches, not bundled fixes. Each commit should fix one thing and be testable in isolation.

10. **Annoying bugs are architecture bugs.** Stuck highlights, stale state, phantom selections — these are always base-state management failures, not rendering bugs.

---

## The Three-Question Test

Apply to every mechanic: **Can the player choose? Can they see the result? Do they know what's next?**

| Mechanic | Can choose? | Can see? | Knows what's next? |
|---|---|---|---|
| Crop placement | ✅ | ✅ | 🟡 only if guidance text shown |
| Event response | 🔴 if auto-targeted | 🔴 if no cell state shown | 🔴 if phase text absent |
| Soil fatigue | ✅ | 🔴 no visual indicator | 🟡 unclear recovery path |
| Infrastructure | ✅ | ✅ | 🟡 benefit unclear at placement |
| Cutscene advance | ✅ | ✅ | 🟡 depends on onFinish wiring |

Every 🔴 is a build failure. Every 🟡 is a risk.

---

## Priority Build Tasks From Principles

### 🔴 P1: Event response needs explicit player-selected targeting
- No auto-selection even in single-valid-target cases
- The player taps the cell. That tap is the moment of agency.
- Affects: intervention system in garden-league-simulator-v4.html

### 🔴 P2: Soil fatigue needs a visual state
- Currently a number in the engine, completely invisible to the player
- Needs a cell overlay or indicator showing fatigue level
- Per Principle 4: invisible mechanics don't exist as mechanics

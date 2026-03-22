# Unity Port Evaluation

## The Decision

**Should Let It Grow port to Unity or stay web-native (Three.js)?**

## Current State

The existing Three.js codebase is production-quality:
- 34 source files, well-modularized
- Full rendering pipeline with shadows, weather, seasonal lighting
- Procedural scenery and character animation
- Responsive mobile support
- Vite build pipeline with offline capability

## Option A: Unity (Fastest to Multi-Platform)

### Pros
- Native iOS/Android builds without wrapper overhead
- Asset pipeline (sprites, audio, animation) built-in
- Physics engine included
- Larger talent pool for hiring
- Proven path to App Store / Google Play

### Cons
- Rewrite all 34 source files
- Lose web-native deployment (instant play, no install)
- Unity licensing costs at scale
- Heavier runtime for what is a cozy 2D/2.5D game
- Build times slower than Vite

### Effort
| Phase | Time |
|-------|------|
| Port core loop | 1–3 weeks |
| Systems integration | 2–6 weeks |
| Polish + deploy | 2–4 weeks |

### When Unity Makes Sense
- You want native App Store presence
- You need complex physics (you don't — garden sim)
- You plan to hire Unity developers
- Performance on low-end mobile is critical

## Option B: Stay Web-Native (Three.js + Vite)

### Pros
- Zero rewrite — build on what exists
- Instant play via URL (no install)
- PWA for mobile (add to home screen)
- Faster iteration (Vite HMR)
- Full control, no licensing
- Smaller bundle, faster load

### Cons
- iOS WebGL has quirks (Safari)
- No native notification/push without PWA setup
- Three.js community smaller than Unity's
- 3D performance ceiling lower than native

### Effort
| Phase | Time |
|-------|------|
| Continue building | 0 (no port needed) |
| PWA wrapper for mobile | 1–2 weeks |
| Performance optimization | Ongoing |

### When Web-Native Makes Sense
- You want to ship fast (you do)
- The game is cozy/casual, not AAA (it is)
- Web distribution matters (share a link)
- You're a solo dev or small team (flexibility > tooling)

## Recommendation

**Stay web-native. Port is not justified yet.**

Reasons:
1. You have 34 production-quality files — a port throws away months of work
2. Garden sim doesn't need Unity's physics/rendering power
3. Web = instant play, zero friction
4. PWA covers mobile well enough for v0.1–v0.4
5. Unity port only makes sense at v1.0 scale if native performance is needed

### Revisit Trigger
Consider Unity only if:
- iOS Safari WebGL causes unacceptable issues
- Multiplayer needs native socket performance
- You raise funding and hire a Unity developer
- App Store distribution becomes a business requirement

## Hybrid Option

**Ship web-native now. Evaluate Unity at v1.0.**

The modular architecture (data layer separated from rendering) means a future port would only rewrite `src/scene/` and `src/ui/` — the game logic (`src/game/`, `src/data/`, `src/scoring/`) is engine-agnostic and portable as-is.

# Hacker News Comment Strategy

## Goal
Drive technical discussion, pre-answer common criticism, and emphasize engineering novelty.

## Timing Sequence
1. Post `Show HN`.
2. Within 3-5 minutes, add architecture comment.
3. After first technical question, add scoring philosophy comment.
4. Add no-backend rationale only when asked or when thread shifts to infra concerns.

## Comment 1: Architecture Constraint
Use early to establish technical identity.

```text
One unusual constraint in Garden OS:
Every tool runs as a standalone HTML file.

No framework.
No backend.
No build pipeline.

That forced design decisions:
- schema-validated workspace model
- deterministic scoring
- portable .gos.json save files
- no infrastructure dependency

It behaves closer to a portable local app than a typical web SPA.
```

## Comment 2: Explainability Principle
Use when users ask "what is unique?"

```text
The scoring system is explainable on purpose.

It breaks score into weighted factors:
- sun fit
- support fit
- shade tolerance
- access fit
- season fit
- structural bonus
- adjacency effects

Then it highlights the limiting factor (Liebig's Law style), so a low score becomes a diagnosis instead of a black box recommendation.
```

## Comment 3: Why No Backend
Use when infra skepticism appears.

```text
No backend was intentional:
- offline use
- zero ops cost
- privacy (local-only data)
- durability (tool still works years later)

Export/import uses .gos.json, so gardens are portable without account lock-in.
```

## Comment 4: Call for Peer Review
Use to extend thread depth.

```text
Would love feedback specifically on the architecture tradeoff:
local-first single-file tools vs framework-heavy SPA stacks.

Where do you think this model breaks first as the system grows?
```

## Moderation Rules
- Keep replies technical and concise.
- Never argue taste; explain constraints and tradeoffs.
- Admit limits quickly.
- Post benchmarks/facts when available.

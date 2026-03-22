# Garden OS — Naming and Franchise Structure

## Brand Hierarchy

| Level | Name | Role |
|-------|------|------|
| Umbrella | **Garden OS** | Parent brand — always appears first |
| Mode 1 | **Story Mode** | Structured 12-chapter narrative simulator |
| Mode 2 | **Let It Grow** | Open-world sandbox expansion |

## Naming Rules

- Garden OS always appears as the parent brand
- Both modes are components, not standalone products
- UI naming: "Garden OS: Story Mode", "Garden OS: Let It Grow"
- Codebase paths: `garden-os/story-mode/`, `garden-os/let-it-grow/`

## Repository Strategy

Maintain shared code at the root level rather than immediately splitting into separate repositories.

### Shared Systems (Root Level)

| System | Why Shared |
|--------|-----------|
| Crop data (`specs/CROP_SCORING_DATA.json`) | Both modes use same crop definitions |
| Event deck (`specs/EVENT_DECK.json`) | Weather/challenge events apply everywhere |
| Scoring logic | Core quality mechanic |
| Design tokens | Brand consistency |
| Save mechanism patterns | Same localStorage approach |

### When to Split

A repo split only makes sense if Let It Grow's codebase becomes substantially independent with minimal shared resources. Until then, monorepo avoids duplication and keeps shared specs in sync.

## Future Modes

The framework anticipates additional modes:
- **Creative Mode** — unrestricted building/decorating
- **Challenge Mode** — timed/scored scenarios
- **Multiplayer** — shared persistent world

Each integrates into the same organizational framework under the Garden OS umbrella.

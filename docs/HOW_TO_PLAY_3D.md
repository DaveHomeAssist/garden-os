# How to play Garden OS in 3D

Player guide for the current 3D Story Mode build, written against `fa0d287` (23 November 2026). This describes what the code actually does. It is not a roadmap.

The in-game **How To Play** button on the title screen is still the in-product guide for scoring, tools, and the story loop. This page covers 3D movement, travel, and what is — and is not — in the build.

## Multiplayer is not in this release

There is no 3D multiplayer, co-op, shared world, room code, or invite flow in this build. You cannot host or join another player's garden. Mentions of multiplayer in older planning docs are future work, not a live feature.

Online accounts are also off. Sign-in and cloud save stay disabled until the privacy wording is approved. The in-game privacy note says Garden OS has no online features yet: your saves stay in this browser on this device, and the game sends nothing about you to a Garden OS server. You can export a save yourself. Clearing site data deletes it.

## Where to play

- The canonical game is Story Mode, built from `story-mode/` and published on GitHub Pages.
- The same game is embedded at [mixmash.games/garden/](https://mixmash.games/garden/).

Open the title screen, then choose a mode.

## Modes

| Mode | What it is | Progress |
|---|---|---|
| Story Mode | The campaign. Pick a gardener, tend the backyard one season at a time, and follow the story. | Three local save slots, plus export and import. |
| Free Play | Open 3D play with world tools, without the campaign save. | Session-only. It is discarded when you refresh the page. |
| Story Planner | A planning preview. | Session-only, discarded on refresh. |

Daily Challenge and Speedrun are listed in the in-game guide as coming soon and are locked in this release.

Let It Grow tools (hand, plant, water, protect, mulch, harvest) are available in Free Play from the title-screen menu.

## Moving around

You walk a gardener through a 3D yard and, when the story opens it, a village and other nearby places.

- The camera follows your gardener. You can also look around: on a mouse, drag to orbit; on a touch screen, drag on the right side of the screen. Pinch with two fingers to zoom.
- Walk up to something you can use. A prompt appears when you are close enough. Press **E**, or tap the prompt, to use it. In the village, **E** is the interact key; **Enter** and **Space** are reserved for menus, dialogue, and confirming a selected bed cell.
- **M** opens the world map (also in the pause menu, which is how you open it on a phone).
- **Esc** pauses, or backs out of the current menu.

Exact camera framing can change as the 3D pass continues. The actions above stay the same: move your gardener, look around, and interact when a prompt appears.

## Keyboard

| Keys | Action |
|---|---|
| `W` `A` `S` `D` or arrow keys | Move |
| `E` | Interact with a nearby prompt (yard, village, and other places) |
| `Enter` or `Space` | Confirm a selected bed cell, or advance a cutscene or dialogue |
| `P` | Open the seed palette |
| `B` | Open the backpack |
| `M` | Open the world map |
| `Esc` | Pause, or close the current surface |
| `Tab` or `]` | Next tool |
| `Shift+Tab` or `[` | Previous tool |
| `1`–`6` | Jump to a tool slot |

## Mouse and touch

- Click or tap a bed cell to select or use it, depending on the current tool.
- On a phone or tablet, a movement stick sits on the left side of the screen. The right side is for looking around. A short tap on the right still reaches buttons and prompts underneath.
- Tool buttons along the bottom switch tools on a touch device.
- The pause menu includes World Map, so you do not need the `M` key on a phone.

## Tools

These are the Let It Grow tools, shown in the in-game guide:

| Tool | Use on | Wait before reuse |
|---|---|---|
| Hand | Any highlighted cell or crop | — |
| Plant | Empty cells only | — |
| Water | Planted cells only | 30 s |
| Protect | Planted, unprotected cells | 60 s |
| Mulch | Open, unmulched cells | 120 s |
| Harvest | Late-season ready crops | — |

## Saving

Story Mode uses three persistent save slots in this browser. You can export a slot and import it again later, including on the mixmash.games embed, which stores Story Mode saves under Garden OS.

Free Play and Story Planner do not keep a resumable save across a refresh.

## If something is missing

- There is no join-code or host button, because multiplayer is not shipped.
- There is no sign-in button, because online features are not active.
- For scoring, season beats, interventions, and the story loop, use **How To Play** on the title screen.

# Garden OS — Status Check Protocol

Paste this into any Claude session to get a quick status readout.

---

## Prompt

```
Garden OS status check. Report the following:

1. **Branch & dirty state** — current branch, uncommitted file count, any stashed work
2. **Last 5 commits** — one-line format
3. **Test health** — run `npx vitest run` from `story-mode/`, report pass/fail/skip counts
4. **Build health** — run `npx vite build` from `story-mode/`, report success or errors
5. **Sandbox mode** — does `state.js` export `createSandboxState`? Is it wired into `game-init.js`?
6. **Sky rendering** — check `garden-scene.js` sky canvas: does `fillRect` width match `skyCanvas.width`?
7. **Open UX items** — grep for `TODO|FIXME|HACK` across `src/ui/` and `src/scene/`
8. **Spec drift** — count crops in `CROP_SCORING_DATA.json` vs what `getCropsForChapter(12)` returns. Match?

Working directory: garden-os-windows/story-mode/
```

---

## Expected healthy output

```
Branch: main (clean)
Tests:  17 passed, 107 green, 0 failed
Build:  vite build success
Sky:    fillRect covers full canvas width
Specs:  crop count matches
```

## Red flags to watch for

- `lightingState` is null during first render frames — cutscene styles may flash black
- Pipe-character filenames (`IMG | garden-os-build`) can't be unstaged via shell
- `cutscenes.test.js` is excluded from vitest (calls `process.exit`)
- 120B ollama model can spike laptop power — stick with 20B for local runs

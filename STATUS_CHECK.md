# Garden OS — Status Check Protocol

Paste this into any Claude session to get a quick status readout.

---

## Prompt

```
Garden OS status check. Report the following:

1. **Branch & dirty state** — current branch, uncommitted file count, any stashed work
2. **Last 5 commits** — one-line format
3. **Test health** — run `npm test` from `story-mode/`, report pass/fail/skip counts
4. **Build health** — run `npm run build` from `story-mode/`, report success or errors
4b. **Full gate** — run `node scripts/verify-all.mjs` from the repo root (the same gate `.github/workflows/pages.yml` runs before deploy) and report the first failing step, if any
5. **Sandbox mode** — does `state.js` export `createSandboxState`? Is it wired into `game-init.js`?
6. **Sky rendering** — check `garden-scene.js` sky canvas: does `fillRect` width match `skyCanvas.width`?
7. **Open UX items** — grep for `TODO|FIXME|HACK` across `src/ui/` and `src/scene/`
8. **Spec drift** — count crops in `CROP_SCORING_DATA.json` vs what `getCropsForChapter(12)` returns. Match?

Working directory: `<repo-root>/story-mode/`
```

---

## Expected healthy output

```
Branch: main (clean)
Tests:  all files passed, 0 failed (do not hand-copy counts here; the
        number changes with every test added and a stale figure reads
        as a regression)
Build:  npm run build success
Gate:   node scripts/verify-all.mjs passed every step
Sky:    fillRect covers full canvas width
Specs:  crop count matches
```

## Red flags to watch for

- `lightingState` is null during first render frames — cutscene styles may flash black
- Pipe-character filenames (`IMG | garden-os-build`) can't be unstaged via shell
- `cutscenes.test.js` is excluded from vitest (calls `process.exit`)
- 120B ollama model can spike laptop power — stick with 20B for local runs

# Per-asset agent brief

Shared instructions for every sub-agent iterating on one asset of the showcase.
Read this first, then your own task prompt for the file ownership and views.

## The one goal

This is a look test. Gameplay is deliberately tiny. The only thing that matters
is whether a stranger shown a screenshot would say *"that's from a real offroad
game"* rather than *"that's a Three.js demo"*. Stylised-realistic, the Forza
Horizon / theHunter neighbourhood. Clean shapes are fine. Flat, plasticky,
untextured, or obviously-instanced is not.

## Hard rules

- **No downloaded assets.** No model files, no image files, no external URLs.
  Every texture is generated from noise or drawn on a canvas at runtime
  (`src/textures/core.js` has the toolkit); every mesh is built from primitives
  (`src/lib/geo.js` has the kit-bash helpers, including a merging `Kit`).
- **Only edit the files you own.** Another agent is working on every other file
  at the same time. If you need a change outside your files, note it in your
  final report instead of making it.
- **No git commands other than `git add` / `git commit`** on your own branch.
  Never push, never merge, never switch branches.
- **Keep it fast.** Target 60 fps on a mid-range laptop GPU. Instance anything
  that repeats, merge static geometry with `Kit`, and keep an eye on the draw
  call and triangle counts printed by the shots tool. If something is expensive,
  optimise it — do not delete the look.
- Match the surrounding code style: no narration comments, comments only where
  they explain a constraint or a non-obvious trade-off.

## Setup

```bash
npm install                       # node_modules is gitignored, so install first
npx vite --host 127.0.0.1 --port <YOUR PORT> &
```

Use the port given in your task prompt so you do not collide with other agents.

## The loop

Run numbered iterations. Each one:

1. Implement the current fix list.
2. Capture your views:
   ```bash
   node tools/shots.mjs --iter N --views <your views> \
     --width 560 --height 315 --settle 1200 \
     --url "http://127.0.0.1:<YOUR PORT>/?quality=fast"
   ```
   Output lands in `shots/iter_N/`. Rendering is software (SwiftShader), so
   expect roughly 10-30 s per view. Capture only the views you own.
3. **Open every screenshot with the image reader and actually look at it.**
   Do not skip this and do not guess from the code.
4. Score your rubric items pass/fail with a one-line reason each, and write the
   next fix list, worst failure first. Be harsh: a maybe is a fail.
5. Commit, then loop.

Do at least 6 iterations. Stop when your items all pass twice in a row, or when
you have done 10, whichever comes first.

## Debugging tools already in the repo

| Tool | Use |
|------|-----|
| `tools/shots.mjs` | the beauty views, with a black-frame luminance guard |
| `tools/probe.mjs` | dump the scene graph, mesh names, triangle and instance counts |
| `tools/dbgshot.mjs` | fast low-res diagnostic renders |
| `tools/sweep.mjs` | render one view under several lighting setups in one page load |
| `tools/lightprobe.mjs` | report every light, then render controlled variants |

In the page, `window.debugAPI` exposes `setView`, `renderFrames`, `captureFrame`,
`sampleLuma`, `stats`, `toggle(pass, on)`, `exposure(v)` and `objects` (the live
scene, camera, renderer, terrain, forest and vehicle).

## Traps already hit on this project — do not repeat them

- **Anything that can produce NaN will black out the whole frame.** A NaN pixel
  survives into bloom, the blur spreads it everywhere, and the image goes black.
  Watch for `normalize()` of a possibly-zero vector, `pow()` of a negative base,
  and division by a value that can be zero. The shots tool warns when a frame
  comes back essentially black.
- **`alphaMap` is sampled from the green channel**, not alpha. For a canvas
  texture with transparency, set `map` and `alphaTest` and leave `alphaMap` unset.
- **Clamp every `dt`.** A zero dt turns an acceleration term into NaN and poisons
  transforms downstream.
- **Metalness is not a "shinier" dial.** Painted surfaces are dielectric with a
  clearcoat; pushing metalness up desaturates them into bare aluminium.
- Merged geometry needs a consistent attribute set. `Kit` handles that, use it.

## Report back

Finish with: the branch name you committed to, the files you changed, your final
rubric scores, what is still weak, and anything you needed from a file you do
not own.

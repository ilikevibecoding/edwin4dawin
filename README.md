# Ridgeline Trail

A Forza-style beauty showcase built with Three.js: one 4x4 truck, a dirt two-track, and
the forest around it. Everything is generated in code — no downloaded models, no
downloaded textures, nothing fetched at runtime.

![Hero view](shots/iter_12b/hero.png)

## Play it

**[Open the demo](https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html)**
— needs WebGL2. First load generates every texture on a canvas, which takes a moment.

| Control | |
|---|---|
| **Click** | walk round the truck — front, hero, rear, wheel, cab, then back to the chase cam |
| **Drag** | turn the driver's head from inside the cab; swing the camera round the truck from outside |
| **Wheel** | pull in or back off |
| `W A S D` | drive (`Shift` boosts, `R` hands back to auto-drive) |
| `C` | chase / bonnet / cockpit / orbit |
| `N` | day / dusk / night |
| `L` | lights |
| `1`–`8` | jump straight to any of the eight fixed views |

The named views track the truck rather than freezing it, so you can sit on the nose or
in the cab while it is still moving. The instruments are live — the needles read the
speed and the revs, and the rest drift on their own clocks.

`?time=night` and `?time=dusk` boot straight into those modes. Each is its own lighting
rig rather than a dimmed version of the last: moonlight as a real key, headlamps that
carry the frame, and their own exposure, bloom, ambient occlusion and grade.

There are two roads: the dirt two-track you start on, and a graded gravel mainline it
crosses about sixty metres ahead. Auto-drive takes the turn onto it by itself, or press
`W` at the apron and steer on yourself.

### Quality

`?quality=` takes `fast`, `high` (the default) or `ultra`.

| | fast | high | ultra |
|---|---|---|---|
| draw calls | 429 | 470 | 595 |
| triangles | 3.6 M | 4.7 M | 9.6 M |
| shadow map | 1024 | 2048 | 4096 |
| forest instances | 39 k | 55 k | 92 k |
| screen-space reflections | no | `?ssr=on` | yes |
| pixel ratio cap | 1 | 1.5 | 2 |

`fast` exists for the software-rendered capture harness and is not worth using on a GPU.
`ultra` assumes a card with 4 GB or more and enough fill rate for roughly a dozen
alpha-tested layers per pixel at pixel ratio 2 — those are reasoned budgets, not
measured ones, because this was developed against a software rasteriser.

### Hosted copies

`demo/index.html` is a self-contained 1.1 MB build with no external references, so any
static host will serve it. Three that need no setup:

| Link | Behaviour |
|------|-----------|
| [`htmlpreview.github.io`](https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html) | Renders directly. One click, nothing to dismiss. |
| [`rawcdn.githack.com`](https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html) | A real CDN edge with a 24 h cache, but shows a one-time "external content" notice you have to click past. |
| [`cdn.jsdelivr.net`](https://cdn.jsdelivr.net/gh/ilikevibecoding/edwin4dawin@cursor/offroad-truck-forza-demo-8461/demo/index.html) | Fastest and most reliable, but jsDelivr forces `text/plain` on `.html`, so this shows source rather than running. Use it to download or embed. |

These follow the branch tip. Substitute a commit SHA for the branch name to pin a
version.

## Run it locally

```bash
npm install
npm run dev            # dev server
npm run build          # normal production build
npm run build:single   # regenerate demo/index.html
node native/build.mjs  # rebuild the Rust noise kernel (needs a Rust toolchain)
```

The generated wasm module is committed, so a checkout without Rust still builds and
still gets the accelerator.

`?quality=fast` on the URL drops the shadow map, AO samples and forest density — it
exists for the capture harness on software rendering, and is not worth using on a GPU.

## How it is built

| Area | Files |
|------|-------|
| Truck | `src/vehicle/` — `spec.js` is the single source of truth for every dimension; body, wheels, details and interior are kit-bashed from primitives and merged per material |
| Ride | `src/drive.js` — the body rides a least-squares plane fitted through the four contact patches, on critically damped springs, and the suspension takes up the rest |
| Forest | `src/forest.js`, `src/textures/nature.js` — instanced conifers and broadleaves with volume-card crowns, mixed understory, painted billboard stands for the distance |
| Ground | `src/terrain.js`, `src/textures/ground.js` — graded two-track with wheel bands, ruts holding standing water, aggregate standing proud of the surface |
| Look | `src/sky.js`, `src/post.js`, `src/palette.js` — analytic sky feeding a PMREM environment, sun plus an art-directed bounce spot, ACES through a non-clipping S-curve, GTAO, bloom, SMAA, vignette, grain, sub-pixel chromatic aberration |
| Motion | `src/drive.js`, `src/dust.js`, `src/camera.js`, `src/hud.js` |
| Noise | `native/noise` — Rust compiled to wasm32, bit-exact against the JS in `textures/core.js`, 1.88x faster. `?nowasm=1` forces the JS path |

Textures are drawn on canvases at load (`src/textures/core.js`) and uploaded as data
textures rather than canvas textures, because a canvas stores its pixels premultiplied
and that quietly destroys the colour behind every cutout's transparent pixels.

## Harness

`tools/` drives the app through `window.debugAPI` under Playwright:

| Tool | Purpose |
|------|---------|
| `shots.mjs` | capture the beauty views deterministically, with a luminance report per frame |
| `perf.mjs` | per-pass frame cost |
| `probe.mjs`, `lightprobe.mjs` | scene-graph and lighting state dumps |
| `isolate.mjs`, `sweep.mjs`, `camvar.mjs` | hide scene elements, sweep lighting setups, sweep camera framing |
| `interact.mjs` | drive the mouse and keyboard controls, asserting where the camera lands in the truck's own frame |
| `ride.mjs` | step the driver and camera headlessly and report ride quality as numbers, since it cannot be seen in a frame |
| `wasmcheck.mjs` | assert the Rust kernel matches the JS bit for bit over 300k samples, and time both in a real browser |
| `cdnboot.mjs`, `cdndump.mjs` | confirm a hosted build boots, and show what a browser receives as opposed to `curl` |

`interact.mjs` takes `--raw --url <hosted url>` to run the same checks against a
deployed copy.

## Log

`PROGRESS.md` is the full build log: twelve iterations of capture, score against a
nine-item rubric, fix. The entries worth reading are the ones where the obvious culprit
turned out to be innocent — canopy slivers that were premultiplied alpha rather than the
four iterations of shader tuning spent on them, a distant treeline that was a squeezed
billboard constant rather than fog, trail corduroy that was anisotropic filtering rather
than the tread, and a crawling paint weave that was a beat frequency between two noise
octaves.

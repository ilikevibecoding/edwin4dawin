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
| **Drag** | swing the camera round it |
| **Wheel** | pull in or back off |
| `W A S D` | drive (`Shift` boosts, `R` hands back to auto-drive) |
| `C` | chase / hood / orbit |
| `L` | lights |
| `1`–`8` | jump straight to any of the eight fixed views |

The named views track the truck rather than freezing it, so you can sit on the nose or
in the cab while it is still moving.

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
```

`?quality=fast` on the URL drops the shadow map, AO samples and forest density — it
exists for the capture harness on software rendering, and is not worth using on a GPU.

## How it is built

| Area | Files |
|------|-------|
| Truck | `src/vehicle/` — `spec.js` is the single source of truth for every dimension; body, wheels, details and interior are kit-bashed from primitives and merged per material |
| Forest | `src/forest.js`, `src/textures/nature.js` — instanced conifers and broadleaves with volume-card crowns, mixed understory, painted billboard stands for the distance |
| Ground | `src/terrain.js`, `src/textures/ground.js` — graded two-track with wheel bands, ruts holding standing water, aggregate standing proud of the surface |
| Look | `src/sky.js`, `src/post.js`, `src/palette.js` — analytic sky feeding a PMREM environment, sun plus an art-directed bounce spot, ACES through a non-clipping S-curve, GTAO, bloom, SMAA, vignette, grain, sub-pixel chromatic aberration |
| Motion | `src/drive.js`, `src/dust.js`, `src/camera.js`, `src/hud.js` |

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

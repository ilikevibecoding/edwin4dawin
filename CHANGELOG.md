# Changelog

Newest first. Every entry names the build it shipped in, which is also what the
HUD shows in the bottom-right corner of the running game, so a screenshot can be
matched to an entry.

**Live preview:** https://htmlpreview.github.io/?https://raw.githubusercontent.com/ilikevibecoding/edwin4dawin/cursor/offroad-truck-forza-demo-8461/demo/index.html
— follows the branch tip. Add `?quality=ultra` for a discrete GPU, `?time=dusk|night` for the hour.
**Local fallback:** `npm install && npm run dev`, or `npm run build:single` and open `demo/index.html` over any static server.

Performance numbers in this file are measured with `tools/perfrun.mjs` from the
game's own frame loop. The development box renders in software, so fps and
frame time recorded here describe the rasteriser, not a GPU; draw calls,
triangles, visible objects, textures, heap and boot stages are real everywhere.
Run `node tools/perfrun.mjs --gpu` on a machine with a graphics card for the
numbers the targets are about.

---

## Safari, iteration 16 — foundation (in progress)

**Build:** see PROGRESS.md iteration 16 for the revision when it lands.

### What changed

- The route is now written down once, in `src/world.js`, as road parameters:
  hero truck on the spur → junction → graded mainline → campground → open
  savanna → the pride. Auto-drive turns toward the camp at the junction.
- Skeleton modules with contracts for the campground, the vehicle fleet, the
  wildlife and the audio, wired into boot and the frame. Eight specialists are
  filling them in in parallel.
- The build stamps its git revision into the bundle and the HUD shows it.
- Seven camera modes: chase, bonnet, cockpit, cinematic director (six shots,
  two of them planted beside the road so the truck drives through frame),
  wildlife long lens from the roof hatch, inspection orbit, and photo mode (`P`).
- Performance sampling from the live loop (`debugAPI.perf`, `tools/perfrun.mjs`).
- Shaders compiled during the loading screen instead of on the first frame.

### Measured

| | before | after |
|---|---|---|
| worst in-game frame (software raster, `fast`) | 13,870 ms | 774 ms |
| "Compiling shaders" boot stage | 6 ms (lazy, hidden in first frame) | 10,635 ms (real) |
| draw calls / triangles (`fast`) | 424 / 3.64 M | unchanged |
| JS heap after 3 reset loops | — | 224.1 → 224.3 MB (+0.2) |
| console/page errors | 0 | 0 |

### Frames

`shots/interact5/` — camera-mode checks, all 21 passing.

### Known limitations

- The world is still the forest until the wave-one specialists land.
- GPU time reports n/a under the software rasteriser even though the timer
  extension is present; queries never resolve inside the sampling window.

### Failed experiments

None yet this iteration.

### Next weakest area

Everything downstream of the biome change: vegetation, ground colour, lighting,
the campground, the fleet, the lions.

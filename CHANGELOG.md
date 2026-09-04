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

## Gauntlet round 1 — verdict, and two measured wins

**Build `45a2074`** — live, smoke-tested (HUD reads `build 45a2074 · 2026-09-04 14:17Z`, zero page errors).

- Three blind critics scored the baseline (`gauntlet/round1/critic_{A,B,C}.md`);
  consensus and the disagreements that were investigated rather than averaged
  are in `gauntlet/round1/CONSENSUS.md`, key frames in `gauntlet/round1/frames/`.
  Weakest area by unanimous verdict: the lions (head, proportions, coat, gait);
  system defect: glass and reflections; highest-leverage fix: shadow coverage —
  the sun's shadow box is 44 m around the truck, so the camp and the pride are
  shadowless from the road.
- Two unanimous critic findings were capture artefacts and are fixed in the
  tools: the walk strip's camera followed the lion (read as sliding feet — the
  probe was right, the feet hold), and the camp/lion tools did not move the
  shadow frustum with the teleported truck. Lion far/pride/seat and camp
  arrive/interior cameras re-planted so they show their subjects.
- HUD key strip wraps clear of the speed block at narrow widths.
- **Shader programs 277 → 159**: the boot compile ran with the screen bound and
  built every program tone-mapped, then the composer built them all again
  linear; now compiled into the composer's target. Draw calls and triangles
  unchanged.
- **JS heap 332 → 216 MB**: DataTexture pixel arrays dropped after upload
  (109 MB that was never read again). Flat over reset loops; frames identical.
- `perf/census-r1.md`: a measured attribution of programs, triangles, textures
  and heap to modules, with ten ranked wins; the rest go to their owners in
  round 2/3 (terrain tiles, fleet per-vehicle merge, forest cells, kit
  indexing, shadow-caster list, cache keys).
- Round 2 builders running in parallel: lion body+gait, lion head, glass,
  lighting, road/terrain, fleet, vegetation, campground.

## Gauntlet round 1 — baseline

**Build `8754528`** — live, smoke-tested (HUD reads `build 8754528 · 2026-09-04 12:46Z`, zero page errors).

- Removed the forest-era ridge cards: two unlit, unfogged rings of pale ridge
  silhouette at 560/690 m that stood among the far hills as a band brighter
  than the sky, with a dark line at their base. The horizon is the terrain's
  hills now. Before/after `shots/iter_16/forest.png` → `shots/cand_noridge/forest.png`.
- Seven fixed cameras for the car-glass gauntlet (`glass_*` views), hidden from
  the default capture and the digit keys. Round-one glass frames in
  `shots/glass_r1/day/`.
- `gauntlet/RUBRIC.md`: the eighteen categories, scale, report shape and gate.
  97 baseline frames in `shots/round1/`; three blind critics score them.
- Measured (`fast`, software raster): 453 calls, 2.57 M tris, 277 programs,
  275 textures, heap 334 MB flat over three reset loops, zero errors. Shader
  compile is 24.3 s of a 43 s software boot; the program count is the next
  performance target.

## Safari, iteration 16 — the biome change

**Build `2f0f5ba`** — live, smoke-tested (page boots, HUD reads `build 2f0f5ba · 2026-09-04 12:07Z`, zero page errors). Supersedes `34d3fc8`, which lacked the lions.

- **The pride landed**: a maned male, three lionesses, two cubs on a 34-bone
  skeleton with three detail tiers. Feet are solved, not approximated —
  independently re-run: 1,200 frames, 268 steps, max penetration 2.3e-14 m,
  max planted-foot slide 8.5e-14 m. Frames in `shots/lion_16/`. Round-one
  inventory for the lion gauntlet: the face is the weak point (small head,
  boxy muzzle, a mouth line that reads as a grin, fur as smooth suede), the jaw
  never opens, and the mane has no chest fringe.

### What changed

- **The world is East-African savanna.** Laterite roads, straw grassland, umbrella
  and flat acacias, marula, thorn scrub, dead trees, three granite kopjes,
  termite mounds, a dry riverbed under a culvert, a water hole with a mud margin,
  far hills. Trees thin toward the open plain.
- **Two roads and a route.** The spur crosses a graded gravel mainline; auto-drive
  turns toward the camp. A graded pad, an access apron, an overlook with a
  signboard, park signs, kilometre posts, a ranger boom gate.
- **A tented camp**: 118 objects, twelve parking slots, a lookout, radio mast,
  solar, water, fuel stored away from fire, thorn boma, fire pits with GPU
  particles and lanterns that light at night.
- **A fleet of twelve** (sixteen at `ultra`) across ten kinds, none clones.
- **Four hours**: day, dusk (golden hour), night, overcast; kilometre haze,
  crepuscular rays through dust, heat shimmer.
- **The hero truck** gains a roof tent, spotlight, swing-out spare, fridge slide,
  reverse lamps, laterite dust with bush scoring — and its glass, which round zero
  of the glass gauntlet found had never been rendering (see PROGRESS.md).
- **Sound**, all synthesised: engine with audible upshifts, tyres that change
  with the surface, wind, a savanna ambience bed, horn on `H`.
- Seven camera modes, a revision stamp in the HUD, a deploy tool that proves the
  live page serves HEAD, and a performance harness.

### Measured (`fast`, software raster — structural numbers are real, fps is not)

| | before | after |
|---|---|---|
| draw calls | 429 | 395 (hero) · 483 (camp arrival) |
| triangles | 3.64 M | 2.16 M |
| ride, chase / cockpit vertical RMS | 1.24 / 1.35 m/s² | 1.12 / 1.06 m/s² |
| worst in-game frame | 13,870 ms | 774 ms |
| heap over 3 reset loops | — | +0.2 MB |
| camera checks | 21 | 33, all passing |
| console / page errors | 0 | 0 |

### Frames

`shots/iter_16/`, `shots/iter_16d/`, `shots/iter_16n/`, `shots/camp_16/`, `shots/camp_16n/`.

### Known limitations

- The lions are still in flight; the wildlife camera points at where they will be.
- A pale band and a thin dark line at the far skyline (vegetation skirt at
  420 m plus forest-era ridge cards).
- Water reflections still forest-blue.
- GPU time reports n/a under the software rasteriser.

### Failed experiments

- Building the deploy bundle from the working tree while agents were editing:
  failed twice on half-finished terrain imports. Deploys now build from HEAD.
- Stubbing the Vite client with an empty body to survive HMR reloads: strips
  `define` and breaks the build stamp. Three agents hit it; the stub keeps the
  env module now.

### Next weakest area

The lions, then the far skyline band, then gauntlet round one across every
family with three critics.

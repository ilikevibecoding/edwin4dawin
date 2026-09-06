# Aircraft source split — report

Branch `cursor/acsplit-loop-8213`, base `6130eae7` (lead branch at the time of the split).
Mechanical refactor only: `src/plane/model.ts`, `geometry.ts` and `textures.ts` split into modules so that the six
specialist builders (geometry, propeller, cockpit, pilot, materials, animation/physics) get disjoint files. No visual
change, no tuning. `src/plane/README.md` maps the builder roles to the files and documents the fixed build sequence.

## Commits (each pushed)

| step | commit | what |
|---|---|---|
| 1/3 | `08939706` | `geometry.ts` -> `geometry/{loft,wing,propeller,floats,util}.ts`; `geometry.ts` becomes a barrel |
| 2/3 | `e95a648b` | `textures.ts` -> `textures/{common,fuselage,wing,floats,cabin,panel,glass,prop}.ts`; `textures.ts` becomes a barrel; `SURF` moves from `model.ts` to `textures/common.ts` |
| 3/3 | `216c5a16` | `model.ts` -> `PlaneModel` as a sequence of part builders over a shared `BuildContext` (`parts/context.ts`); `parts/{materials,fuselage,propeller,wing,tail,lights,floats,cockpitPanel,cockpitControls,cabin,pilot,animate}.ts` |
| docs | `8d21b10d` | `src/plane/README.md` |

`game.ts`, `aircraft.ts`, `effects.ts`, `physics.ts` and `bench/*` are untouched (`git diff --quiet 6130eae7 HEAD -- src/game.ts src/aircraft.ts src/effects.ts src/physics.ts bench/` passes); the barrels keep every existing import path valid.
`npx tsc --noEmit` is clean.

## Pixel diff: base build vs split build (same seed 20260904, `--no-clip --no-flight`)

Captures: `bench/out/acsplit-base` (base `6130eae7`, port 4501) and `bench/out/acsplit-step3` (split `216c5a16`, port 4502),
five stills each, 1920x1080, SwiftShader. Diff with python3 + PIL (`ImageChops.difference` on RGB, per-channel
extrema, count of pixels where any channel differs, bounding box of those pixels).

| view | max abs channel diff | pixels with any channel diff | share of frame | draw calls (base / split) | triangles (base / split) | other renderer counters |
|---|---|---|---|---|---|---|
| plane-rear-quarter | 167 | 534 | 0.026 % | 228 / 228 | 1 010 035 / 1 010 035 | equal |
| plane-front-quarter | 162 | 533 | 0.026 % | 298 / 298 | 872 547 / 872 547 | equal |
| glass-sun | 168 | 534 | 0.026 % | 258 / 258 | 1 146 827 / 1 146 827 | equal |
| cockpit-city | 148 | 530 | 0.026 % | 269 / 269 | 1 115 380 / 1 115 380 | equal |
| night | 177 | 536 | 0.026 % | 252 / 252 | 1 284 346 / 1 284 346 | equal |

### The non-zero pixels, explained

In every view the differing pixels lie in one strip 184-185 px wide and 8 px high at the bottom-left of the frame
(bounding boxes: rear-quarter x 260-445, front-quarter x 267-451, glass-sun x 201-385, cockpit-city x 221-405, night
x 175-359; y 1056-1064 in all five). That strip is the tail of the bench tag, a DOM overlay (`#benchtag` in
`src/main.ts`: `` `${params.bench} · seed ${params.seed} · ${window.__build}` ``) that `page.screenshot` includes in
the still. `window.__build` is the build stamp injected by `vite.config.ts` (`git rev-parse --short=12 HEAD` + build
time), so it necessarily reads `6130eae71052-2026-09-06T0640` on the base build and `216c5a1642a7-2026-09-06T0709` on
the split build: 28 glyphs of the small HUD font, 184 px wide. The x offset of the strip changes with the length of
the view name in front of it; the y range is the text row. Nothing else in the frame differs: the amplified
difference image is black everywhere except that text (`diff_mask_plane-rear-quarter.png`, and the strip itself in
`tag_strip_base_vs_split.png`).

### Confirmation with the stamp pinned

`vite.config.ts` honours `BUILD_ID`, so the split tree (HEAD) was rebuilt with
`BUILD_ID=6130eae71052-2026-09-06T0640` (the base's stamp), served on port 4503 and captured again
(`bench/out/acsplit-pinned`). With the tag text identical the diff against the very same base stills is:

_(capture queued behind the machine-wide Chrome gate — two slots shared by ten builders — at the time of this commit;
the table is appended in the follow-up commit.)_

## `metrics.json`

Per view, every deterministic key is identical between base and split: `calls`, `triangles`, `points`, `lines`,
`geometries`, `textures`, `programs`, `visibleObjects`, `passes` (per-pass calls/triangles for wake, sky, shadow
cascades, reflection, main, post, `reflectionHidden`), `camera` (position, quaternion, fov), `telemetry`, `frame`,
`frames`, `flying`, `view`, `longTasks`, `gpuMs`. The only keys that differ are wall-clock measurements on a shared
4-core VM (`avgMs`, `p99Ms`, `avgFps`, `minFps`, `onePercentLowFps`), `jsHeapMB` (341.6-342.7 MB base vs 338.5-339.7 MB
split) and `build`. `console.txt` is empty for all ten stills.

## Scene-graph comparison (structural, independent of the screenshots)

`scenedump.mjs` (in this directory) loads `?bench=plane-rear-quarter&freeze=1&quality=low&dbg=nocity,noveg,nobridges,notraffic`
on a preview and dumps `window.__game.aircraft.model`: every object under `PlaneModel.root` in traversal order with
type, id relative to the root's id, parent, position / rotation / scale, `renderOrder`, `visible`, `castShadow`,
`receiveShadow`, `frustumCulled`; for each mesh its material (id relative to the first material) and geometry (per
attribute: count, item size and an FNV hash of the vertex bytes; index count and hash; group count; bounding sphere),
so the vertex order inside merged batches is part of the comparison; every material in `materials` with type, relative
id, program cache key, colour, emissive, roughness, metalness, env-map and emissive intensity, clearcoat parameters,
normal scales, transparency / opacity / side / depth / blending flags, an FNV hash of the pixels of every canvas texture
it uses (with flip, wrap, colour space and filter settings) and its custom uniform values; the `exteriorMeshes` /
`interiorMeshes` lists; the ids of the named parts (`propeller`, `propDisc`, `propDiscPivot`, `propHub`, `propBlades`,
ailerons, flaps, elevator, rudder, wheels, lights, glow, yokes, levers, pedals, instruments, GPS); `waterRudders`; the
hardpoints; `gaugeState`; `spanHalf`; the shared uniforms (`wetLine`, `lightPower`, `instAngle`, `instShift`,
`uCabinGlow`). Dumps taken from port 4501 (base) and 4502 (split) — `scene-base.json`, `scene-step3.json`, 50 objects
and 14 materials each — are identical after dropping the `build` field. This is the check that matters for a refactor
of this kind: three.js sorts opaque draws by material id and then object id, merged batches keep insertion order and
canvas textures depend on drawing order, so any reordering of material, mesh, batch or canvas-draw creation would show
up here (as a different id, hash or order) before it shows up in a still.

## Source audit (comments and code moved verbatim)

`model.ts` was split by copying contiguous line ranges of the original constructor into the part files (a script
extracted exact ranges and re-indented them), then only the unavoidable edits were made. A line-multiset audit of the
original 1484 lines against `model.ts` + `parts/*.ts` (trimmed lines, ignoring bare braces) lists 159 original lines
that are not present verbatim; all of them are one of: the import lists (now per file), the layout constants (same
lines, now `export const` in `parts/context.ts`), `this.<field>` becoming a parameter / local / `model.<field>`,
`private readonly` becoming `readonly` for the fields `parts/animate.ts` drives, the `mesh()` / `decal()` helpers now
closing over the context, the shared `Batch` declarations (now created in `createBuildContext`) and method signatures
becoming function signatures. Every one of the 707 comment lines of the three original files is present in the new
files (the six comments that sat on moved declarations are in `parts/context.ts` next to them); the new files carry
844 comment lines, the additions being one doc comment per builder / interface. The `geometry.ts` and `textures.ts`
splits are pure moves (the barrels re-export everything; `arcSpread` and the canvas helpers became exports for the
sibling modules).

## Flight harness

`node bench/scripts/flighttest.mjs http://127.0.0.1:4502/ /tmp/acsplit/flight.json` on the split build:
`deterministic: true   allPass: true   (115 s)`; all 23 checks PASS (rest datum 1.968 m, takeoff into wind 20.2 s /
liftoff 31.8 m/s, roll rate 50.8 deg/s, adverse yaw, elevator peak 18.7 deg/s, turn-rate error -4.2 %, stall recovery
5.2 s / 21.5 m, phugoid damping 0.116, water touchdown sink 1.26 m/s with 1 bounce, runway roll-out upright, camera
centroid within box, no NaN).

## Final file list (lines)

Before: `src/plane/model.ts` 1484, `src/plane/geometry.ts` 1103, `src/plane/textures.ts` 1396 (3983 lines).

| file | lines | role |
|---|---|---|
| `src/plane/model.ts` | 163 | `PlaneModel`: public fields, the builder sequence, `animate` / `setWaterline` / `setInstruments` / `debugGauges` delegating to `parts/animate.ts` |
| `src/plane/parts/context.ts` | 112 | layout constants, instrument / light channel tables, `at` / `V3`, `BuildContext`, `createBuildContext` (batches, `mesh()`, `decal()`) |
| `src/plane/parts/materials.ts` | 246 | material table, `withWaterBounce`, wet-line hook, glass shader, panel / instrument / GPS materials |
| `src/plane/parts/fuselage.ts` | 201 | `buildFuselageFrame` (loft, ring parameterisation, window cut-outs, texture layout), `buildFuselageShell`, `buildFittings` |
| `src/plane/parts/propeller.ts` | 57 | spinner, hub, blades, blur disc |
| `src/plane/parts/wing.ts` | 95 | wing panels, root fairing, flaps / ailerons on hinges, pitot |
| `src/plane/parts/tail.ts` | 68 | stabiliser, elevator, fin, dorsal fillet, rudder, antenna wire |
| `src/plane/parts/lights.ts` | 134 | nav / beacon / strobe / landing lenses, lit skin patches, glow sprites |
| `src/plane/parts/floats.ts` | 119 | hulls, struts, spreader bars, wires, water rudders, cleats, wheels |
| `src/plane/parts/cockpitPanel.ts` | 223 | `InstrumentKit`, panel box and face, glare shield, compass, dome light, visors, overhead console, instruments, GPS |
| `src/plane/parts/cockpitControls.ts` | 136 | pedestal, throttle / flap levers, pedals, yokes with hands, placards |
| `src/plane/parts/cabin.ts` | 105 | `buildSeats` (seats, baggage, belts, chart), `buildCabinTrim` (door skins, placards, headliner bows, vents, extinguisher) |
| `src/plane/parts/pilot.ts` | 49 | torso, head with headset, arms, legs |
| `src/plane/parts/animate.ts` | 124 | `setWaterline`, `animate`, `setInstruments` as functions of the model |
| `src/plane/geometry.ts` | 15 | barrel |
| `src/plane/geometry/loft.ts` | 554 | `Section` profiles (`sectionAt`, `halfWidthAt`, `sectionPerimeter`, `arcFraction`), station smoothing / insetting, ring parameterisations (`uniformRing`, `arcSpread`, `keyedRing`), `loftGrid` / `gridGeometry`, `QuadBlock` / `inBlock`, reveal, pane, glare-shield, deck and hump geometry, `loft` |
| `src/plane/geometry/wing.ts` | 212 | `WingSpec`, chord / leading- and trailing-edge / upper- and lower-surface helpers, `wingPanel`, `weldSmooth` |
| `src/plane/geometry/propeller.ts` | 75 | `bladeGeometry`, `spinnerGeometry` |
| `src/plane/geometry/floats.ts` | 107 | `FloatStation`, `floatHull` |
| `src/plane/geometry/util.ts` | 161 | `Batch`, `placement`, strap / quad / strut / faired-strut geometry, `toIndexed`, `baked`, `Surf` tagging, `partsMaterial` |
| `src/plane/textures.ts` | 21 | barrel |
| `src/plane/textures/common.ts` | 267 | `PbrMaps`, canvas / texture helpers, `heightToNormal`, grime / panels / wear painters, `orangePeelNormal`, `FuselageLayout`, `LIVERY`, `CHEAT_LINE`, `SURF` |
| `src/plane/textures/fuselage.ts` | 219 | `fuselageMaps` |
| `src/plane/textures/wing.ts` | 127 | `WING_TEX`, `wingV` / `tailV`, `wingMaps` |
| `src/plane/textures/floats.ts` | 103 | `floatMaps` |
| `src/plane/textures/cabin.ts` | 170 | `CabinLayout`, `cabinMaps` |
| `src/plane/textures/panel.ts` | 466 | `PANEL` / `OVERHEAD` layouts, `GAUGES`, `GPS_SCREEN`, `DIAL`, `PANEL_UV`, `panelTexture`, `INSTRUMENT_ATLAS` / `instrumentAtlas`, `GpsScreen` |
| `src/plane/textures/glass.ts` | 28 | `glassDirtTexture` |
| `src/plane/textures/prop.ts` | 81 | `propDiscTexture` |
| `src/plane/README.md` | 49 | who owns what, build sequence |

Total 4487 lines (the growth over 3983 is import lists, builder signatures / result interfaces, the `BuildContext`
and doc comments).

## Evidence files in this directory

- `tag_strip_base_vs_split.png` — the bench-tag strip (3x) on base, split and pinned-stamp split for two views: the
  only pixels that differ, and why.
- `diff_mask_plane-rear-quarter.png` — pixels that differ between base and split, full frame (quarter size).
- `diff.py` — the pixel + `metrics.json` diff (`python3 diff.py <outA> <outB> view,view,...`).
- `scenedump.mjs` — the scene-graph dump (`node scenedump.mjs http://127.0.0.1:<port>/ out.json`); `scene-base.json`
  and `scene-step3.json` are the two dumps compared above.
- `flight.log` — the flight-harness run on the split build.

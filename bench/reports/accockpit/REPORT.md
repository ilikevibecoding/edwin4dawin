# accockpit — Cockpit + Pilot + Propeller gauntlet

Branch `cursor/accockpit-loop-8213`, worktree `/home/ubuntu/wt-accockpit`. Preview ports: 4564 (baseline build of the
lead's `e13cb897`), 4567 (working build). Categories 4 (propeller), 6 (cockpit and pilot) and the cockpit half of 7
(materials). Critic baseline: iter10 visual-1 (cockpit-city, plane-front-quarter, glass-sun) and h03 visual-2.

## Method and tools

Stills: `tools/session.mjs` — one Chrome per batch, fed from a queue of `.spec` files (`tools/mkspec.py` writes
them), holding one machine-wide slot taken by a blocking `flock` (`/tmp/accockpit/slotwait.sh`) so the round does
not spin on the gate's 1 s poll. 1920x1080, `quality=high`, seed 20260904, frozen. Views: the four bench frames plus
dev cameras posed in the body frame (panel, hands, pilot, head, prop, propfast, cockpit-idle, cockpit-sun,
cockpit-night).

The gate was held by other builders for most of this loop (both slots busy for 95+ minutes at a stretch), so the
geometry rounds were built and checked offline first and the stills verified them in batches:

- `tools/tricount.mjs` — bundles `src/plane/model.ts` with esbuild and runs it in node on a no-op canvas: the
  per-mesh triangle / draw-call table without a browser (budget every round).
- `tools/texdump.mjs` — renders the procedural textures (panel atlas, instrument atlas, prop blur maps, glass dirt)
  with `@napi-rs/canvas` for 100 % inspection of the dial artwork.
- `tools/rast.mjs` — a z-buffered software rasteriser of the model (flat Lambert on the tagged colours) from a body-
  frame camera: proportions, placement, intersections, silhouettes, and — decisively — face orientation. It found
  two hard bugs the browser would have shown as missing geometry (D10 bezels culled, D11 blades inside-out).
- `tools/crops.py` — before/after crop pairs at 100 % for the artifacts.

## Rounds

| Round | Strongest giveaway named | Fix | Files | Result |
|-------|--------------------------|-----|-------|--------|
| R0 | baseline observation: bladeless prop at idle, mitts, oval face, decal panel, no glass from inside | — | — | critic 4: bladeless = hard failure; 6: mitts / oval / decal |
| R1 | propeller: no blades at idle (faded to 12 % by 980 RPM); disc a flat charcoal ellipse; twist inverted | crisp blades below ~1050 RPM with a motion-smear sector per blade (length = angle swept in 1/60 s, density chord / (r sweep)); blades + streaks cross-fade into a uniform disc across 1050–1650 RPM; polar coverage map + blade-tilt normal map so the disc's lit side follows the sun; blade twist corrected | `parts/propeller.ts`, `geometry/propeller.ts`, `textures/prop.ts`, `animate.ts` (one call) | pending stills |
| R1b | blades inside-out (351/384 faces inward: culled from outside, lit from the wrong side) | section + tip cap winding reversed | `geometry/propeller.ts` | numerical check 351/384 outward |
| R2 | hands: smooth mitts with fused fingers | palm slab, four tapered curled fingers with joint bulges, thumb over the top to the switches, wrist into the cuff, watch; built in a grip frame on the yoke horns | `parts/pilot.ts`, `parts/cockpitControls.ts` | pending stills |
| R3 | face a featureless oval; torso a box; arms straight tubes | cranium + jaw, nose, wrapped sunglasses, hair under the cap, headset cups with domed backs, boom mic, cable to the jack; lofted shirt torso with collar / buttons / pocket; elbows; legs to boots on the pedals | `parts/pilot.ts` | pending stills |
| R4 | panel a flat decal; digits float; daytime dial glow flattens the shading | lathe bezels 7 mm proud with screws, recessed dials, one specular lens mesh, needle shadows in the instrument shader, switch / key / guard / breaker / rheostat / knob / GPS-key parts, checklist card in a clip; daytime glow cut to a third | `parts/cockpitPanel.ts`, `parts/materials.ts`, `animate.ts` | pending stills |
| R4b | every bezel face culled from the seat (lathe profile ran inward) | profile reversed | `parts/cockpitPanel.ts` | rasteriser: rings visible |
| R4c | ASI numerals piled under the legend; VSI legend on the numerals; GPS digits printed on the panel | ASI 35 deg / 20 kt on its own numeral ring; VSI legend moved; minor ticks on the engine dials; GNS-style GPS bezel with lit boxed fields | `textures/panel.ts` | texdump |
| R5 | windshield invisible from the seat | forward-scatter sun haze through the dirt film from the cabin side, on top of the Fresnel sky reflection, glare-shield mirror image and seals | `parts/materials.ts` (glass block) | pending stills |
| R6 | quadrant: prop / mixture arms painted whole in the knob colour, sticks on a bare box | housing with a slotted plate on a rounded pedestal, flat arms about an inner pivot, ball / crown / ball knobs, friction lock; rounded yoke hub with bolt and switch | `parts/cockpitControls.ts` | rasteriser |
| R7 | pilot: 15 cm neck, low shoulders; seats plain slabs | shoulder line at the seated acromion height, torso into the harness; upholstery over both front seats (bucket cushion, bolsters, front roll, padded back with pleats, piping) | `parts/pilot.ts` | rasteriser |
| R8 | compass a box with a decal in the middle of the cockpit frame | rounded bowl housing, bracket + base plate, framed card window, compensator screws, light hood | `parts/cockpitPanel.ts` | rasteriser |
| R9 | both hands on the yoke | right hand closed round the throttle ball (part of the lever mesh, rides with it), two-bone right arm aimed shoulder -> elbow -> wrist every frame; left hand on the yoke | `parts/pilot.ts`, `parts/cockpitControls.ts`, `context.ts` (one constant), `animate.ts` (one call) | rasteriser |

## Budget

Offline accounting (`tools/tricount.mjs`, whole `PlaneModel`): baseline 44 273 triangles / 32 meshes; after R9
71 485 triangles / 36 meshes: **+27 212 triangles, +4 draw calls** (the blade mesh with its own fading material, the
lens mesh, the two right-arm bones; the streaks and the disc replaced the old single disc mesh one for one). Budget:
≤ 60 k / ≤ 8 for this builder, ≤ 260 k / ≤ 40 for the aircraft.

## Shared files touched

`parts/materials.ts`: the instrument material (needle shadow offset, transparent) and the glass material's cabin-side
sun haze only. `parts/animate.ts`: the propeller call and the daytime emissive levels. No fuselage / cowl / wing /
cabin-geometry files; the seat upholstery is added from `parts/pilot.ts` over the cabin's slabs.

# Battle of Coruscant — plan, scene design and ship rubric

Goal: an epic space-battle scene above Coruscant in the spirit of the opening of *Revenge of the Sith*:
dozens of capital ships (Republic Venator-class cruisers against Separatist Providence, Munificent and
Recusant-class warships), hundreds of starfighters, turbolaser exchanges that leave burning impacts on
hulls, flak, debris and a city-planet below. Everything original and procedural (no film assets); the
visual language is what we borrow. No crew or gameplay on the ships yet: this is the space view.

Entry: `battle.html` (same engine, renderer, post stack and tooling as the ISD demo). Views and checks
go through the same `window.debugAPI` shape so `tools/check.mjs`, `tools/verify.mjs`-style scripts and
critics work unchanged with `--base .../battle.html`.

## Scene

- **Coruscant**: a 6,000 km-class planet rendered as a large sphere in low orbit. Night-side city
  planet: dense warm gold/orange light grids in districts, brighter arterial lines, dark purple-blue
  ground, no atmospheric halo (the user asked for the glow to go). A faint, thin terminator haze only.
  The battle sits 300–600 km "up", so the planet fills the lower half of most frames.
- **Fleets**: Republic (Venator-class, 1137 m) in loose lines and pairs; Separatists (Providence-class
  1088 m, Munificent-class 825 m, Recusant-class 1187 m) opposing. 40+ capital ships, all instanced per
  class with 3 LOD levels; per-instance tint, damage state and burn points.
- **Fighters**: ARC-170s, V-wings and Eta-2 interceptors vs Vulture and Tri-fighter droids; hundreds,
  instanced, on procedural dogfight paths that weave between capital ships.
- **Weapons**: turbolaser bolts (Republic red, Separatist teal-green, fighter lasers green/red) as
  instanced glowing capsules from turret hardpoints to targets; impacts spawn flash + fireball + smoke
  sprites (procedural flipbook), leave scorch marks and, when a ship's damage crosses thresholds,
  persistent burning wounds with trailing smoke; flak bursts between fleets; occasional big detonation
  with debris.
- **Camera**: orbit/fly (same controls) plus a cinematic autopilot with several passes; touch works.
- **Performance**: instancing for everything repeated, LOD by distance, pooled bolts/explosions,
  one draw call per class per LOD, budgets ≤ 350 draw calls and ≤ 2.5 M triangles per frame, the same
  perf monitor and adaptive scaler.

## Workstreams (parallel, isolated worktrees, disjoint files)

| Workstream | Owns | Deliverable |
| --- | --- | --- |
| Venator-class | `src/battle/ships/venator.js`, `venatorTextures.js` | hero Republic cruiser to the rubric |
| Separatist ships | `src/battle/ships/{providence,munificent,recusant}.js` | three classes to the rubric |
| Fighters | `src/battle/fighters.js`, `src/battle/ships/fighters/*.js` | five fighter types, swarm motion |
| Weapons & effects | `src/battle/weapons.js`, `explosions.js`, `effects/*.js` | bolts, impacts, fires, flak, debris |
| Planet & environment | `src/battle/coruscant.js`, `battleSky.js` | city planet, sky, sun |
| Choreography & camera | `src/battle/choreography.js`, `cinematic.js` | fleet layout, movement, targeting, camera passes |
| Validation | `tools/battle-*.mjs`, critics | rubric scoring, perf |

Shared (integration owner): `src/battle/main.js`, `fleet.js` (instancing/LOD/hardpoint framework),
`battle.html`, `docs/*`.

## The 18-point ship rubric (Venator-class; Separatist classes use the same rubric with their own
silhouette items)

Scored 1–5 by independent critics from close (300 m), medium (2 km) and far (10 km) frames.

1. **Silhouette**: elongated arrowhead wedge with a wide flat dorsal deck and raised rear block; reads
   as a Venator at a glance at every distance.
2. **Dorsal flight deck**: two long door halves along the centreline with a deep seam; some ships with
   doors parted showing a lit hangar; door-edge stripes in the Open Circle maroon.
3. **Twin bridge towers**: two slender towers side by side on the rear block, each with a wider bridge
   head and window rows; a connecting deck; sensor spars on top.
4. **Bow**: forward prow with the split notch/beak; ventral forward hangar mouth with lit interior.
5. **Plating**: layered panels with seams at several scales, raised plate groups, no uniform tiling.
6. **Colour scheme**: warm light-grey hull, maroon stripes on the deck doors and the bow wedge, red trim
   on the shoulder wings, circular insignia on doors and flanks (original mark).
7. **Weathering**: soot behind engines, grime in seams, paint fade, scorch around damage.
8. **Turrets**: eight heavy dual turbolaser turrets on the dorsal shoulders (4 per side) that track
   targets; smaller emplacements along the flanks.
9. **Engines**: stern cluster with nozzle depth, blue-white gradient cores, heat haze, glow spill onto
   the hull.
10. **Rear superstructure detail**: sensor domes, antenna arrays, comm dishes, hatches on the block and
    tower bases.
11. **Scale cues**: window rows, small bay doors, lit hangar interiors, fighters passing along the hull.
12. **Flanks and belly**: recessed side bays with machinery, ventral docking bays, keel detail.
13. **Lighting response**: sun key with a warm city-glow fill from Coruscant below; shadow side readable;
    specular breakup on plating.
14. **LOD consistency**: no visible popping; towers and stripes still read at 10 km.
15. **Damage variety**: pristine, scorched and burning states with persistent fires and smoke trails.
16. **Orientation variety**: ships at varied yaw/pitch/roll so the battle reads three-dimensional.
17. **Weapons integration**: bolts leave the turret barrels; impacts flash and scorch the hull where
    they land; fighter lasers are smaller and faster than turbolasers.
18. **Motion**: slow ponderous drift and turn, engine flicker, turret tracking, doors/hangars alive.

Separatist silhouette items: Providence = long dagger with a tall rear command fin/tower, blue-grey;
Munificent = long thin spine with the forward pincer prow and a rear bulb, tan; Recusant = spindly
skeletal destroyer with the wide flat aft and long forward spine, grey.

## Loop

1. Skeleton (planet, instanced placeholders for every class, bolts + impacts, camera, views, perf) →
2. workstreams in parallel → 3. integrate → 4. critics score the 18 points per class at three distances
and the battle as a whole → 5. fix wave → 6. re-score → 7. video and measurements.

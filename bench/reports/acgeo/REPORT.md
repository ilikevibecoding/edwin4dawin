# acgeo — Aircraft geometry + materials gauntlet: report

Branch `cursor/acgeo-loop-8213` (worktree `/home/ubuntu/wt-acgeo`), merged with the lead
`cursor/vice-city-aerial-8213` at R8. Rubric v2 categories 1 (silhouette), 2 (geometry), 3 (nose/cowling),
5 (wings/control surfaces), 7 (materials); baseline medians from the critics 7 / 5 / 4 / 5 / 5, hero target 9.25.
Per-round observations and reasoning are in `DEFECTS.md`; this file is the summary.

## How the rounds were shot

- Baseline (R0) is the branch point served from its own build on port 4544; every round is built to its own
  `dist` and served on its own port so before/after pairs are the same scene, seed, time and camera.
- Views: the canonical `plane-front-quarter`, `plane-rear-quarter`, `glass-sun`, plus dev-camera close-ups posed in
  the aircraft's body frame (`tools/views.py`: nose 4.5 m from the port bow, wingtip from behind/below, tail from the
  starboard rear quarter at 6 m, rig from astern low, door at 3 m, chase 30 m, below, tail-on and nose-on in flight).
- Captures go through one queue-fed Chrome session (`tools/acsession.mjs`, a single machine-wide Chrome slot,
  released after 3 min idle). The slot gate was saturated by the other builders for most of this loop: rounds 1–10
  were built and typechecked blind (geometry smoke-tested in Node for NaNs, bounds and triangle counts) and were
  first seen in stills at R8; R11 and R12 are the rounds driven by those stills.

## Round table

| round | defect attacked | result | self-score (sil / geo / nose / wings / mat) |
| --- | --- | --- | --- |
| R1 | plank wing and stabiliser (11 % / 12 %, 14 mm root TE) | 15 % / 13 % sections, 8 mm TE, tip lights on the real skins | 7.5 / 6 / 4 / 6 / 5 |
| R2 | black flat-cylinder cowl with a chrome cone, no inlet, no exhaust | nose bowl with an open annular inlet, R-985 cylinders and baffle behind it, carb and oil-cooler scoops, cowl flaps, exhaust with heat shield, Dzus rings | 8 / 7 / 7 / 6 / 5.5 |
| R3 | one sheen everywhere (protocol hard failure), zero wear | clear-coat / roughness / metalness packed per region: chalked roof vs waxed sides vs dulled belly, per-panel variation, bare-metal chips, lacquer glare panel | 8 / 7 / 7 / 6 / 7 |
| R4 | control surfaces hanging on nothing; no wicks, antennas, pitot mast | plate hinge brackets under flaps and ailerons, hinge fittings in the elevator / rudder gaps, elevator trim tabs with actuators, static wicks, pitot mast, ADF mast and wire, VHF blade, GPS puck | 8 / 7.5 / 7 / 7 / 7 |
| R5 | door as a painted outline; no handle, no filler caps | door seam groove + proud edge, paddle handle in its recess, hinges, three belly-tank filler caps | 8 / 7.5 / 7 / 7 / 7 |
| R6 | float rig: box cleats, slab water rudder, no cables, no cross wires, no hatches | spray rails, horn cleats, pump-out covers, water rudders with transom brackets / balanced blades / steering horns and cables, cross wires with turnbuckles | 8.5 / 8 / 7 / 7 / 7 |
| R7 | wing struts rising from the float decks; windows cut straight into the paint | one faired lift strut per side from the lower longeron to the front spar with a jury pair; black glazing seals | 8.5 / 8 / 7 / 7.5 / 7 |
| R8 | bare nav-light spheres; one door per side; seams that vanish at 30 m | teardrop nav-light housings, beacon base; rear cabin doors both sides; lap-joint step + lit edge at every seam, firmer rivet rows | 8.5 / 8 / 7 / 7.5 / 7.5 |
| R9 | no rudder tab; frameless windshield; plain cowl sides | rudder trim tab as its own slotted airfoil segment, bent 3° to port; windshield frame; 3 × 4 louvre bank per cowl side | 8.5 / 8 / 7.5 / 8 / 7.5 |
| R10 | float conversion without its ventral fin | 1.05 × 0.33 m ventral fin following the keel line | 9 / 8 / 7.5 / 8 / 7.5 |
| R11 | (first stills) chrome-drum bowl; dark zipper along the wing LE; dark-red nav patches on the tips by day; tip cap as a lid over the rudder | bowl painted in the livery with a polished lip; skin joints off the LE and LE chips thinned; patches drawn only while powered; rudder to the fin top, both tips rounding toward the hinge line | 9 / 8.5 / 8 / 8.5 / 8 |
| R12 | chip clusters as dirt splatter; black-box scoop mouths; a ball on the stern post | sparse faint-rimmed flakes; mouth plates follow the hoods' section, chin scoop 25 % smaller; tail light in a teardrop housing | 9 / 8.5 / 8 / 8.5 / 8.5 |

Self-scores are against the hero target of 9.25. What still holds each category back (residual defects):
- Silhouette (9): the wing tip planform is a plain round-off; the stern post ends in a point rather than the
  Beaver's rounded tail-cone end.
- Geometry (8.5): the cabin's roof has no skylights (the wing root fairing occupies the roof directly behind the
  windshield in this loft, so they cannot be cut without moving the wing); the stabiliser tips are fixed full-chord
  caps outboard of the elevators.
- Nose / cowling (8): the engine seen through the inlet is dark at all times of day (no interior light bounce);
  the cowl flaps are two plates, not a ring of gills.
- Wings / control surfaces (8.5): no aileron gap seals or balance horns; the flap tracks are plate brackets rather
  than the DHC-2's external hinge arms.
- Materials (8.5): no oil streaks on the wing struts or the floats' strut roots; the wing walkway is a painted
  rectangle rather than grit; the bare-metal chips are flat (no relief in the normal map).

## Triangle and draw-call budget (PlaneModel, LOD0, everything the model owns)

| build | meshes (draw calls, all visible) | triangles (all) | triangles (exterior) |
| --- | --- | --- | --- |
| R0 baseline `3478c067` | 32 (31 visible) | 34 709 | 21 734 |
| R8 `f86e66e1` | 32 (31 visible) | 44 793 | 31 818 |
| R9 `19f880ea` | 32 (31 visible) | 44 941 | 31 966 |
| R11 `a4bdea96` (Node smoke test, exterior only) | 32 (31 visible) | ≈ 44.3 k | 29 630 without lights / glass |
| R12 `6885e16c` (Node smoke test, exterior only) | 32 (31 visible) | ≈ 44.3 k | 29 640 without lights / glass |

Budget: ≤ 260 k triangles, ≤ 40 draw calls. Every added element batches into an existing mesh (the fittings
batch carries the rig, hinges, handles, wicks and antennas as one draw call), so the draw-call count did not move.

## Before / after pairs

`crops/*.jpg` (left: R0 baseline, right: the latest round shot from the same camera): `front_quarter`,
`rear_quarter`, `nose_4m`, `wingtip_below`, `tail_6m`, `rig_astern`, `door_3m`, `chase_30m`, `glass_sun`. The
right-hand frames are R9 (front, nose, tail, door, glass) and R8 (rear, wingtip, rig, chase); R10–R12 stills are
queued behind the Chrome slot (see `DEFECTS.md`, capture notes) and the pairs are regenerated when they land.
The six best are copied to `/opt/cursor/artifacts/acgeo_*.jpg`.

## Files touched (all within the acgeo ownership list)

`src/plane/parts/fuselage.ts`, `parts/wing.ts`, `parts/tail.ts`, `parts/floats.ts`, `parts/lights.ts`,
`parts/materials.ts`, `src/plane/geometry/loft.ts`, `geometry/wing.ts`, `geometry/floats.ts`, `geometry/util.ts`,
`src/plane/textures/fuselage.ts`, `textures/wing.ts`, `textures/floats.ts`, `textures/common.ts`;
`bench/reports/acgeo/*` (this report, the defect log, crops, tools). No edits to model.ts / aircraft.ts, the
propeller, cockpit, physics, camera or effects.

# Rubric 10 — Space train v2: cleaner, futuristic, shader-lit

Goal: the hyperlane train reads as a sleek maglev from a Star Wars city, not a box train: white/chrome hull, glass
canopy, glowing blue strips, a lit interior with seats and holo displays, and a low electric hum. Everything that
already works (timetable, doors, carry, hop on/off, walkway, reload) keeps working.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Hull: streamlined nose (stepped taper over ≥ 5 blocks), continuous glass canopy band, chrome/white plating with dark panel seams, maglev skirts hugging the rail, no exposed flat wooden/wool blocks | 4 exterior screenshots (station, mid-route day/night) |
| 2 | Emissive: blue light strips along the skirts and roofline, red tail lights, white headlights, cabin windows lit at night; strips pulse gently while moving (shader time uniform), steady when docked | Night recording |
| 3 | Shading: voxel mesh has per-vertex emissive so strips glow through bloom; chrome specular from the shared shading chunk; casts and receives shadows | Screenshot with Cinematic preset |
| 4 | Interior: two seat rows per car (wool/slab seats with chrome frames), holo route display at each car end showing the next station, lit floor guide strip, grab poles, a driver cab with console visible through glass | Interior walk-through shots |
| 5 | Doors: sliding-door animation (two halves) instead of pop, with a chime; platform screens stay in sync | Recording at a stop |
| 6 | Sound: low maglev hum (80-160 Hz) rising with speed, a doppler-shifted whoosh passing the walkway, door chime, arrival announcement blip | Spectrum test |
| 7 | Motion: acceleration and braking curves smoothed (jerk-limited), banking none, no visible stutter between ticks | Recording |
| 8 | Station dressing: platform edge lights, route map boards, benches, departure display that counts down | Screenshot |
| 9 | Regression: `scripts/test-*` train checks, walkway hop-on/off, reload while riding, shove, doorway clearing all still pass | CDP checks |
| 10 | Perf: ≤ +6 draw calls, no extra per-frame allocation | Bench |

## Design notes

- `voxelMesh.js` gains an optional per-cell emissive channel (block id → emissive colour/intensity table) written to
  a vertex attribute the material multiplies into the emissive output; the train material adds `uTime` for pulsing.
- Sliding doors: the door cells are their own tiny grids moved along the car axis by `doorOpen` (0..1), reusing the
  same carry-safe pose maths as the cars.

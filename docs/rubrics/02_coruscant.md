# Rubric 2 — Coruscant: a Minecraft megacity (≥ 10× the western town) with furnished interiors, spaceport and ship traffic

Goal: a dense skyscraper city on a plateau centred at (3000, 0): at least 10× the town's footprint (town = 209×171 =
35.7k blocks²; Coruscant target 1024×1024 = 1.05M blocks², ~29×), buildings up to y 250, every building with real
rooms behind its windows, multi-level streets and skybridges, an undercity, a spaceport on the eastern edge with pads
and ships landing/taking off. No NPCs yet (see the population plan in `docs/STARWARS_PLAN.md` §3), but every building
records the metadata NPCs will need.

## Acceptance criteria

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Footprint ≥ 10× the town, plateau at y 60 (undercity floor), skyline up to y 250, ≥ 400 buildings, ≥ 6 tower families + ≥ 3 civic landmarks (senate-style dome, temple-like spire complex, opera/plaza) | Layout stats printed by the generator; aerial screenshots |
| 2 | Street network at ≥ 3 levels: undercity (y 60–80), mid-level boulevards/platforms (y 95–96), skybridges (y 130–190); every building reachable on foot from a boulevard; ramps/stairs/turbolifts connect levels | Path checks from 20 random doors to the nearest boulevard |
| 3 | Interiors: every building has floors every 4–6 blocks, a lobby, stairs or lift shafts, and rooms furnished from a library of ≥ 40 room templates (apartments, offices, cantina, shop, market stalls, medbay, security post, hangar, workshop, penthouse, storage) using the full block palette; no hollow shells | Random sample of 30 buildings: all pass the interior checklist |
| 4 | Lighting: interiors lit (lamps/sea lanterns/glow panels), windows glow at night from inside, streets lit by holo-signs/lamps; no black interiors, no sky-light leaks through walls | Light samples ≥ 6 in 95 % of sampled rooms |
| 5 | Spaceport (east edge): terminal with concourse, ≥ 8 landing pads with markings and lights, control tower, fuel/cargo areas, walkable to the train station | Walk-through recording |
| 6 | Ship traffic: ≥ 4 voxel ship models (freighter, shuttle, airspeeder, gunship-like) built from blocks; a traffic system flies ≥ 12 ships along lanes, with landing/take-off sequences at the pads (descent, hover, touchdown, dwell, lift, depart), deterministic on the shared clock; ≤ 2 draw calls per model type (instanced) | Recording; ship count/draw-call readout |
| 7 | Metadata for NPCs: every building records `door`, `lobby`, `spots`, `work`, `beds`, `lifts`; district records archetypes/density; a JSON dump of the layout exists for the population system | Dump file; counts |
| 8 | Streaming/performance: chunk generation ≤ 6 ms average (≤ 20 ms worst) so the train at 30 blocks/s never outruns generation; at 10 chunks in the densest district ≥ 60 fps on a real GPU, ≤ 1500 draw calls, heap ≤ 700 MB; far chunks may use a reduced-detail mesh | Bench JSON + generation timing histogram |
| 9 | Determinism: identical city on every load and client (seeded), no per-frame randomness in generation | Chunk hash comparison across 2 loads |
| 10 | Art review: reads as Coruscant (dense towers, layered traffic lanes, lit canyons at night, no repeated-copy look: variation in height, materials, silhouettes; landmarks visible from afar) | Critic verdict ACCEPT |

## Design notes for the builders

- Layout (seeded, computed once, cached): districts on a 128-block grid (senate, financial, residential, industrial,
  entertainment, spaceport, undercity market); within a district a lot grid with boulevard spacing 48–64 and alley
  spacing 16–24; lot sizes 16–48; tower height from district profile + noise; landmarks placed first.
- Building blueprint per lot: generated on demand into a local `Uint8Array` (w×h×d), cached in an LRU of ~256; a chunk
  copies the intersecting slice. Blueprints also emit metadata (doors/spots) once.
- Tower families: glass-and-durasteel office slab; setback residential spire; cylindrical habitat tower; industrial
  stack with pipes and vents; twin-tower with skybridge; landing-platform tower (pads on cantilevers); civic dome.
- Room library: functions `room(kind, w, d, h, rng) → blocks + spots` reused across families.
- Streets: boulevards are wide decks at y 95/96 with railings, lamps, holo-sign blocks, speeder lanes marked; skybridges
  connect towers at 130–190; the undercity (y 60–80) is a maze of alleys under the decks with market stalls and pipes.
- Spaceport: raised deck at y 96 on the west edge (x 2488–2720), terminal hall (glass roof), pads 24×24 with lights, tower
  60 high; the space train station (hyperlane at y 90 along z 0) is adjacent (see rubric 4).
- Ships: voxel models 8–24 blocks long, built with the vehicle mesher; traffic lanes as splines above y 120 plus pad
  approach paths; the system is deterministic on the disaster/tick clock.

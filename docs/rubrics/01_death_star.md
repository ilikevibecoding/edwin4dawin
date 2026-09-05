# Rubric 1 — A real Death Star with a full interior

Goal: a walkable, block-built Death Star in the `space` region (centre (0, 128, -4000), diameter ~200 blocks), reached
by ship (later) or, until then, by an admin teleport / the `?x=&y=&z=` URL. It must read as *the* battle station from
outside and feel like a place inside: hangars, corridors, rooms, lifts, machinery, lighting — in the Minecraft idiom,
using the widest block palette we have.

## Acceptance criteria (each row must be shown in the running game and signed off by a critic)

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Exterior: a voxel sphere with equatorial trench, superlaser dish (concave, with emitter), plating panels, lit windows; recognisable from 300 blocks in the black-sky space region | Screenshots from 4 angles day/night equivalent; ≤ 25 ms/frame extra on the test rig at 10 chunks |
| 2 | Space region: black sky with stars, no clouds/fog haze, no terrain, faint planet-shine; the frontier's sky is unchanged | Screenshot; region transition has no flicker |
| 3 | Hangar bay: an opening in the hull you can fly/walk into, 40×20 landing deck with pad markings, blast doors, control gallery, parked ships (voxel models), lighting | Walk-through recording |
| 4 | Decks: ≥ 6 distinct floors connected by corridors (the classic grey panelled corridor with light strips and doorways), turbolift shafts (vertical vehicles that carry the player), stairs/ladders as fallback | Path from the hangar to the throne room and to the reactor without breaking blocks |
| 5 | Rooms (all furnished, each ≥ 1 instance): command bridge/overlook, detention block with cells and a trash-compactor pit, tractor-beam control gallery over a chasm, conference room, barracks, mess hall, medical bay, armoury, reactor core shaft with catwalks and glowing core, superlaser dish interior with focusing rings, throne room with the big window over the dish | Room checklist screenshots; every door/lift/light block placed by the generator, none floating |
| 6 | Interiors are enclosed and lit: no sky-light leaks into deep rooms, emitters give ≥ 6 light in corridors; no unreachable dark pockets on the main route | Light samples along the route ≥ 6 |
| 7 | Generation is lazy and deterministic: ~200-block sphere = ~2500 chunks, each chunk generated on demand in ≤ 8 ms average from the seed; identical world across reloads and clients | Timing log; two loads produce identical block hashes for 20 sampled chunks |
| 8 | Collision/physics work everywhere inside (no falling through floors, no getting stuck in doors); flight works inside | 5-minute walk + fly recording without glitches |
| 9 | Superlaser link: the existing orbital-beam disaster's station is this design (shared shell generator or matching look); firing it does not break the interior structure | Visual match check |
| 10 | Performance: at 10 chunks inside the station ≥ 60 fps on a real GPU (test rig: relative to Coruscant ≤ 1.3×), draw calls ≤ 1500, heap ≤ 600 MB | Bench JSON |

## Design notes for the builders

- Shell generator: signed-distance sphere with plating noise; trench = band |lat| < 3° recessed 6 blocks; dish = spherical cap at lat 30° N; window specks = emitter blocks (sea lantern / lamp) in a hashed pattern; interior hull thickness 4.
- Interior generator: decks every 7 blocks (floor 1 + 5 clear + ceiling 1) from y 40 to y 210 within radius-6; a spine of 3 main corridors per deck (axes at 0°, 120°, 240°) plus ring corridors at r = 30, 60, 85; rooms as rectangles carved between corridors from a seeded template list; turbolift shafts at the corridor junctions; hangar cut into the equatorial trench facing the frontier side; reactor shaft down the centre (r 12, y 40–200) with catwalks every 21 blocks.
- Blocks: grey/dark grey panels (smooth stone, polished andesite-like, iron block, dark panel variants), light strips (sea lantern), red/black accents, glass panes, iron bars, doors (metal), consoles (custom texture on a table shape), chests for storage rooms.
- The station's own gravity is the world's gravity; the "top" of the interior is +y.

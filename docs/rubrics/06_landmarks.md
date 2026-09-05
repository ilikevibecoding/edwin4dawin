# Rubric 6 — Coruscant signature buildings: one builder per building, "really detailed"

The user asked for one sub-agent dedicated to each building and for every building to be genuinely detailed: full
interiors room by room, in the Minecraft style, using the widest possible block palette. This rubric covers the
signature landmarks that anchor the city (the generic tower families and the room library are Rubric 2). References
the user supplied: the Coruscant skyline at night, the Senate landing platform with its disc pavilion, the Senate
dome by day, a lit plaza at street level, and Monument Plaza from above (dark conical pavilions with warm lit bands,
domed rotundas, radial light strips, the Umate rock outcrop in a ring pool at the centre).

## Landmarks (each is one module in `src/coruscant/landmarks/<id>.js`, one builder, one critic)

| id | Name | Footprint (blocks merged per axis) | Height above plateau | Must-have interior |
| --- | --- | --- | --- | --- |
| `senate` | Galactic Senate | 3x3 (~150 wide) | 90 | Grand Convocation Chamber: ring-tiered repulsorpod galleries around the Chancellor's podium, four grand entrances, Senate concourses, Chancellor's office suite (red walls, cityscape window), guard posts, rooftop landing pads, the Avenue of the Core Founders (statue rows) on the approach |
| `temple` | Jedi Temple | 3x3 | 190 (Tranquility Spire reaches y 250) | Ziggurat with five spires; Great Hall / Processional Way with statues, Council Chamber at the top of a spire (ring of seats, windows all round), Jedi Archives (long halls of bookshelves, busts), Room of a Thousand Fountains (garden, pools, waterfalls), dojo/training rooms, meditation cells, dormitories, refectory, temple hangar with a landing lip, communications centre |
| `plaza_monument` | Monument Plaza | 3x3 open plaza | 30 (pavilions), rock 18 | Umate rock outcrop (stone/andesite/gravel/mossy) in a ring pool with railings; 6-8 dark conical pavilions with lit bands and open cafés/market stalls inside; 4 domed rotundas (museum of the rock, cantina, ticket hall, info centre) with warm windows; radial GLOW_PANEL light strips, fountains, holo-signs, benches, planters, statues |
| `opera` | Galaxies Opera House | 2x2 | 60 | Grand foyer with sweeping stairs and chandeliers, auditorium with tiered balconies, the Chancellor's private box, stage and orchestra pit, backstage, dressing rooms, roof terrace bar, speeder drop-off deck |
| `republica` | 500 Republica | 2x2 | 200 | Luxury residential spire: security lobby, turbolifts, spa and garden levels, penthouses, the veranda apartment (open balcony with the skyline view), private landing pads, a rooftop observatory |
| `chancellery` | Senate Office Building | 2x2 | 120 | Chancellor's office (red, curved window wall, statues), meeting rooms, briefing theatre, Senate Guard posts, senators' offices per floor, archives, a private landing platform with the disc pavilion of the reference (elevated pad on a stalk with lit rows) |
| `underworld` | Uscru undercity strip | 3x3 at undercity level | 35 | Neon back-alleys under the boulevard: the Outlander Club (bar, dance floor, booths, holo screens), Dex's Diner (booths, counter, kitchen, droid waitress spot), pawn shop, speeder garage, bounty-hunter hangout, gambling den, junk market; holo-sign lit canyon |
| `medcenter` | Grand Republic Medical Facility | 2x2 | 110 | Wards, bacta tank hall (blue steel-glass cylinders), surgical theatres, med-droid bays, pharmacy, ambulance speeder pad, waiting halls, rooftop garden |
| `detention` | Republic Judiciary Central Detention Center | 2x2 | 70 | Cell blocks (cells with beds, bars, force-field frames), interrogation rooms, armoury, briefing rooms, guard mess, control room, gunship landing deck |
| `works` | The Works foundry | 3x2 | 60 | Industrial cathedral: smelter hall with magma channels, conveyor lines, cranes, cargo racks, control gallery, huge vents and chimneys, worker lockers and canteen |
| `holonet` | HoloNet broadcast tower | 2x2 | 170 | Studios (news desk, holo stage), control rooms, giant HOLO_SIGN billboards on the facade, antenna crown, newsroom floors, cafeteria |
| `market` | CoCo Town market halls | 3x2 | 25 | Covered market: hundreds of stalls (food, parts, fabrics), food court, hologame arcade, loading yard, upper gallery, skylights |

## Acceptance criteria (per landmark)

| # | Criterion | Measure |
| --- | --- | --- |
| 1 | Silhouette reads as the canonical building from 200 blocks away; the palette mixes >= 14 distinct block types (stone/brick/wood families, durasteel, chrome, panels, glass, lamps, plants, water where fitting) | Aerial + approach screenshots; block histogram of the blueprint |
| 2 | Every listed must-have room exists, is enclosed, lit (light >= 6 everywhere inside), furnished with purpose-specific blocks and reachable on foot from an entrance via stairs or a lift shaft (no floating rooms, no hollow shells, no rooms you can only reach by breaking blocks) | Walk-through recording + automated reachability check over the blueprint |
| 3 | Room detail density: >= 1 furniture/decor block per 6 floor cells in every room, ceilings and floors patterned (not flat single blocks), doorways framed, wall variation every <= 4 blocks | Blueprint statistics script |
| 4 | Entrances: at least one undercity door (y 61) and, for buildings taller than 40 blocks, a boulevard-level door (y 96) on the lot's `front`; skybridge openings where `lot.bridges` land | Path check from the door cells |
| 5 | Metadata for NPCs recorded through the Blueprint API: `door()`, `spot()`, `work()`, `bed()`, `lift()`, `room()`; `meta.name` set | JSON dump shows counts > 0 for each applicable category |
| 6 | Deterministic and fast: generation from `lot.seed` only, < 60 ms to build the blueprint on the CI machine, pinned in the blueprint cache | Timing print |
| 7 | Night look: windows, signage and lamps lit from inside; no black facades | Night screenshot |
| 8 | Critic verdict ACCEPT against the reference images and the description above | Critic report |

## Contract (all builders)

- Module `src/coruscant/landmarks/<id>.js` exports `export const LANDMARK = { id, name, span, height, build }` where
  `build(bp, lot, ctx)` fills a `Blueprint` (`src/coruscant/blueprint.js`: `set/fill/walls/column/disc/fillIfEmpty/air`,
  `FORCE_AIR` = 255 carves, 0 = leave terrain) and records metadata with `bp.door/spot/work/bed/lift/room`.
  `ctx = { rng: RNG seeded from lot.seed, layout, rooms: room library (src/coruscant/rooms), B }`.
- Local coordinates: x in [0, lot.w), z in [0, lot.d), y = 0 is the plateau top block (world y 60, repave it); the
  walk level is y 1 (world 61); floors sit on y = 5k so skybridges line up; the boulevard deck is y 35/36.
- `lot.door` gives the front door column (`lot.door.x/z` world coords, `lot.door.side`); `lot.bridges` lists skybridge
  attachments the city carves 3 wide x 2 high into the lot edge.
- No imports outside `src/coruscant/**`, `src/blocks.js`, `src/rng.js`, `src/noise.js`. No DOM, no Math.random.
- The registry `src/coruscant/landmarks/index.js` maps ids to modules; `layout.js` places them (owner: integration).

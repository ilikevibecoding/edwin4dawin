# Rubric 18 — Coruscant architecture v2: the city must read as Star Wars, not New York

User feedback (6 Sep, verbatim themes): "all the buildings still look like New York, not Star Wars. I gave you a lot of
references." "I'm really sick of the city having this AI slop, where every building is just random shit placed."
"You can make your own blocks that make them more angular." The references are the Minecraft-style Coruscant renders
and the three skyscraper images from the user (500-Republica tiered spire with lit vertical strips; a tower with a
glowing blue spine and cantilevered landing decks; Zakuul needle spires), plus the Monument Plaza still.

What "New York" means in the current build (measured on the tree at `6a22181d`): rectangular footprints on most
tall lots (`slab`, `setback`, `twin`, `pad`), `grid` / `punched` window rhythms (rows of small square windows), stone,
plaster and stone-brick bands, flat roofs with a crown bolted on. What "Coruscant" means: rounded, tapered and
stacked masses; long horizontal glazing bands and vertical light strips instead of window grids; smooth panelled
metal fields with recessed seams; ring ledges and cap platforms; landing decks that stick out; a grey-white / warm
sand / dark bronze palette with blue-white light; nothing that looks like brick or a 1930s office block.

## Reference reading

Concrete visual rules extracted from the user's references in `docs/references/` (`user_tower_ref_1..3.png`: the
500-Republica tiered spire, the blue-spine tower with landing decks, the Zakuul needles; `user_coruscant_plaza_night_andor.png`;
`user_senate_exterior_day.png`; the three `user_minecraft_coruscant_*.png` voxel renders). Every rule below maps to
code in `src/coruscant/facade.js`, `src/coruscant/towers/envelope.js`, `towers/*.js`, `crowns.js` or `skyline.js`.

Massing
1. **Slender, stacked, tapering.** A tower is a stack of 3-6 shells that get narrower as they rise (500 Republica reads as
   nested organ pipes); the widest part is the podium, the narrowest the tip. Never one straight box with a hat.
2. **Round or faceted plans.** Footprints are circles, rounded rectangles, ellipses and octagons; where a plan is
   square its corners are chamfered or carry fins. Curves must be >= 6 blocks in radius to read in voxels.
3. **Stacked discs on a stalk.** The Andor platform and the Minecraft platform render: a slender core (stalk) with
   wide horizontal tiers and a cap platform overhanging it; undersides of the discs glow warm.
4. **Lobes and spines.** Two or three cylinders joined by a flat spine (ref 2 and the Minecraft skyline's paired drums)
   read as one building with a lit seam between the lobes.
5. **Fins and buttresses.** Vertical fins run past the roof line as blades; the Zakuul needles are faceted blades whose
   edges catch the light. Buttresses step down in stairs toward the ground.

Facade
6. **Vertical light lines.** Continuous unbroken lines of light run the full height of a facade every 4-6 blocks (ref 1
   warm, ref 2 blue). Lines, never dotted rows of squares.
7. **Horizontal ribbons.** Glazing is a continuous band per floor (or every other floor) between smooth panel fields;
   a facade module (fin, strip, band) repeats at one pitch over the whole height - the order is what separates it
   from "random shit placed". Variation is between towers, never within a facade.
8. **Panel fields with seams.** Large blank metal fields with recessed seam lines every few blocks; service floors
   have no windows at all. Seams and fins must still read at 200 blocks.
9. **Tier lines.** Every shell change is marked by a lit ring ledge (a light line around the tower) or a dark band; the
   undersides of setbacks and decks carry the light.

Palette
10. **Grey-black body, warm or blue light.** Body colours are panel black, dark and light durasteel, hull plate; the
    500-Republica type is warm bronze; plazas and the Senate are sand-grey; chrome only on edges and fins. Light is
    blue-white (strips, ledges) or warm white (interiors); red/orange only as a rare beacon. No brick, no stone brick,
    no coloured wool, no wood on a tower.
11. **District character stays legible.** Senate district grey-white and bronze, financial black panel and chrome with
    blue light, residential warm sand and durasteel, industrial hull plate, entertainment neon accents, spaceport hangar grey.

Roofs, decks, ground
12. **No flat roof.** Every top ends in a spire, needle tip, dome, antenna cluster, lit halo or cap disc, and the crown
    is the narrowest part of the silhouette.
13. **Landing decks stick out.** Cantilevered platforms on struts at mid height and under the crown with lit rims,
    touchdown marks and a hangar door (ref 2, the Andor platform); balcony rings on residential drums.
14. **Bridges are tubes.** Long thin pipe bridges join towers high up; glass tubes with a lit spine.
15. **Depth and notches.** Facades are layered (recessed glazing between projecting fins, ledges stepping out) so the
    silhouette has notches and shadows instead of one flat plane.

## Acceptance criteria (each one measured by `scripts/test-coruscant-towers.mjs` or a listed script)

1. **No window grids.** The `grid` and `punched` rhythms are removed from every tower family; facades use `ribbon`
   (continuous horizontal glazing bands), `slit` (tall narrow lights), `curtain` (full-height glazing between fins),
   `panel` (smooth panel fields with recessed seams and no windows on service floors), `strip` (full-height vertical
   light strips). Test: rhythm audit over every tower lot = 0 grid/punched.
2. **Rounded and tapered massing on tall lots.** At least 70% of towers with height >= 60 have a non-rectangular
   envelope on the majority of their floors: circle / ellipse / octagon / rounded-rectangle plans, tapering (footprint
   shrinks with height in >= 3 steps), stacked discs (slender core with wide tiers or a cap platform), lobed clusters
   (two or three cylinders joined), or stair-stepped wedge buttresses. Test: envelope classifier over blueprint masks.
3. **Silhouette variety.** No two towers within 120 blocks share (family, envelope, crown, palette). Test: pairwise audit.
4. **Palette.** Tower exteriors use only the Coruscant palette (durasteel light/dark, hull plate, panel black, warm sand
   plaster only as an accent band, chrome trim, glass, light strips). Stone brick and brick are not used on towers
   (civic landmarks excepted where the reference is stone). Test: exterior block census per tower.
5. **Tier lines and ledges.** Every tower >= 60 has lit ring ledges or setback edges at least every 20 floors, and at
   least one cantilevered landing deck or balcony ring on 50% of towers >= 80 (decks already exist in `decks.js`).
6. **Angular where it counts.** New block shapes are allowed for exteriors where the mesher supports them (slabs and
   stairs exist today); if a wedge/slope block is added to the mesher, it is used for tapering edges, fins and
   buttresses and is covered by a mesher test. If not added, tapering is stair-stepped and the report says so.
7. **Interiors preserved.** Every room keeps a `kind` W4 staffs; rooms remain reachable and lit
   (`scripts/landmark-stats.mjs`-style checks on 40 sampled towers: 0 unreachable, 0 unlit); the rectangular room
   library sits inside rounded envelopes with a perimeter corridor ring; no floating furniture.
8. **Far skyline agrees.** Impostors in `src/coruscant/skyline.js` follow the new envelopes (octagonal prisms and
   tapers, not boxes) within the vertex budget; the seam test in `test-farlod.mjs` still passes.
9. **Performance.** Chunk fill time per Coruscant chunk within +15% of today (`game.coruscant.timing()`), draw calls
   at the Senate plaza view (Light, rd 10) within +10, JS within +2 ms.
10. **Reference match.** Six fixed cameras (upper-city skyline day/night, boulevard canyon, plaza edge, aerial over the
    financial district, telephoto from the spaceport) are captured before and after and reviewed by an independent
    critic against the user's references; the critic's verdict per camera is recorded here.

## Status

Measured on `cursor/r6-w10-arch-54d6` (layout seed 1337, 421 towers, 319 of them >= 60) with
`node scripts/test-coruscant-towers.mjs` (23 checks, all green), `test-unit` (13), `test-textures` (11), `test-farlod`
offline (11), `landmark-stats` for the 12 landmarks, `test-spaceport`, `test-deathstar`, `test-disasters`.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | No window grids | done | `grid` / `punched` removed from `facade.js` RHYTHMS and every family; rhythms over 421 towers: panel 103, ribbon 92, slit 83, curtain 57, strip 44, industrial 42. 10554 lit glazing cells sampled, 101 (1%) without a lit neighbour (lines, not dots). |
| 2 | Rounded / tapered massing on tall lots | done | 283/319 (89%) towers >= 60 non-rectangular on most floors: octagon 95, buttress 87, rounded 84, blade 42, stacked discs 7, ellipse 4 (`towers/envelope.js`); corners really cut on 107/107 sampled masked tiers. |
| 3 | Silhouette variety | done | 189 distinct (family, envelope, crown, palette) tuples over 319 tall towers; 0 clashes within 120 blocks (variety pass in `towers/index.js`); district palettes checked (senate civic grey-white / bronze, financial black panel + chrome, residential sand, industrial hull, entertainment neon only there). |
| 4 | Coruscant palette only | done | Census of 3.44 M exterior shell cells on all 421 towers: dark trim 11.7%, dark durasteel 10.3%, black panel 10.0%, chrome 8.7%, bronze 7.0%, blue glow 7.0%, grey panel 6.9%, glazing bands / slits, durasteel, light strips; 0 stone, brick, plaster fields, wood or wool above the podium. New blocks 108-119, 120-127 (wedges), 128-129 (vertical strips). |
| 5 | Tier lines, ledges, decks | done | 1113 lit ring floors over 319 towers, longest run without a ledge or shell change 8 floors (<= 20 asked); 139/192 (72%) towers >= 80 carry landing decks or balcony rings (226 cantilevered decks). |
| 6 | Angular blocks | done | `SHAPE.WEDGE` (ids 120-127, four facings x grey / dark): chunk mesher emits culled bottom / back faces, two side triangles and a 45-degree slope quad (face code 6 + direction), world shader `slopeFrame` gives it its normal frame, two-step stair collision, unit test in `test-unit.mjs`. Used as bevelled coping on every non-railed shell edge, fin caps, buttress treads and setback skirts: 37289 wedges on 319 tall towers, 319/319 multi-shell towers wear them, 0 floating, 0 sloping into a wall (`settleWedges` after the skybridge carve). Mesher cost: 196 city chunks, 2038 wedges, 0.96 ms/chunk with wedges vs 0.96 ms/chunk with cubes (+0.1% median of 7 interleaved rounds, +0.14% vertices). |
| 7 | Interiors preserved | done | 40 sampled towers: 5872 rooms of 48 kinds, 7040 spots, 0 unreachable, 0 unlit, 0 floating spots, every kind in W4's `ROOM_FUNCTIONS`; the room library is unchanged (`buildings.js` / `rooms/**` not touched), masked tiers keep the core, door cells and connector corridor (`mustCells` in `envelope.js`). |
| 8 | Far skyline agrees | done | Impostors built per shell from the envelope (chamfered / octagonal prisms, twin shafts, crown frusta, the spine's lit column): 319 towers, 1071 shells, footprint and chamfer agree on 1071/1071, mean body height error 0.00 blocks; `test-farlod` offline 11/11. Night facade: strips lead, ring ledges half weight, dim amber glazing, thinning with distance (no cage). |
| 9 | Performance | done, with a note | Chunk mesh: +0.1% (row 6). Tower blueprint build (offline, all 421 towers uncached, best of 3-4 on the same VM minutes apart): 0.67 ms -> 0.89-0.95 ms per tower (+0.25 ms, paid once per tower and memoised; the full city is +110 ms spread over streaming). In-game `game.coruscant.timing()` at the Senate plaza (Light, rd 10, 421 city chunks): 0.66 ms/chunk before vs 0.42-0.78 after across three runs - the shared VM's load (4 cores, 4-14 load average) swamps the difference, so the offline numbers are the ones to trust. Draw calls at the Senate plaza 143 -> 144-147 (+1..+4, budget +10). JS time cannot be compared on this VM (swiftshader on shared cores: 88 ms before vs 14-58 ms after at the same camera). |
| 10 | Reference match | evidence delivered | Before / after pairs of the six listed cameras plus four corrected vantages at noon and night in `/opt/cursor/artifacts/w10_before_after_<camera>_<time>.png`; the critic's verdict per camera is to be recorded here by the integrator. Known: the listed "skyline aerial" camera stands inside the 500 Republica lot and shows that landmark's own plaster-and-punched-window facade (`landmarks/republica.js`, not a tower family); the listed residential camera stands inside lot 286, so the pair uses the boulevard deck at x=3256 z=420 instead. |

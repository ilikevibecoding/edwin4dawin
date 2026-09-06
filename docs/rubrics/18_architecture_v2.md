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
| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1-10 | — | todo | — |

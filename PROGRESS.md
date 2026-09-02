# PROGRESS — first-person spaceship interior (Three.js)

Stack: Vite + three (npm), n8ao, playwright-core (headless Chromium via SwiftShader for screenshots).
Modules: `src/main.js`, `player.js`, `ship.js`, `space.js`, `interact.js`, `post.js`, plus `kit.js`
(geometry batching), `textures.js` (procedural texture library), `materials.js`, `lighting.js`, `hud.js`.
Screenshot harness: `tools/shots.mjs` → `shots/iter_N/{cockpit,corridor,quarters,window}.png` (+ extra QA
views `windshield`, `galley`, `bathroom`, `aft`, interaction prompt/fade/rest-cycle shots, `results.json`).

Environment note: Playwright runs here, but only with software GL (SwiftShader). Frame times in
`results.json` (~2 s/frame) are therefore meaningless for rubric 7; I score 7 from draw calls, triangle
count, light count and visual defects, and flag the fps part explicitly.

Rubric: 1 lighting · 2 materials · 3 detail density · 4 post stack · 5 space view · 6 palette · 7 tech ·
8 cold-look · 9 interactions. A maybe is a fail.

---

## Iteration 1 — first full build

Everything implemented in one pass: kit-bashed corridor + cockpit + quarters + galley + bathroom, all
procedural textures (painted panel, worn metal, deck plate, rubber, fabric, hazard, screens, LEDs, planets,
nebulae), player controller with capsule-vs-AABB collision, three raycast interactions, N8AO + bloom +
ACES + SMAA + vignette/grain post stack, parallax starfield + 4 planets + nebula billboards + dust streaks,
`window.debugAPI.setView(name)`, Playwright harness.

Shots: `shots/iter_1/`.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | FAIL | Whole frame washed out; no key/fill contrast survives. |
| 2 | Materials physical | FAIL | Everything reads chalky/flat; metals have no darks; glass reads opaque grey. |
| 3 | Detail density | FAIL | Panels there, but windshield panes are solid grey slabs (blocked view). |
| 4 | Post stack balanced | FAIL | Severe overexposure everywhere — looked like double gamma. |
| 5 | Space view sells motion | FAIL | Windshield and portholes blocked (closed sleeve cylinders / solid gasket boxes). |
| 6 | Cohesive palette | FAIL | Palette exists but bleached; orange reads peach, teal reads mint. |
| 7 | Tech clean | FAIL | Deprecation warnings (Clock, PCFSoftShadowMap), favicon 404, renderer.info wrong, closed porthole sleeves = missing view. |
| 8 | Cold-look test | FAIL | Obviously a demo. |
| 9 | Interactions | FAIL | Bed/galley/bathroom fire, but harness raycast used a stale camera matrix (hover sometimes false); status regex too loose. |

Root cause found for 1/2/4/6: `N8AOPass` sRGB-encodes its output by default (`gammaCorrection: true`)
and `OutputPass` then tone-maps + encodes again → double gamma. Fix list for iteration 2: set
`ao.configuration.gammaCorrection = false`, re-tune every light against the corrected pipeline, open the
porthole sleeves (`CylinderGeometry` open-ended), replace solid windshield "trim" boxes with real gasket
rings (`panelWithHoles`), fix camera matrix update in `player.setPose`, fix harness status checks, clean
up the deprecations.

## Iteration 2 — exposure pipeline fixed, first real look

Changes: N8AO gamma fix; global `LIGHT_SCALE` 0.34 → 0.8, hemisphere 0.1 → 0.18, environment intensity
0.2/0.4; emissives scaled down during the interior env-map capture so metals don't mirror blown fixtures;
three painted-panel texture variants + mirrored-UV jitter per panel; rounded mattress/blanket/pillow;
hooded reading lamp; pilot seat bolsters/headrest/armrests; planar `Reflector` mirror in the bathroom;
exterior nose hull under the windshield; `THREE.Timer`, `PCFShadowMap`, inline favicon; harness waits
for the exact status string per interaction.

Shots: `shots/iter_2/`.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | FAIL | Corridor works (warm ceiling key, teal floor fill, emissives glow). Galley under-cabinet light is a white sun on the wall; quarters walls evenly lit / flat. |
| 2 | Materials physical | FAIL | Pipes/grate/rails read as metal, panels read painted, floor reflects the teal trench. But paint "chips" are heavy black ink blobs on every panel edge — reads as a texture bug, not wear. Mirror shows dark brushed metal instead of a reflection. |
| 3 | Detail density | FAIL | Cockpit right wall, bathroom walls and the wall around the corridor porthole are large, nearly plain cream panels. |
| 4 | Post stack balanced | FAIL | ACES/bloom/AO/vignette/grain all on, but blown highlights: galley light, porthole steel ring (point light 0.3 m from the wall), corridor ceiling strips and adjacent panels. |
| 5 | Space view sells motion | FAIL | Cockpit/window: ringed gas giant with rim glow, stars — good. Corridor porthole is a dark disc; quarters porthole shows dark blue and one star. Stills can't show drift; harness doesn't measure it yet. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal consistent across all eight views. |
| 7 | Tech clean | FAIL | 90–135 draw calls, 150–245k tris fine. 25 lights (22 point + 2 shadowed spots + hemi) is heavier than it needs to be; porthole sleeve interiors are back-face culled (invisible from inside); fps unmeasurable here. |
| 8 | Cold-look test | FAIL | Corridor is close, but the ink-blob chips, blown ceiling, dead porthole and boxy dark seat backs in the cockpit give it away. |
| 9 | Interactions | PASS | Prompts ("E Sleep / Eat / Wash up") appear on hover, all three fire, fades + status text + rest-cycle red lighting confirmed in `prompt_*.png`, `fade_*.png`, `rest_cycle_bed.png`. |

Fix list for iteration 3 (worst first):
1. Blowouts: galley under-cabinet light intensity/position, porthole cool lights off the wall, corridor
   ceiling point lights lower + dimmer, emitWarm 3.0 → ~2.2.
2. Space through portholes: frame the ocean world's limb in the corridor and quarters portholes, brighten
   the ocean world, denser starfield + milky-way band, more structured nebulae, sleeve interiors visible,
   drift measured in the harness (two frames 2 s apart).
3. Painted panel texture: fine sharp chips revealing mid-grey metal, edge-wear highlights instead of
   black blobs; mirror backing plate sits in front of the reflector plane — remove/move it.
4. Detail density: default panel style always gets sub-seams/bolts/label; corridor handrails; procedural
   stencil decals (canvas text); richer seat backs; cockpit camera pulled back slightly.
5. Light count down, verify no z-fighting/missing faces in every shot.

## Iteration 3 — props, decals, portholes, sun layout

Diagnosis first (probe with the ship hidden): the quarters porthole *was* pointed at the ocean world, but
the sun sat only ~33° from it in the sky, so the window showed its night side. Moved the sun aft-left-above
the ship and the ocean world 50° away from it; all framed planets now show a lit face.

Changes: sun/planet layout; night-side ambient on planets; 5 star layers incl. a 9k-star galactic band with
soft glow sprites; more structured nebulae (dust lanes); drift 1.0 → 1.3°/s; porthole sleeves render from
inside (`insideOut` winding flip) with an outer lip; glass darker/less reflective (space stays black);
painted texture: chips → small sharp flakes + edge-wear highlights; worn metal: less blotchy; procedural
stencil decal sheet (canvas text: CAUTION / A-07 / O2 / AIRLOCK / barcodes…, eroded) with `uvRect` atlas
mapping; default panel style now always adds seams / bolts / hatch / inner plate / decal; corridor
handrails with brackets (broken at doors), extinguisher, junction box with cable drop; pilot seat backs
(fabric rear panel, harness straps, spine, LED); mirror backing plate removed (it was on the room side of
the reflector plane and occluded the reflection) → mirror now reflects the room; light intensities /
positions retuned; harness measures sky drift: porthole region 2 s apart vs a wall control patch.

Shots: `shots/iter_3/`. Drift: sky region meanAbsDiff 48.8, 67.5% pixels changed; interior control 0 / 0.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | FAIL | Corridor/aft/cockpit read well (warm key, teal fill, glowing strips, harness/seat accents). Quarters walls still evenly lit (spot cone too wide); porthole steel ring still blown. |
| 2 | Materials physical | FAIL | Chips over-corrected: dense dark speckles across the *whole* panel — reads as dirt splatter, not wear. Greeble boxes show wood-grain-looking metal. Mirror, pipes, rails, floor: good. |
| 3 | Detail density | FAIL | Much better (rails, decals, bolts, seams, extinguisher, junction box). The window close-up still has two big panels carrying nothing but speckles + one decal. |
| 4 | Post stack balanced | FAIL | Galley/ceiling blowouts fixed. Porthole ring still white (env-map reflection of the fixtures, not the point light); ocean world in the quarters porthole clips to white. |
| 5 | Space view sells motion | FAIL | Gas giant: lit, ringed, rim glow, black sky, stars — good. Ocean limb visible in the quarters porthole. Corridor porthole: at that oblique angle the 0.34 m sleeve hides almost all sky. Drift objectively measured. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal; red extinguisher is the only accent outside it and reads as a prop. |
| 7 | Tech clean | FAIL | No z-fighting / acne / missing faces in 8 views; sleeves now solid from inside. 25 lights unchanged; fps not measurable here and no runtime safeguard yet. |
| 8 | Cold-look test | FAIL | Aft/corridor are close (rails, decals, depth, lighting). Speckled panels everywhere kill it. |
| 9 | Interactions | PASS | All three fire with prompts, fades, status text, rest-cycle lighting (`prompt_*`, `fade_*`, `rest_cycle_bed.png`). |

Fix list for iteration 4 (worst first):
1. Painted texture: chips only within ~5% of edges/corners and inside dents; centre nearly clean; keep
   edge-wear highlight; slightly larger flakes.
2. Porthole sleeve 0.34 → 0.2 m; corridor camera moved nearer the porthole and yawed 12° so the limb
   is framed through it; ocean world brightness down.
3. Blown steel ring: environment intensity 0.4 → 0.3, metal envMapIntensity 1.2 → 0.85, emissives ×0.25
   during env capture.
4. Quarters: narrower key spot, hooded lamp emitter; galley counter light up a touch.
5. Greebles smaller and device-like (LEDs, bezels); pedestal insert was fully enclosed (invisible).
6. Rubric 7: dynamic resolution scaler (drop pixel ratio / AO quality when frame time > 18 ms) so 60 fps
   holds on mid-range GPUs; trim redundant lights.

## Iteration 4 — edge-only chips, porthole framing, env blowout, quality scaler

Changes: painted texture chips restricted to edges/corners/dents with low-frequency variation; worn
metal less blotchy; porthole sleeve 0.34 → 0.2 m, glass moved forward; corridor view yawed 12° and moved
nearer so the ocean world's limb sits in the porthole; ocean world brightness 1.3 → 1.0; environment
intensity 0.3, metal envMapIntensity 0.85, emissives ×0.25 during env capture, hemisphere 0.14; quarters
key spot narrowed (angle 0.72, intensity 30), hooded lamp emitter visible through louvres; galley counter
light up/out; greebles rebuilt as small bezelled devices with LEDs and labelled plates; pedestal's painted
insert made proud (was fully enclosed); porthole cool lights moved outside the hull; adaptive quality
scaler (pixel ratio 1.0 → 0.5 and AO quality steps when frame time > 18 ms for 20 frames, steps back up
when < 12 ms; disabled while `debugAPI.setView` is active).

Shots: `shots/iter_4/`. Drift: sky region meanAbsDiff 49.9, 68.9% pixels changed; interior control 0 / 0.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | FAIL | Corridor/aft/cockpit/quarters now read as lit rooms (warm ceiling key, teal fill, key highlight on the mattress, orange lamp). Galley is flat: upper cabinets evenly lit, counter light invisible, the only bright thing is a blown dispenser screen. Far corridor ceiling light is a formless white blob, not a fixture. |
| 2 | Materials physical | FAIL | Rails, pipes, grate, screens, fabric mattress, rubber seat bolsters: good. Chips are now edge-biased but still *black* — at porthole distance they read as ink splatter rather than paint flaked to primer. Dark metal around the porthole shows coarse wood-grain streaks. |
| 3 | Detail density | FAIL | Corridor/aft/quarters pass. Window shot: top-left cream panel + orange trim carry nothing; galley upper cabinets are plain cream boxes; cockpit ceiling is a large bare cream expanse. |
| 4 | Post stack balanced | FAIL | Porthole steel ring is a blown white-blue halo (now lit by the exterior cool light, low-roughness torus); far ceiling strip blob; galley dispenser screen clips; cockpit lower third and quarters floor crushed near black. |
| 5 | Space view sells motion | PASS | Ringed gas giant with rim glow in cockpit/window, ocean world limb with atmosphere rim in both portholes, dense star band, black sky. Drift measured objectively (69% of sky pixels change in 2 s; 1.3°/s → a planet crosses the windshield in ~70 s). |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal in all eight views. |
| 7 | Tech clean | FAIL | No z-fighting, acne or missing faces in 8 views; 100–147 draw calls, 200–260k tris. Still 25 lights (22 point) — every fragment pays for all of them in a forward renderer; fps unmeasurable here so light count is the lever I can actually verify. |
| 8 | Cold-look test | FAIL | Corridor is the closest yet (planet in the porthole, rails, decals, depth fog). I still hesitate: black splatter on the panels, halo ring, blob light. Fail. |
| 9 | Interactions | PASS | All three fire with prompts, fades, status text, rest-cycle lighting. |

Fix list for iteration 5 (worst first):
1. Chips: colour → mid-grey primer/bare metal (not black), smaller, sparser; faint centre-panel smudges
   and streaks so panels are not uniform; worn metal brushed streaks finer + lower contrast.
2. Porthole ring: rougher cast-metal material (roughness ~0.5, envMapIntensity 0.5); exterior cool light
   dimmer and further out. Corridor ceiling: `emitWarm` 2.1 → 1.6, bloom threshold up, fixture housings
   with louvres so the source has shape.
3. Galley: dispenser screen intensity down; a real under-cabinet key light on the counter; handles,
   vents and labels on the upper cabinets; rack on the left wall.
4. Cockpit: teal floor fill strip under the consoles; overhead conduits + vents on the ceiling.
   Quarters: floor fill so the deck reads.
5. Light count 25 → ≤ 16: remove redundant point lights, let emissives + bloom carry the rest.
6. Window shot: vent grille + conduit on the bare top-left panel.

## Iteration 5 — primer chips, grate quad, exterior window light, galley key

Root causes found while reading the iteration-4 close-ups: the "black" chips were *metallic* (metalness 1
with a dark interior env map → no diffuse, nothing to reflect → black); the "wood grain" was albedo
banding from a 90-cycle streak layer; the porthole halo was the cool point light 0.8 m in front of a
low-roughness torus; the galley "blown screen" was the counter light's specular in a polished steel
dispenser body; and the corridor floor showed concentric arcs at distance — moiré from ~180 thin
crossbar boxes at 9 cm pitch going sub-pixel.

Changes: chips → dielectric grey primer (metalness 0.1, roughness 0.62), smaller and sparser, broad
handling smudges across panel faces; worn metal 1024², streaks carried by roughness not albedo; new
`metalRough` material (roughness map ×1.7) for porthole rings, fixtures, bezels; floor grate → one
cut-out textured quad (`makeGrate`, mipmapped alpha) + solid edge rails; corridor fixtures rebuilt
with housings, end caps and louvre fins over a narrow diffuser; porthole shutter control box (lever,
LEDs, spec-plate decal); corridor/quarters porthole cool point lights → unshadowed SpotLights parked
outside the hull aimed into the room (`windowSpot`); cockpit ceiling: 4 rows, conduit runs with
clamps, cable tray; teal kick strips under the consoles + low teal fill light; quarters spot 0.8 rad
aimed more centrally; galley: counter downlight as the room key, dispenser body painted with a cast
face plate, cabinet pulls / vents / stencil labels, canister rack over the table; bathroom on the
vanity light alone; emitWarm 2.1 → 1.7, emitCool 2.6 → 2.2; bloom 0.35/0.45/1.05 → 0.3/0.38/1.15;
hemisphere ground colour lifted. Lights 25 → 20 (17 point/spot + 2 shadowed spots + hemi).

Shots: `shots/iter_5/`. Drift: sky region meanAbsDiff 36.8, 63.4% pixels changed; interior control 0 / 0.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | FAIL | Corridor, aft, cockpit, quarters, windshield all read as lit rooms with a key and coloured fill; cockpit floor no longer black. But the new exterior spots land wrong: the window shot's sleeve bottom is a white crescent, a shelf mug in the quarters is a hot spot, and the galley key washes the upper cabinets to white. |
| 2 | Materials physical | PASS | Chips read as flaked paint over primer, panels have smudge variation, brushed metal reads brushed, rails/pipes/ring reflect the room, fabric and rubber distinct. |
| 3 | Detail density | FAIL | Corridor/aft/cockpit/quarters/galley pass. Window shot: the dark porthole plate is still one big flat surface, the top-left chamfer panel carries nothing. |
| 4 | Post stack balanced | FAIL | Fixture blob fixed (fixtures now have shape). Blown: sleeve crescent (window), mug (quarters), galley upper cabinets. Blacks OK everywhere now. |
| 5 | Space view sells motion | PASS | Ringed gas giant with rim glow in cockpit/window, ocean world limb in both portholes, star band; drift measured (63% of sky pixels change in 2 s). |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal throughout. |
| 7 | Tech clean | PASS | Floor moiré gone; no z-fighting, acne or missing faces in 8 views; 107–165 calls, 205–340k tris, 20 lights. fps still not measurable under SwiftShader — scored from budget (well within a mid-range GPU at 1080p) plus the adaptive scaler; flagged as unverified in the final summary. |
| 8 | Cold-look test | FAIL | Closest yet, but the white crescent in the porthole and the strong teal floor rails still make me hesitate. |
| 9 | Interactions | PASS | All three fire with prompts, fades, status text, rest-cycle lighting. |

Fix list for iteration 6 (worst first):
1. Exterior spots: 3 m out with a narrow cone (≈0.11 rad) so the beam passes the sleeve at grazing
   incidence and lands as a soft disc low on the opposite wall; quarters beam aimed at the pillow at
   a quarter of the intensity.
2. Galley key: half intensity, moved up and away from the cabinet fronts.
3. Porthole plate: lighter slate plate + raised cast bezel square with corner bolts (breaks the flat
   dark area); a clamp-and-conduit run on the chamfer above the portholes.
4. Grate: put the three inner rails back as real geometry proud of the quad (relief up close, no moiré
   since they run along the view axis); teal trench light down a notch.

## Iteration 6 — exterior spot geometry, porthole plate/bezel, chamfer boxes, aft sill

Changes: exterior window spots moved 3 m out with a 0.12 rad cone aimed low on the starboard wall
(quarters: 0.17 rad at the pillow, intensity 16 → 6); galley key 6.0 → 3.6 and moved up/back; porthole
plate → painted slate with per-plate UVs (`fitUVs`), raised painted-gunmetal bezel square with corner
bolts, control box moved onto the bezel corner, sleeve radius −4 mm (no fight with the plate hole);
first attempt used a *metal* bezel which read as pure black — metals have no diffuse term and the
interior env map is dark — so the bezel became paint and `scene.environmentIntensity` went 0.3 → 0.45,
`metalRough.envMapIntensity` 0.5 → 0.7; grate: five solid rails proud of the quad; teal trench light
3.5 → 2.6; junction boxes with LEDs + cable drops along both chamfers, rubber cable run between the
conduits; aft door hazard sill + plate closing the trench (the grey patch in the aft shot).
Lights unchanged at 20.

Shots: `shots/iter_6/`. Drift: sky region meanAbsDiff 51.7, 69.3% pixels changed; interior control 0 / 0.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | PASS | Corridor: warm fixture pools, teal trench, cool porthole shafts on the far wall. Cockpit: teal console glow + planet light, floor no longer black. Quarters: warm lamp key, cool disc on the pillow, teal under-bunk. Window: plate lit from the side, bezel/bolts read. Exterior-spot blowouts (sleeve crescent, mug hot spot) gone. |
| 2 | Materials physical | PASS | Pipes and rails carry real reflections, painted panels show chips/smudges/rivets, cast bezel reads as dark paint over metal, fabric bunk soft, rubber trim dull. |
| 3 | Detail density | FAIL | Corridor, aft, windshield, galley pass. Window shot: the right half is three plain cream plates (rivets only) and the top-left door recess is a black slab. Cockpit: the ceiling strip above the glazing is a dark undetailed band. Quarters: the ceiling is a dark void. |
| 4 | Post stack balanced | FAIL | ACES/bloom/AO/vignette/grain all on, no blown highlights anywhere now. Crushed blacks: galley backsplash between counter and cabinets is pure black (the LED strip is visible but lights nothing), window-shot door recess, cockpit and quarters ceilings. |
| 5 | Space view sells motion | FAIL | Rings, banding and drift all read (69% of sky pixels change in 2 s), but the atmosphere rim glow is only visible as a thin blue arc at the planet's bottom in the window shot; from the cockpit the limb is a hard edge. "Rim glow visible" is a maybe → fail. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal in all eight views. |
| 7 | Tech clean | PASS | No z-fighting, acne or missing faces; porthole plate/sleeve fight prevented. 107–165 calls, 207–340k tris, 20 lights. One texture issue: the bathroom shower recess plate shows horizontal streaks (UV stretch on a wide thin plate) — logged as a fix, not a fail, since it is one prop in a non-rubric view. fps unmeasurable under SwiftShader (see iteration 5). |
| 8 | Cold-look test | FAIL | The corridor is close: fog, pools, grate glow, decals, pipes. What still says "demo": the ceiling emitters are hard-edged flat white rectangles (no diffuser falloff), and the fixture housings are large dark boxes. I hesitated, so it fails. |
| 9 | Interactions | PASS | Bed / galley / bathroom prompts, fades, status text, rest-cycle lighting all captured. |

Fix list for iteration 7 (worst first):
1. Crushed blacks: galley backsplash gets a brushed steel splash plate + the LED strip becomes a real
   low-intensity light; cockpit ceiling gets an emissive rail + fill; quarters ceiling gets a fixture
   and panels that catch the lamp; corridor door recesses get a lit door sign / frame strip.
2. Detail density: window shot right cell gets a wall-mounted extinguisher, conduit drop and a vent
   grille; plates get stronger wear at that scale.
3. Planet atmosphere: wider, brighter Fresnel rim with scattering colour so the limb glows from any
   window.
4. Fixture emitters: gradient diffuser texture (bright centre, soft falloff) instead of flat white.
5. Bathroom shower plate UV stretch.

## Iteration 7 — painted structural steel, diffuser emitters, galley backsplash, planet limb

Changes: new `paintedMetal` material (worn-metal maps, metalness 0.15, roughness 1.15) for ribs,
header beam, overhead console, fixture housings and bezels — bare `metal` boxes in a dim room have no
diffuse term and were rendering as black slabs; `makeDiffuser` texture + `emitWarmSoft` /
`emitCoolSoft` (centre-bright pillow falloff) on every ceiling fixture, vanity light and vent; galley
backsplash → riveted teal paint with a utensil rail (ladle, tongs, cloth) and a 0.5-intensity
under-cabinet light (first pass at 1.8 put a hot spot on the cabinet door edge); cockpit overhead
console rear face: access plate, vent slots, stencil, teal edge strip, grab rail; quarters ceiling
fixture with teal rings + a warm uplight; port-wall utility cluster (three conduits, manifolds,
clamps, valve wheel, gauge plate, intercom, cable drop) forward of the corridor porthole; worn metal
streaks → anisotropic `vnoise2` (short 4 cm strokes, wear carried in roughness — the old continuous
streaks read as wood grain on the bathroom plate); gas giant zonal streaks sharpened; ocean world
darkened (land olive→ochre, ocean turquoise→deep blue), clouds thinned to ~35% cover (a cloud-white
disc filling the porthole was reading as a blown highlight); planet shader: Lambert roll-off across
the lit face, Fresnel 3.5 with the haze mix capped below white and a separate additive limb edge;
atmosphere shell 1.075 → 1.11 R with alpha fixed at 1 (additive blend was squaring the falloff into
a hairline). `tools/shots.mjs`: `SHOT_VIEWS` / `SHOT_QUICK=1` for partial re-checks.
Lights 20 → 22 (quarters uplight, galley under-cabinet).

Shots: `shots/iter_7/`. Drift: sky region meanAbsDiff 48.6, 70.8% pixels changed; interior control 0 / 0.

Pixel audit (luma < 8/255, 1280×720): cockpit 25.5%, corridor 17.5%, quarters 17.8%, window 28.6%.
No pixel above 250 in any of the four rubric shots.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | PASS | Corridor: warm ceiling pools with soft-edged diffusers, teal trench, cool porthole shaft. Cockpit: teal console glow, planet light, warm rear fixture. Quarters: lamp key + cool pillow disc + uplit ceiling. Galley: counter key, under-cabinet warm on the teal splash. |
| 2 | Materials physical | PASS | Painted steel reads as dark paint over metal (no more black boxes), pipes/rails reflect, panels chipped and smudged, fabric/rubber distinct. |
| 3 | Detail density | FAIL | Cockpit ceiling strip, quarters ceiling and galley backsplash now carry detail. Window shot: the rib's inner face (0.3 × 2.5 m of painted gunmetal, seen from 0.75 m) fills the left 16% of the frame as one featureless slab. |
| 4 | Post stack balanced | FAIL | No blown highlights in any view (0 px > 250). Crushed blacks are still there: the cockpit floor (deck plate is metalness 1 → no diffuse response, the rubber mat is 0.14 sRGB) and seat bases are pure black across the whole bottom row; the quarters floor mat is a black void bottom-left; the rib face in the window shot averages luma 12. |
| 5 | Space view sells motion | FAIL | Rings, bands, cloud-broken ocean world and drift (71% of sky pixels change in 2 s) all read. Rim glow: present on the gas giant in both cockpit and window shots, but only convincingly at 3× zoom — at 1× the limb still reads as a nearly hard edge. A maybe → fail. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / gunmetal in all eight views; the teal backsplash and blue ocean sit inside the palette. |
| 7 | Tech clean | PASS | No z-fighting, acne or missing faces in 8 views; 110–170 calls, 211–346k tris, 22 lights. Bathroom plate streaks fixed. fps unmeasurable under SwiftShader (see iteration 5). |
| 8 | Cold-look test | FAIL | The corridor shot is the best so far and I would not hesitate on it alone. But the four-shot set still has the black floors and the black rib slab, and the shots have to hold together. Fails until 3/4 pass. |
| 9 | Interactions | PASS | Bed / galley / bathroom prompts, fades, status text, rest-cycle lighting all captured. |

Fix list for iteration 8 (worst first):
1. Crushed blacks at the source: deck plate becomes worn *painted* plating (metalness map 0.35 base,
   knurl tops and rivets 0.7–0.85, bright scuffs 0.9) with a lighter base so floors respond to the
   ceiling lights; rubber albedo 0.14 → 0.21 sRGB; ribs in slate instead of gunmetal; vignette
   0.42 → 0.34 and pushed outward; AO tint lifted off pure black; a small cool shadow lift in the
   final grade (filmic toe) so the darkest pixels sit at ~(6, 8, 11) instead of 0.
2. Rib inner faces: vertical conduit with clamps, bolt rows and a stencil plate on every rib, so the
   window shot's left cell is a structure rather than a slab.
3. Planet limb: mild limb darkening on the disc, atmosphere shell 1.11 → 1.15 R, glow falloff
   2.2 → 2.0, shell strength ×0.9 → ×1.3 so the limb crosses the bloom threshold and reads at 1×.

## Iteration 8 — painted deck plating, rib inner faces, shadow lift, atmosphere halo

Changes: deck plate texture → worn *painted* plating: metalness map (0.35 paint/oxide base, 0.75 on
polished knurl tops, 0.85 rivets, 0.9 bright scuffs, 0.1 rubber drag marks, halved in seam grime),
base albedo 0.36 → 0.42 — the old metalness-1 floor had no diffuse term and rendered black wherever
no specular highlight fell; rubber albedo 0.14 → 0.21 sRGB (charcoal that shows grain, not a void);
ribs painted slate instead of gunmetal, with inner-face detail on every rib (clamped conduit drop,
elbow + junction cap, bolt rows along both edges, HV / O2 / hatch stencil, hazard kick block);
cockpit rear fixture light 5 → 6 and 0.15 m lower so it reaches the mat between the seats; post:
vignette 0.42 → 0.34 starting further out, AO intensity 3.0 → 2.6 with a blue-grey tint instead of
near-black, filmic shadow lift (+0.024/0.030/0.042 in display space, after the vignette) so the
darkest pixels settle on a cool (6, 8, 11) instead of 0; hover highlight 0.28 → 0.12 with a slow
pulse so the fabric keeps its shading under the tint. Atmosphere: the halo shell's `day` term used
the back-face normal, which points away from the camera — with the sun behind the viewer it read as
night around the whole limb and the halo ran at 18%. Diagnosed with a fixed-time pixel probe
(shell on / off / ×3): the shell *was* rendering 19 px wide but, once the day term was corrected,
as a near-white band the same colour as the disc, i.e. a bigger planet with a soft edge. Fix: day
from the screen-radial direction, cubic falloff (bright line at the limb fading across the halo),
peak ×0.9, saturated amber (`#ffae5c`) / blue (`#58b8ff`) halo colours distinct from the disc, disc
limb darkening 0.38, disc rim-haze mix 0.55 → 0.35. Lights unchanged at 22.

Shots: `shots/iter_8/`. Drift: sky region meanAbsDiff 44.5, 71.0% pixels changed; interior control 0 / 0.

Pixel audit (luma < 8/255, 1280×720): cockpit 25.5 → 5.2%, corridor 17.5 → 3.0%, quarters
17.8 → 5.6%, window 28.6 → 6.7% (the remainder is deep space through the glazing and rubber gaskets).
Mean luma cockpit 45.8 → 57.7, corridor 50.7 → 61.8, quarters 63.1 → 73.8, window 34.2 → 44.5.
Still no pixel above 250 in the four rubric shots. Limb profile (window shot, row through the
upper-left limb): 12 → 28 45 61 71 86 100 116 129 140 146 157 162 169 175 181 185 193 197 → disc,
i.e. a 19 px amber ramp where iteration 7 had a 5 px hard edge.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | PASS | Same key/fill/accent structure as iteration 7, and the floors now take the ceiling light (cockpit mat, quarters mat, corridor side plates read as lit surfaces). |
| 2 | Materials physical | PASS | Deck plating reads as chipped paint over steel with polished knurl tops and bright scuffs; ribs read as painted structural steel; pipes and rails reflect; fabric, rubber, painted panels distinct. |
| 3 | Detail density | PASS | Window shot's left cell is a rib with a conduit, clamps, junction cap, bolts, stencil and kick block. Cockpit ceiling, quarters ceiling and galley splash carry detail from iteration 7. Corridor, aft, windshield dense. Weakest remaining: the galley's left wall (rivets + one stencil) and the bathroom shower plate — both outside the four rubric views. |
| 4 | Post stack balanced | PASS | ACES, bloom, AO, vignette, grain all on. 0 px > 250 in the rubric shots. Near-black 3–7% and it is space and gaskets; the cockpit floor / seat bases are dark grey with visible mat grain and plate seams rather than a void. Window shot is the dimmest (mean 44.5) but its darks hold detail. |
| 5 | Space view sells motion | PASS | Amber halo around the gas giant visible at 1× in cockpit, window and windshield; blue limb on the ocean world in corridor and quarters portholes; rings, bands, cloud-broken continents; 71% of sky pixels change over 2 s while the interior is pixel-identical. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / slate-gunmetal in all eight views; halo amber and blue sit inside the palette. |
| 7 | Tech clean | PASS | No z-fighting, acne or missing faces in 8 views + 6 interaction shots; 110–170 calls, 224–364k tris, 22 lights, 49 programs. fps unmeasurable under SwiftShader (see iteration 5) — scored from budget + the adaptive scaler. |
| 8 | Cold-look test | PASS | Corridor: fog, warm pools with diffuser falloff, teal trench, cool porthole shaft on the planet, decals, rails, conduits, painted ribs — I would not hesitate. Cockpit, quarters and window each read as a game location rather than a primitive demo; the specific tells from iterations 5–7 (black floors, black slab, flat emitters, blown planet) are gone. |
| 9 | Interactions | PASS | Bed / galley / bathroom prompts, fades, status text, rest-cycle lighting all captured; hover tint now keeps the fabric shading. |

First all-pass iteration. Stopping rule needs a second consecutive all-pass, so iteration 9 runs
with conservative changes aimed at the weak points named above (nothing that can move a passing
item): galley left wall gets a wall-mounted prop cluster, bathroom shower recess gets a head, hose
and dispenser, and the window view keeps its camera so the fix is re-verified from the same angle.

## Iteration 9 — confirmation run (galley north wall)

Changes: galley north wall, between the canister rack and the counter: medkit cabinet (dark frame,
cream door, orange cross, steel latch, teal status LED, spec-plate stencil), status panel (painted
bezel, screen, LED readout, rubber buttons), towel rail on brackets with a folded teal cloth, and a
clamped supply line with an orange valve wheel along the top of the wall. The "bathroom shower plate"
from the iteration-8 notes turned out to be a `panelGrid` greeble cell on the south wall, not a
shower — there is no shower in the room — so nothing was added there. Everything else untouched.

Shots: `shots/iter_9/`. Drift: sky region meanAbsDiff 44.5, 71.0% pixels changed; interior control 0 / 0.

Pixel audit: the renderer is deterministic under the harness — cockpit, corridor, quarters, window,
windshield, bathroom and aft are pixel-identical to iteration 8 (mean abs diff 0.00); galley differs
(5.9) where the wall cluster landed. Same clipping numbers as iteration 8; galley near-black 3.9 → 4.8%
(the dark cabinet frame and bezel), 0 px > 250.

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | Lighting intentional | PASS | Unchanged from iteration 8 (identical frames). Galley: the cluster sits in the counter downlight's falloff and reads as lit from the right, consistent with the room's key. |
| 2 | Materials physical | PASS | Unchanged; the new medkit door / bezel / cloth / valve use the existing painted, painted-steel, fabric and metal families. |
| 3 | Detail density | PASS | Four rubric shots unchanged. Galley's left wall — the last plain surface I had named — now carries a cabinet, panel, rail and pipe run. |
| 4 | Post stack balanced | PASS | Identical frames; galley still 0 px > 250, darks hold detail. |
| 5 | Space view sells motion | PASS | Identical frames; 71% of sky pixels change over 2 s, interior 0. |
| 6 | Cohesive palette | PASS | Cream / orange / teal / slate-gunmetal; the cross and valve are palette orange, the cloth palette teal. |
| 7 | Tech clean | PASS | No z-fighting, acne or missing faces in 8 views + 6 interaction shots; 110–171 calls, 226–366k tris, 22 lights, 49 programs, 69 colliders. `vite build` clean. fps still unmeasurable under SwiftShader. |
| 8 | Cold-look test | PASS | Same corridor frame as iteration 8; no hesitation. |
| 9 | Interactions | PASS | Bed / galley / bathroom: hover, prompt, fade ("8 HOURS PASS" / "Refreshed."), status text and rest-cycle lighting (rest level 0.82 at capture) all recorded again. |

Second consecutive all-pass → stopping condition met at iteration 9.

---

## Final summary

### What passed (iterations 8 and 9, all nine items)

- **Lighting**: every room has a key (corridor ceiling pools, cockpit console glow + cool planet
  light, quarters reading lamp + cool pillow disc, galley counter downlight, bathroom vanity bar), a
  coloured fill (teal trench / kick strips / under-bunk) and accents (LED strips, screens, hazard
  lamps). Warm inside, cool through every window. Emissives are diffusers with falloff, not flat
  quads.
- **Materials**: five PBR families from procedural maps — painted panels (three wear variants,
  primer chips, smudges, rivets, bevels), worn/brushed metal (anisotropic short strokes, wear in
  roughness), painted structural steel, painted deck plating with a metalness map (knurl tops, rivets
  and scuffs worn through to steel), rubber, fabric, hazard; PMREM environment captured from the
  finished interior so pipes, rails and the porthole ring reflect the real corridor.
- **Detail density**: panel grids with greebles, vents, screens, strips and conduits on every wall,
  ceiling and chamfer; ribs with conduits, bolt rows and stencils; handrails with brackets; utility
  clusters; trench pipes and cable trays under the grate; props in every room.
- **Post**: ACES, bloom (0.3 / 0.38 / threshold 1.15), N8AO (medium, half-res, blue-grey tint),
  SMAA, vignette 0.34, grain 0.045, exp fog, filmic shadow lift. 0 px > 250 in the rubric shots;
  near-black 3–7% and it is deep space and rubber gaskets.
- **Space**: three star layers with parallax + a galactic band, ringed gas giant and cloud-broken
  ocean world with a proper atmosphere halo (screen-radial day term, cubic falloff, limb-darkened
  disc), two moons, four nebula billboards, dust streaks. Measured: 71% of sky pixels change in 2 s
  while the interior is pixel-identical; the planet crosses a porthole in ~60–90 s.
- **Palette**: off-white hull, orange accents, teal practicals, slate/gunmetal structure — no
  default greys anywhere.
- **Tech**: deterministic renders, no z-fighting / acne / missing faces, 110–171 draw calls, up to
  366k triangles, 22 lights, adaptive quality scaler (pixel ratio + AO quality) instead of content
  removal.
- **Interactions**: pointer lock, raycast hover tint + prompt, bed (fade, "8 hours pass", rest-cycle
  lighting and back), galley ("You eat. Energy restored."), bathroom (fade, "Refreshed."), one-line
  HUD status.

### What is still weak

- **Frame rate is unverified on real hardware.** Every measurement here came from SwiftShader
  (~2 s/frame), so rubric 7's 60 fps clause was scored from budget (draw calls, triangles, 22
  forward-lit lights, half-res AO) plus the adaptive scaler. 22 point/spot lights in a forward
  renderer is the single most likely reason a mid-range laptop GPU would drop below 60 at 1080p; the
  scaler would then step the pixel ratio down to 0.66.
- **The window shot is the dimmest** (mean luma 44.5): the porthole wall sits between two ceiling
  pools and the rib face beside it is painted slate — legible, but the frame is moodier than the other
  three.
- **The cockpit foreground floor** is dark grey, not black: readable mat grain and plate seams, but
  the bottom fifth of that shot carries little light.
- **Planet texture fidelity**: the gas giant bands and ocean-world continents are FBM/value-noise
  at 1024×512; up close in the corridor porthole the ocean world is soft.
- **Single environment probe** at the corridor centre: metals in the cockpit and rooms reflect the
  corridor rather than their own room.
- **Hover highlight** is an emissive tint (0.12, pulsing); an outline or rim effect would read as
  more "game".

### With five more iterations

1. Real-GPU profiling pass: capture frame times on an actual laptop GPU, then trim the light list
   (merge the four corridor points into two, drop the galley under-cabinet point in favour of the
   emissive alone) and move the exterior window spots to baked emissive "light shafts" if needed.
2. Per-room environment probes (cockpit, quarters, galley) blended by position so the cockpit's
   metals reflect the windshield and planet.
3. Higher-frequency planet detail: a second detail-noise octave in the planet shader (world-space,
   so it never softens), swirling storm cells on the gas giant, specular ocean glint on the ocean
   world.
4. Screen-space outline for hovered interactables (depth/normal edge pass) plus a small
   world-space prompt tag on the object instead of only the HUD line.
5. Window-shot lighting: a small warm practical over the porthole (a reading lamp on the bezel) so
   the darkest rubric view lifts to the others' exposure without adding a global fill; cockpit mat
   gets an under-console teal strip on its aft edge for the foreground floor.

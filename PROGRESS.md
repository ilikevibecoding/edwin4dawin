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

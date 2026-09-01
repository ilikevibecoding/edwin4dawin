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

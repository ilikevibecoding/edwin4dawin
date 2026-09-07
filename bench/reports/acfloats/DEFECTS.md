# acfloats — Float rig gauntlet: defect log

Branch `cursor/acfloats-loop-8213`, worktree `/home/ubuntu/wt-acfloats`, preview port **4620** (one vite preview
serving the `/tmp/acfloats-dist` symlink; a round's build goes to `/tmp/acfloats-dist-rN` and the symlink is
swapped by the shot spec's `.pre` hook, so before / after rounds are shot from one server and one Chrome slot).
Captures: `tools/views.py <port> <outdir> [views] [w h]` writes the shot spec (rear / front three-quarter, the
reference `aerial-a`, plus five fixed dev close-ups in the body frame: `riglow` water-level three-quarter off the
starboard bow, `bowon` straight ahead at 1 m, `belowaft` from below-behind in flight, `deck` along the port deck,
`gear` parked on runway 09 with the wheels down); `tools/session.mjs` shoots a queue of specs from one Chrome
instance and writes `<png>.log.json` (draw calls, triangles, console lines) beside every still.

Owned files: `src/plane/parts/floats.ts`, `src/plane/geometry/floats.ts`, `src/plane/textures/floats.ts`.
Untouched by design: `physics.ts` (rest datum `FLOAT_REST_Y = 1.96`, keel / chine station heights), effects.
Self-scores on rubric v2 categories 1 (silhouette read at distance), 2 (aircraft geometry), 7 (aircraft materials),
floats only.

## R0 — baseline observation (user's rear / front quarter stills against the reference crop)

What gives the rig away as a game asset, ranked by what it costs:
1. Hull volume: the floats are slim tubes with 0.19 m of deck over the chine; at rest most of the hull is under
   the water and the read from 30 m is two silver pipes. The reference hull is a deep box (EDO 4930: ~0.66 m deep,
   0.88 m beam, hard chine, near-vertical topsides, flat crowned deck) with 60 % of it standing above the water.
2. Finish: polished-silver hull with a mirror-like reflection of the water (uniform metalness); the reference is a
   dark, matte, weathered olive / black float with a paler boot-top and an anti-slip deck.
3. Struts: 5 cm elliptical tubes, white, vanishing against the water from 30 m; no root fairings, no diagonal,
   no cross wires between the floats; the wing lift struts rose from the float decks (wrong: nothing carries wing
   loads through the floats on a production floatplane).
4. No boarding ladder / step between the inboard deck and the door sill (the reference has one).
5. Amphibious wheels: a bare torus and a puck on a stick, no hub, no linkage, no boot where the leg leaves the keel.
6. Distant read (`aerial-a`, ~100 m from behind / above): the floats nearly vanish; the reference reads two heavy
   dark blocks under the fuselage.

Baseline self-scores (floats only): 1 silhouette 5, 2 geometry 4, 7 materials 4.

## R1 — hull volume (tube → EDO section), `geometry/floats.ts`, `parts/floats.ts` stations

- Wrong: 0.19 m deck crown, round section (n 3), 0.34 m half beam, tube-like bow and stern, the step a
  degenerate ring (two stations at one x joined by zero-length quads with smeared normals), no transom.
- Changed: stations `top` 0.19 → 0.32–0.345 midships, `n` 4.4–5.0 (flat deck, near-vertical sides, a ~10 cm
  rolled deck edge), `w` 0.34 → 0.44, bluff two-station bow (stem face + nose rounding over) with a capsule
  D-bumper down the stem, a 0.15 m half-beam flat transom; `floatHull` re-samples the upper half by arc length +
  turning so the rolled edge gets its own vertices instead of two 45° facets, fixes texture v per feature (deck
  0–0.12, side 0.12–0.22, chine 0.22, keel 0.5, port mirrored), emits the split station as a closed vertical step
  face with its own vertices, and caps stem / transom with their own ring copies (hard edges); new `bottomHeight`
  helper for the gear boots. Keel heights, chine heights (`yc`) and the x extents (2.95 / −2.75) are unchanged.
- Why: freeboard is the single biggest read at every distance (the reference hull is mostly above the water);
  the hard chine / rolled deck edge / flat transom are what say "EDO float" rather than "pontoon".
- Offline sanity (`bench/out/acfloats-geo/entry.ts` bundled with esbuild, run in node): no NaN in position /
  normal, 902 triangles / 632 vertices per hull (14 deck + 5 bottom segments, 11 stations), bbox x −2.75..2.95,
  y −2.27..−1.58, z ±0.44; the 82 step-face triangles all face aft, the transom cap faces aft; deck crown −1.605
  at x 0.8 (chine −1.95: 0.345 m of freeboard over the chine, the rest waterline 1–6 cm under the chine).
- Result: see the R3 stills (R1–R3 were built separately and shot in one session).

## R2 — struts, spreader bars, wires, ladder, gear, `geometry/floats.ts` `airfoilStrutGeometry`, `parts/floats.ts`

- Wrong: thin white tubes; strut ends sat on the fuselage's nominal half-width, not on the skin (bare ends in
  the air on the concave belly); no diagonal, no cross wires, no turnbuckles; wing struts from the floats;
  no ladder; torus-and-puck wheels.
- Changed: `airfoilStrutGeometry` (NACA 00xx section lofted along the strut axis, chord in the airflow plane,
  concave-fillet root fairings at either end, hard TE, capped); front and rear main struts 12 × 4.5 cm per side
  from forged deck blocks (bolted, the spreader-bar ends inside them) to doubler plates + clevis blocks turned to
  the real lower-skin normal (`bellySkin` bisection on the fuselage sections); a 9 × 3.4 cm diagonal from the
  front belly fitting down and aft to the rear deck block (N-truss per side); 22 × 7.5 cm airfoil box spreader bars;
  X wires between the belly fittings and the opposite deck blocks plus horizontal X wires between the bars, each
  with a turnbuckle (barrel + fork ends); the wing lift strut moved to the lower longeron with a jury-strut pair;
  boarding ladder (two 17 mm rails on deck plates, two ribbed treads, the door step is the third, a grab hoop on
  the front strut); amphibious gear rebuilt: fat tyres with tread band, rim dish, hub cap with six lug nuts, brake
  drum, twin trailing arms on a pivot inside the hull, cross tube, hydraulic retract jack, nose forks, and rubber
  keel boots where every leg leaves the hull.
- Why: heavy dark faired struts and the X wires are what the reference reads at 30–100 m; every strut end now
  lands in a fitting (no bare cap pierces a skin); the ladder is the one human-scale cue on the rig.
- Result: see the R3 stills.

## R3 — finish (polished silver → dark weathered EDO float), `textures/floats.ts`

- Wrong: uniform light-grey / silver paint with chrome-like reflections, no deck / side / bottom distinction.
- Changed: dark olive-grey topsides (#3a3e3a) sun-chalked toward the deck edge, near-black antifouling bottom
  scuffed grey along the keel, pale grey boot-top (8 cm over the chine, wrapping under it) with an algae / scum
  gradient heavier aft, dark-grey anti-slip walkway (26 k grit grains in albedo + height) with a yellow edge stripe
  and yellow step bands at the strut stations, frames every 0.5 m with rivet rows (light heads over dark seams),
  four inspection plates per side, the step doubler, dock rash at the deck edge and bow, bare-metal chips at the
  stem / bow corners / step edge, rust weeps under the deck-edge fittings. Roughness 0.62 topsides / 0.72 bottom /
  0.55 boot-top / 0.86 walkway with panel variation; metalness 0 except the chips; clearcoat only a faint old-enamel
  sheen on the topsides and boot-top. The wet band below the waterline stays live (floatPaint's wet-line shader).
- Why: the reference float is a dark matte block with one pale line (boot-top) and one lighter plane (deck); that
  value structure is what survives to 100 m, while the rivets / plates / grit only need to read at 3 m.
- Result: see below.

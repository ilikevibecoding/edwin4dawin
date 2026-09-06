# acgeo — Aircraft geometry + materials gauntlet: defect log

Branch `cursor/acgeo-loop-8213`, worktree `/home/ubuntu/wt-acgeo`. Preview ports: **4543 working, 4544 baseline**
(the assigned 4541 was already bound by another builder's `clouds4-var-4541` session when this loop started).
Captures: `bench/reports/acgeo/tools/views.py <port> <outdir>` writes the shot spec (3 canonical aircraft views +
dev close-ups posed in the body frame: nose, wingtip, tail, rig, door, chase30, below, tailon, noseon);
`tools/acshots.mjs` shoots it from one Chrome instance and dumps the PlaneModel triangle / mesh table.

Scores are self-scores on rubric v2 categories 1 (silhouette), 2 (geometry), 3 (nose/cowling), 5 (wings/control
surfaces), 7 (materials). Baseline medians from the critics: 7 / 5 / 4 / 5 / 5.

## R0 — baseline observation (critic reports iter10 visual-1, h03 visual-2; own r0 stills)

Strongest giveaways, ranked by what they cost at 20–200 m:
1. Nose: the loft closes to a 30 cm flat-capped point behind the spinner — a black cylinder with a chrome cone,
   no inlet, no engine, no exhaust (front quarter B4–C5).
2. Wing and stabiliser read as planks: 11 % / 12 % sections on a 1.95 m chord with a 14 mm trailing edge at the
   root, no visible leading-edge radius from the chase camera.
3. Control surfaces: flap / aileron / elevator / rudder notches are there but the hinge faces are flat plank ends
   with no rolled nose and no dark slot; no trim tabs, no hinge fairings.
4. Materials: every painted surface has the same clear-coat sheen; the cowl is uniform charcoal; no metalness
   anywhere on the fuselage; wear only as faint roughness dots.
5. No door seam in the geometry (a painted outline only), no door handle in 3D, no static wicks, no water-rudder
   cables, no float hatches, cleats are boxes.

## R1 — wing and stabiliser section (plank → airfoil)

- Wrong: 11 % wing / 12 % stabiliser, 14 mm root TE (`te` default 0.0035 × chord); plank silhouette from every
  chase view; tip light patches placed on the chord line (would sink into a thicker wing).
- Changed: `parts/wing.ts` wingSpec thickness 0.11 → 0.15, camber 0.02 → 0.025, te 0.002 (8 mm root TE), chord
  grid 16 → 18 points; `parts/tail.ts` stabiliser 0.12 → 0.13, TE 4 → 3 mm/m; `parts/lights.ts` tip patches on
  the actual upper / lower skin (`wingUpperY` / `wingLowerY`).
- Why: a bush-plane wing carries a 16 % section (DHC-2: NACA 64A416 root); the depth is what the eye reads at
  30 m — the leading edge catches a highlight band and the underside has a real shadow.
- Result / score: see R2 stills (R1 and R2 were shot in one build).

## R2 — radial-engine cowl (black flat-cylinder with a chrome cone → nose bowl, inlet, engine, scoops, flaps, exhaust)

- Wrong: flat-capped loft nose; painted-on louvres; a white box for the intake; two loose stubs for the exhaust.
- Changed (`parts/fuselage.ts`, `geometry/loft.ts` `revolveGeometry`, `geometry/util.ts` `flatUv`,
  `textures/fuselage.ts`, `parts/materials.ts`, `textures/common.ts` SURF):
  - loft stations re-cut: the nose is a near-cylinder r 0.71 rounding forward into a bowl that stops at x 4.50,
    r 0.55, open; a revolved lip rolls into an annular inlet of r 0.4225 around the hub barrel (r 0.29);
  - behind the inlet, one revolved profile gives the nose case, the baffle plate and the duct interior; nine
    cylinders with rocker boxes and pushrod tubes and the ignition harness ring sit in front of the baffle (R-985
    layout, #1 upright), their outer ends hidden by the lip as on the real cowl;
  - carburettor scoop under the bowl and oil-cooler scoop on the anti-glare panel as lofted hoods with dark mouths;
  - two cowl flaps at the cowl's trailing edge, hinged forward, trailing edges lifted 45 mm over dark openings;
  - exhaust: one tailpipe leaving the lower starboard cowl ahead of the firewall seam, elbow, flared mouth with a
    soot-black bore near the smoke hardpoint, stainless heat shield 3 cm off the skin;
  - texture: bare polished-aluminium bowl (metalness 1, roughness 0.30 with brush streaks, no clear coat) through a
    packed clear-coat / roughness / metalness map on the paint material; Dzus fastener ring at the bowl joint and
    fastener rows along the upper / lower cowl panel joints on both sides.
- Why: every element is on a real R-985 Beaver cowl; the open inlet with the engine visible inside is what makes a
  radial nose read as an engine instead of a cap.
- Result / score: pending stills.

## R3 — one sheen everywhere (the protocol's hard failure) → finish varies per material and per region

- Wrong: the paint material had a single clear-coat roughness, one base roughness and metalness 0 over the whole
  body and wing; the wear was a handful of roughness dots. Every surface caught the sun the same way.
- Changed (`textures/fuselage.ts`, `textures/wing.ts`, `textures/common.ts` `chips`, `parts/materials.ts`):
  - clear-coat roughness by region: roof and tail-cone top chalked by the sun (0.30) fading down the shoulder, waxed
    white sides (0.11), yellow belly band chalked and spray-dulled (0.22); wing: chalked upper skins, waxed
    undersides, its own tail values; every skin panel then differs by up to ±0.055 (repainted / polished at different
    times) and the rivet seams and worn zones are duller;
  - base roughness: panel-by-panel variation, rougher seams, spray-dulled belly, scratches, grime;
  - chipped paint down to bare metal (metalness 1, no clear coat through the packed map) at the bowl joint, the
    boarding steps and door sills, the door handle, the cowl fastener rows, the wing and tail leading edges;
  - the bare bowl is metal (R2), the anti-glare panel a flat lacquer at a third of the coat's gloss.
- Why: a real airframe is many finishes — waxed sides next to a chalked roof, bare metal where hands and stones
  hit it — and the eye reads the differences in highlight shape as "painted aluminium" long before it reads rivets.
- Result / score: pending stills.

## R4 — control surfaces hang on nothing; no wicks, no antennas, a bare pitot line

- Wrong: flap / aileron / elevator / rudder gaps with no hinge hardware, no trim tabs, nothing trailing from the
  tips; the pitot was a lone tube.
- Changed (`parts/wing.ts`, `parts/tail.ts`, `geometry/wing.ts` `withPaint`): external plate hinge brackets under
  the trailing edge (three per flap, two per aileron: the DHC-2's slotted flaps and drooping ailerons hang below the
  wing), hinge fittings bridging the elevator and rudder gaps, elevator trim tabs (hinge lines painted in the tail
  band) with horn and pushrod actuators, static wicks on the wing, stabiliser and fin tips, a pitot mast under the
  port wing, the ADF sense-antenna mast and wire to the fin, a VHF blade and GPS puck on the roof.
- Why: these are the small silhouette breaks a chase camera sees against the sky — the brackets under the flaps
  and the wire to the fin especially.
- Result / score: pending stills.

## R5 — a painted door outline, no handle, no filler caps

- Wrong: the door was an outline stroke in the albedo; nothing to grab; no fuel filler anywhere.
- Changed (`parts/fuselage.ts` `buildFittings`, `textures/fuselage.ts`): the seam is a groove with the door skin's
  edge standing a hair proud (height map) plus the dark slot in the albedo, running from the door's bottom line up
  both window pillars to a header over the window; exterior paddle handle in its recess plate, two external hinges
  on the front edge; three belly-tank filler caps in dark rings on the port lower body (a DHC-2 fuels from the left
  side into fuselage belly tanks), each turned to the skin's normal.
- Result / score: pending stills.

## R6 — float rig: box cleats, no hatches, a slab water rudder, no cables, no cross wires

- Wrong: cleats were 14 cm boxes, no deck hatches, the water rudder a 20×30 cm box on a post, no steering cables,
  the only wires the horizontal X between the spreader bars, no spray rails.
- Changed (`parts/floats.ts`, `geometry/floats.ts` `deckHeight` / `chineAt` / `sprayRailGeometry`):
  - spray rails along both forebody chines from the bow to the step (a 4 cm strip drooping 12 mm);
  - horn cleats (base, stem, bar with upturned tapered tips) at bow and stern and two on each outboard deck edge,
    each leaning with the deck's crown; six flush pump-out covers per float (rubber seal ring, cap, slot) along
    the inboard edge of the walkway, one per watertight compartment;
  - water rudders rebuilt: two transom brackets, a vertical hinge post, a balanced blade (extruded outline) below
    the keel line, a steering cross-horn above the deck; steering cables from both horn ends forward along the deck
    to fairleads by the rear strut, the inboard one continuing up alongside the rear main strut to the belly;
  - transverse cross wires at both strut stations from each belly pad to the opposite float's spreader-bar saddle
    (the X between the floats seen from ahead and astern), with turnbuckles.
- Why: every item is on an EDO 4580 installation; the cables and the X wires are what the rig view (astern, low)
  reads first. Floats and wheels themselves untouched (protected).
- Result / score: pending stills.

## R7 — wing struts rising from the float decks; windows cut straight into the paint

- Wrong: two struts per side ran from the outboard float deck edge up to the wing: nothing on a production
  floatplane carries wing loads through the floats; the floats hang on their own struts. Window cut-outs had no
  glazing rubber — bare paint edges against the glass.
- Changed (`parts/floats.ts`, `textures/fuselage.ts`, `textures/common.ts` layout `windows`): one 15 × 5.5 cm faired
  lift strut per side from a hinge block on the lower longeron just behind the door's aft post (x 0.88) to a cuff
  under the wing's front spar at 40 % span, with end collars and a jury-strut pair from 62 % of its length up to
  the wing at 10 % and 63 % chord; black rubber glazing seals ~3 cm wide around the three side windows (albedo,
  matte and uncoated in the packed map, a soft lip in the height map).
- Result / score: pending stills.

## R8 — bare nav-light spheres off the tips; one door per side; seams that vanish at 30 m

- Wrong: the position and strobe lenses were bare spheres floating 2.5 cm outboard of the tip skin; the fin beacon
  sat straight on the fin's tip cap; only the pilot's door existed on each side (a DHC-2 has a large rear cabin door
  behind it, carrying the second window); the station seams were a single 5 mm dark line that averages away at 30 m
  so the critics saw rivets only in close-up; the lift-strut root fitting overlapped the rear door's front corner.
- Changed (`parts/lights.ts`, `parts/fuselage.ts`, `parts/floats.ts`, `textures/fuselage.ts`, `textures/common.ts`
  `DOORS` / `panels`): polished teardrop nav-light housings straddling the tip edge with the position lens at the nose
  and the strobe at the tail, a base under the beacon; rear cabin doors on both sides (seam groove + ridge, recess
  plate, paddle handle by the front edge, two hinges at the rear edge, a second boarding step; the wear and chip
  passes follow both doors); each station seam is now a lap joint — a 4-texel step in the height map so one side is
  lit and the other shadowed, a hairline highlight next to the dark line in the albedo — with rivet rows 40 %
  firmer; strut root moved under the doors' bottom line.
- Result / score: pending stills.

## R9 — no rudder trim tab, a windshield with no frame, a cowl side with no louvres

- Wrong: the rudder had a hinge line and fittings but no tab (the elevators got theirs in R4); the windshield's
  edges met the paint with no frame or seal; the cowl side panels were plain sheet between the fastener rows.
- Changed (`parts/tail.ts`, `textures/fuselage.ts`, `textures/common.ts` layout `windshield`): the rudder trim tab is
  its own airfoil segment (13 cm chord over 40 cm of the rudder's height, a 6 mm slot at its hinge, skins 12 %
  proud, bent 3 degrees to port — the way a Beaver's fixed tab is set against the R-985's slipstream; the tail band
  shares its rows with the stabiliser tips so it could not be painted like the elevator tabs); a dark windshield
  frame along the base line on each side, up the aft edge over the roof line and up the front edge to the cowl;
  a bank of 3 × 4 pressed cooling louvres on each aft cowl side panel (dark opening under a proud lip).
- Result / score: pending stills.

## R10 — a float conversion without its ventral fin

- Wrong: the tail cone ended in a bare stern post; a Beaver on floats carries a ventral fin for yaw stability, and
  it is one of the shapes that identifies the float version at 100 m.
- Changed (`parts/tail.ts`): a 1.05 × 0.33 m swept ventral fin (10 % section, near-vertical trailing edge, rounded
  tip) hung from the keel line, tilted to follow the keel's 0.2 m/m rise toward the stern post, root buried 3 cm
  inside the rounded bottom; tail-band paint.
- Result / score: pending stills.

## R11 — first round driven by stills (R0 + R8 + R9 sets, 26 frames)

Observed in the R8/R9 stills (`front`, `nose` 4 m, `wingtip`, `tail` 6 m, `door` 3 m, `rig`, `chase30`, `below`,
`tailon`, `noseon`), ranked:
1. The bare-aluminium nose bowl read as a chrome drum from the bow at 4 m and as a bright ring head-on at 20 m —
   the whole bowl was metal, when on a Beaver only the rolled inlet lip is ever left polished.
2. A dark zipper ran along the whole yellow leading-edge stripe at 12 m: a skin joint (with its rivet rows) sat
   exactly on the leading edge (u 0.5) and 260 dark-rimmed chips lined the edge.
3. From below and from behind the tips, a dark red / green blotch sat on each wingtip: the lit skin patches (emissive
   only after dusk) are opaque tinted geometry and showed their base tint by day.
4. From the rear quarter the fin's full-chord tip cap read as a lid over the rudder with a dark slot under it.
- Changed (`textures/fuselage.ts`, `textures/wing.ts`, `textures/common.ts`, `parts/lights.ts`, `parts/tail.ts`,
  `geometry/wing.ts` `roundAbout`): bowl painted in the livery (the cheat line runs to the lip), the front 6 cm lip
  ring polished with a lap edge behind it; wing skin joints at 0.12 / 0.30 / 0.42 / 0.58 / 0.70 / 0.88 (16 % chord
  behind the edge on both faces), LE chips 260 → 90 and smaller; patches discard their fragments while their channel
  is unpowered; the fin's tip is the fixed part only and the rudder runs to the top, both rounding toward the hinge
  line so the slot runs to the top of one continuous rounded tail.
- Result: R11 stills (`r11k` set) — see REPORT.md.

## R12 — chip clusters as dirt splatter; black-box scoop mouths; a ball on the stern post

- Wrong (door view 3 m, nose view 4 m, tail view 6 m): the bare-metal chips around the door handles, steps and the
  bowl joint were dense dark-rimmed flakes that read as dirt splatter, not as chipped paint; the scoop mouths were
  rectangular dark plates (a black box bolted under the bowl); the tail light was an 8 cm white sphere on the stern.
- Changed (`textures/common.ts` `chips`, `textures/fuselage.ts`, `parts/fuselage.ts`, `parts/lights.ts`): flake rims
  at a third of their alpha, counts halved or better (step 40 → 16, sill 30 → 12, handle 14 → 6, bowl joint 140 →
  70, cowl joints 40 → 18); mouth plates follow the hoods' superellipse section a lip's width inside them and the chin
  scoop is 25 % smaller; a small teardrop housing with a 5 cm lens for the tail light.
- Result: R12 stills — see REPORT.md.

## Capture notes

Ports 4561 / 4562 chosen for the R10 / R11 previews were taken by other builders' servers between the free-port check
and `vite preview` binding, so the first R10 and R11 sets shot other builds and were discarded; later previews go
through a helper that verifies the served bundle name before shooting.
